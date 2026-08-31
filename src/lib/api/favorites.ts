/**
 * Favorites API calls (`/api/v1/favorites`).
 */

import { apiFetch } from "./client";
import type { FavoriteItem } from "./types";

/**
 * List the current tenant's favorited properties.
 */
export async function listFavorites(
  signal?: AbortSignal,
): Promise<FavoriteItem[]> {
  const data = await apiFetch<FavoriteItem[]>("/favorites", { signal });
  return data ?? [];
}

/**
 * Save a property to favorites.
 */
export async function addFavorite(
  propertyId: string,
  signal?: AbortSignal,
): Promise<{ id: string; propertyId: string; createdAt: string }> {
  return apiFetch<{ id: string; propertyId: string; createdAt: string }>(
    `/favorites/${propertyId}`,
    {
      method: "POST",
      signal,
    },
  );
}

/**
 * Remove a property from favorites.
 */
export async function removeFavorite(
  propertyId: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiFetch<unknown>(`/favorites/${propertyId}`, {
    method: "DELETE",
    signal,
  });
}
