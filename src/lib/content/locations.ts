/**
 * Location and price options for the hero search.
 *
 * The backend has no counties/towns endpoint, so these are a static list. The
 * `county` value is what `GET /properties` receives, where it matches
 * case-insensitively on a substring.
 */

export const COUNTY_OPTIONS = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Naivasha",
  "Eldoret",
  "Thika",
  "Kilifi",
  "Machakos",
  "Nyeri",
  "Kakamega",
  "Meru",
] as const;

export const POPULAR_SEARCHES = ["Nairobi", "Naivasha", "Nakuru", "Kilifi", "Kisumu"] as const;

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
