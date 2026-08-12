/**
 * The landlord's whole catalogue, plus the unit counts the list endpoint omits.
 *
 * `GET /properties` returns a landlord their own properties at every status, but
 * `toListingCard` (backend `src/routes/properties.js`) strips units down to a
 * single `unitsFrom` price — no counts, no vacancy. Every landlord screen needs
 * those counts, so this fetches units per property and joins them here.
 *
 * ## The ceiling, stated plainly
 *
 * This is two round trips deep and N+1 by construction: one list call, then one
 * units call per property. It is the right trade at the size this product is at —
 * a landlord's portfolio is a handful of buildings, and the alternative is showing
 * unit columns as blank. It stops being reasonable past ~100 properties, which is
 * also where the backend's own `limit` cap truncates the list.
 *
 * `truncated` is true when that happens, so a screen can say so rather than
 * quietly under-reporting a total. The fix is a backend change — unit counts on
 * the list card, or a `GET /landlords/me/stats` aggregate — not a wider fan-out
 * from the browser.
 */

import { useMemo } from "react";

import type { PropertyCard, PropertyStatus, Unit } from "@/lib/api/types";
import { listProperties, listUnitsForProperties } from "@/lib/api/properties";
import { useAsync } from "@/lib/hooks/use-async";

/** The backend's own cap on `limit`; asking for more is silently clamped. */
const MAX_PAGE = 100;

export type PortfolioProperty = PropertyCard & {
  units: Unit[];
  totalUnits: number;
  availableUnits: number;
};

export type PortfolioTotals = {
  properties: number;
  active: number;
  drafts: number;
  totalUnits: number;
  vacantUnits: number;
  /** Counts by status, including zeroes — the chart needs every key present. */
  byStatus: Record<PropertyStatus, number>;
};

export type Portfolio = {
  properties: PortfolioProperty[];
  totals: PortfolioTotals;
  /** True when the landlord has more properties than one page can carry. */
  truncated: boolean;
  serverTotal: number;
};

const EMPTY_STATUS_COUNTS: Record<PropertyStatus, number> = {
  ACTIVE: 0,
  DRAFT: 0,
  HIDDEN: 0,
  ARCHIVED: 0,
};

function summarise(properties: PortfolioProperty[]): PortfolioTotals {
  const byStatus = { ...EMPTY_STATUS_COUNTS };
  let totalUnits = 0;
  let vacantUnits = 0;

  for (const property of properties) {
    byStatus[property.status] = (byStatus[property.status] ?? 0) + 1;
    totalUnits += property.totalUnits;
    vacantUnits += property.availableUnits;
  }

  return {
    properties: properties.length,
    active: byStatus.ACTIVE,
    drafts: byStatus.DRAFT,
    totalUnits,
    vacantUnits,
    byStatus,
  };
}

/**
 * `enabled: false` skips the fetch entirely — used by screens that mount before
 * the landlord has a profile, where every call would only collect a 403.
 */
export function usePortfolio({ enabled = true }: { enabled?: boolean } = {}) {
  const result = useAsync<Portfolio>(
    async (signal) => {
      if (!enabled) {
        return {
          properties: [],
          totals: summarise([]),
          truncated: false,
          serverTotal: 0,
        };
      }

      const { items, pagination } = await listProperties({ limit: MAX_PAGE }, signal);
      const unitsById = await listUnitsForProperties(
        items.map((property) => property.id),
        signal,
      );

      const properties: PortfolioProperty[] = items.map((property) => {
        const units = unitsById[property.id] ?? [];
        return {
          ...property,
          units,
          totalUnits: units.reduce((sum, unit) => sum + unit.totalUnits, 0),
          availableUnits: units.reduce((sum, unit) => sum + unit.availableUnits, 0),
        };
      });

      const serverTotal = pagination?.total ?? properties.length;

      return {
        properties,
        totals: summarise(properties),
        truncated: serverTotal > properties.length,
        serverTotal,
      };
    },
    [enabled],
  );

  return result;
}

/** Flattens a portfolio into one row per unit type, for the Units screen. */
export function useUnitRows(portfolio: Portfolio | undefined) {
  return useMemo(() => {
    if (!portfolio) return [];
    return portfolio.properties.flatMap((property) =>
      property.units.map((unit) => ({ property, unit })),
    );
  }, [portfolio]);
}
