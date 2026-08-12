/**
 * Location and price options for the hero search.
 *
 * The backend has no counties/towns endpoint, so these are a static list. Since
 * launch is Kilifi-only, county is no longer a choice — the geography lives in
 * `kilifi.ts` and is re-exported here so the search plumbing has one import
 * site. `town` is what varies, and `GET /properties` matches it
 * case-insensitively on a substring.
 */

export { COUNTY, KILIFI_TOWNS, POPULAR_TOWNS } from "./kilifi";
export type { KilifiTown } from "./kilifi";

export type PriceBracket = {
  /** Stable key used as the <Select> value. */
  id: string;
  label: string;
  minPrice?: number;
  maxPrice?: number;
};

/** Brackets map onto the minPrice/maxPrice query params the API already accepts. */
export const PRICE_BRACKETS: PriceBracket[] = [
  { id: "under-10k", label: "Under 10,000", maxPrice: 10_000 },
  { id: "10k-20k", label: "10,000 – 20,000", minPrice: 10_000, maxPrice: 20_000 },
  { id: "20k-35k", label: "20,000 – 35,000", minPrice: 20_000, maxPrice: 35_000 },
  { id: "35k-50k", label: "35,000 – 50,000", minPrice: 35_000, maxPrice: 50_000 },
  { id: "50k-80k", label: "50,000 – 80,000", minPrice: 50_000, maxPrice: 80_000 },
  { id: "80k-plus", label: "80,000+", minPrice: 80_000 },
];
