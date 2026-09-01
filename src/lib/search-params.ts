import { PRICE_BRACKETS, type CoastalCounty } from "@/lib/content/locations";

export type SearchCriteria = {
  county?: CoastalCounty;
  town?: string;
  priceBracketId?: string;
};

/**
 * Turns hero-search criteria into the query string `GET /properties` expects.
 * County and town remain explicit in shareable URLs. Price brackets expand into
 * the minPrice/maxPrice params the API supports.
 */
export function criteriaToBrowseQuery(criteria: SearchCriteria): string {
  const params = new URLSearchParams();

  if (criteria.county) {
    params.set("county", criteria.county);
  }

  if (criteria.town) {
    params.set("town", criteria.town);
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
 * The signed-in equivalent of `browsePath`.
 *
 * Deliberately the same query shape, because `/browse` redirects here once a
 * tenant has a session — a hero search made before signing in has to survive
 * that hop with its criteria intact.
 */
export function tenantSearchPath(criteria: SearchCriteria = {}): string {
  return `/tenant/search${criteriaToBrowseQuery(criteria)}`;
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

/**
 * Constrains a `?next=` value to an in-app path, or null.
 *
 * `next` is read straight out of a URL anyone can craft and handed to
 * `navigate()`, which makes it an open redirect unless it is checked. The attack
 * is cheap and convincing: a link to the real `nyumbalink.co.ke/login` with
 * `?next=https://nyumbalink.co.ke.evil.example` lands the victim on a lookalike
 * immediately after a genuine login, which is exactly when they'd type their
 * password again without thinking.
 *
 * Only a single leading slash passes. `//host` is protocol-relative and goes
 * off-site; `/\host` is the same trick spelled with a backslash, which browsers
 * normalise to `//`. Anything with a scheme (`https:`, `javascript:`, `mailto:`)
 * fails the leading-slash test already.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value[0] !== "/") return null;
  if (value[1] === "/" || value[1] === "\\") return null;
  return value;
}
