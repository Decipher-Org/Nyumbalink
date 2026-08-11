import { PRICE_BRACKETS } from "@/lib/content/locations";

export type SearchCriteria = {
  county?: string;
  priceBracketId?: string;
};

/**
 * Turns hero-search criteria into the query string `GET /properties` expects.
 * Price brackets expand into the minPrice/maxPrice params the API supports.
 */
export function criteriaToBrowseQuery(criteria: SearchCriteria): string {
  const params = new URLSearchParams();

  if (criteria.county) {
    params.set("county", criteria.county);
  }

  const bracket = PRICE_BRACKETS.find((b) => b.id === criteria.priceBracketId);
  if (bracket?.minPrice !== undefined) {
    params.set("minPrice", String(bracket.minPrice));
  }
  if (bracket?.maxPrice !== undefined) {
    params.set("maxPrice", String(bracket.maxPrice));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

/** `/browse` path with the visitor's criteria pre-applied. */
export function browsePath(criteria: SearchCriteria = {}): string {
  return `/browse${criteriaToBrowseQuery(criteria)}`;
}

/**
 * Signup URL that remembers where the visitor was headed. Browsing requires a
 * session today, so a hero search sends visitors here first; `next` is honoured
 * after signup so their typed criteria survive the detour.
 */
export function signupPath(role: "tenant" | "landlord", next?: string): string {
  const params = new URLSearchParams({ role });
  if (next) {
    params.set("next", next);
  }
  return `/signup?${params.toString()}`;
}

export function loginPath(next?: string): string {
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}
