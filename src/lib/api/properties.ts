/**
 * Property and unit calls (`/api/v1/properties`).
 *
 * Two facts shape everything here:
 *
 *  1. `GET /properties` is **role-sensitive on the server**. A landlord gets
 *     their own catalogue at every status; anyone else gets only `ACTIVE`. There
 *     is no `landlordId` or `status` query param — the same call means different
 *     things depending on who holds the token.
 *  2. The list card omits unit counts and `updatedAt`, so a screen needing those
 *     fetches units per row (see `listUnitsForProperties`).
 */

import { apiFetch, apiFetchPaged, type ApiPagination } from "./client";
import type {
  PropertyCard,
  PropertyDetail,
  PropertyWriteInput,
  Unit,
  UnitCreateInput,
  UnitUpdateInput,
} from "./types";

export type PropertyListParams = {
  county?: string;
  town?: string;
  estate?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Matched as text against `unitType`, so `2` finds "2 Bedroom". */
  bedrooms?: number | string;
  page?: number;
  /** Defaults to 20 server-side, capped at 100. */
  limit?: number;
};

export async function listProperties(
  params: PropertyListParams = {},
  signal?: AbortSignal,
): Promise<{ items: PropertyCard[]; pagination?: ApiPagination }> {
  const { data, pagination } = await apiFetchPaged<PropertyCard[]>("/properties", {
    query: params,
    signal,
  });
  return { items: data ?? [], pagination };
}

export function getProperty(id: string, signal?: AbortSignal): Promise<PropertyDetail> {
  return apiFetch<PropertyDetail>(`/properties/${id}`, { signal });
}

/** Always lands as `DRAFT`; status is moved later with `updateProperty`. */
export function createProperty(input: PropertyWriteInput): Promise<PropertyDetail> {
  return apiFetch<PropertyDetail>("/properties", { method: "POST", body: input });
}

export function updateProperty(id: string, input: PropertyWriteInput): Promise<PropertyDetail> {
  return apiFetch<PropertyDetail>(`/properties/${id}`, { method: "PATCH", body: input });
}

/** Soft delete -> `ARCHIVED`, which is terminal and cannot be undone. */
export function archiveProperty(id: string): Promise<unknown> {
  return apiFetch(`/properties/${id}`, { method: "DELETE" });
}

/**
 * Replace a property's image set with uploaded files.
 *
 * **Files travel alone, and this is not a style choice.** The backend runs the
 * multipart body through the same validator as JSON, and that validator does no
 * string coercion: `latitude` must be `typeof "number"` and `images` must be a
 * real array. Multer hands every text field over as a string, so a request that
 * carried both files and coordinates would come back
 * `400 latitude must be a number`. Scalars therefore go as JSON via
 * `createProperty`/`updateProperty`, and files go here on their own.
 *
 * An upload **replaces the whole set** rather than appending, and the displaced
 * files are deleted server-side. Up to 12, JPEG/PNG.
 */
export function uploadPropertyImages(id: string, images: File[]): Promise<PropertyDetail> {
  const form = new FormData();
  for (const file of images) form.append("images", file);

  return apiFetch<PropertyDetail>(`/properties/${id}`, { method: "PATCH", body: form });
}

// ------------------------------------------------------------------- units

export async function listUnits(propertyId: string, signal?: AbortSignal): Promise<Unit[]> {
  const data = await apiFetch<Unit[]>(`/properties/${propertyId}/units`, { signal });
  return data ?? [];
}

export function createUnit(propertyId: string, input: UnitCreateInput): Promise<Unit> {
  return apiFetch<Unit>(`/properties/${propertyId}/units`, { method: "POST", body: input });
}

export function updateUnit(
  propertyId: string,
  unitId: string,
  input: UnitUpdateInput,
): Promise<Unit> {
  return apiFetch<Unit>(`/properties/${propertyId}/units/${unitId}`, {
    method: "PATCH",
    body: input,
  });
}

/** Hard delete — a unit type that shouldn't exist was a listing mistake. */
export function deleteUnit(propertyId: string, unitId: string): Promise<unknown> {
  return apiFetch(`/properties/${propertyId}/units/${unitId}`, { method: "DELETE" });
}

/**
 * Fill in the unit counts the list card omits, for the **visible page only**.
 *
 * This is N+1 by construction: one request per row. It is acceptable because a
 * landlord's page is ~10-20 rows and the alternative is showing nothing.
 *
 * CEILING: this stops being reasonable past ~100 properties. The real fix is a
 * backend change — either unit counts on `toListingCard` or a
 * `GET /landlords/me/stats` aggregate — not a bigger fan-out here.
 *
 * A row whose units fail to load resolves to `[]` rather than failing the whole
 * page, so one bad id cannot blank the table.
 */
export async function listUnitsForProperties(
  propertyIds: string[],
  signal?: AbortSignal,
): Promise<Record<string, Unit[]>> {
  const results = await Promise.all(
    propertyIds.map(async (id) => {
      try {
        return [id, await listUnits(id, signal)] as const;
      } catch {
        return [id, [] as Unit[]] as const;
      }
    }),
  );
  return Object.fromEntries(results);
}
