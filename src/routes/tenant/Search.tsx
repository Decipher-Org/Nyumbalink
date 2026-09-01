import { Map, Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DemoBadge } from "@/components/app/DemoBadge";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/app/States";
import { ListingCard } from "@/components/tenant/ListingCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { searchProperties, type SearchParams } from "@/lib/api/properties";
import {
  COASTAL_COUNTIES,
  townsForCounty,
} from "@/lib/content/locations";
import { useAsync } from "@/lib/hooks/use-async";
import { formatKes } from "@/lib/format";

/**
 * Search results.
 *
 * ## The URL is the state
 *
 * Every committed filter lives in the query string, so a result set is
 * shareable, survives a reload, and lets Home link straight into a filtered view
 * with `tenantSearchPath`. The filter sheet edits a *draft* copy and only writes
 * to the URL on Apply — otherwise every keystroke in the estate field would be a
 * new request and a new history entry.
 *
 * ## Which filters are real
 *
 * All filters (`q`, `county`, `town`, `estate`, `minPrice`, `maxPrice`, `bedrooms`,
 * `availableOnly`, `amenities`, `lat`, `lng`, `radiusKm`, `sort`, `page`, `limit`)
 * are genuine query parameters supported by `GET /api/v1/search`, so they narrow
 * the whole catalogue on the server. The search endpoint also provides
 * geolocation distance sorting and computes distanceKm for each result.
 *
 * County and town are user-selectable across NyumbaLink's coastal service area.
 */

const PAGE_SIZE = 12;

const BEDROOM_OPTIONS = ["1", "2", "3", "4", "5"] as const;

type Filters = {
  q: string;
  county: string;
  town: string;
  estate: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  availableOnly: string;
  lat: string;
  lng: string;
  radiusKm: string;
  sort: string;
  amenities: string; // comma-separated list
};

const EMPTY: Filters = {
  q: "",
  county: "",
  town: "",
  estate: "",
  minPrice: "",
  maxPrice: "",
  bedrooms: "",
  availableOnly: "",
  lat: "",
  lng: "",
  radiusKm: "",
  sort: "newest",
  amenities: "",
};

function readFilters(params: URLSearchParams): Filters {
  return {
    q: params.get("q") ?? "",
    county: params.get("county") ?? "",
    town: params.get("town") ?? "",
    estate: params.get("estate") ?? "",
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    bedrooms: params.get("bedrooms") ?? "",
    availableOnly: params.get("availableOnly") ?? "",
    lat: params.get("lat") ?? "",
    lng: params.get("lng") ?? "",
    radiusKm: params.get("radiusKm") ?? "",
    sort: params.get("sort") ?? "newest",
    amenities: params.get("amenities") ?? "",
  };
}

export default function TenantSearch() {
  const [params, setParams] = useSearchParams();

  const filters = readFilters(params);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const q = params.get("q") ?? "";

  const [queryDraft, setQueryDraft] = useState(q);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);

  // Browser navigation can change the committed URL without touching the input.
  useEffect(() => setQueryDraft(q), [q]);

  // Convert committed URL filters to SearchParams. `draft` stays local to the
  // sheet until the tenant explicitly applies it.
  function toSearchParams(): SearchParams {
    return {
      q: q || undefined,
      county: filters.county || undefined,
      town: filters.town || undefined,
      estate: filters.estate || undefined,
      bedrooms: filters.bedrooms ? (isNaN(Number(filters.bedrooms)) ? filters.bedrooms : Number(filters.bedrooms)) : undefined,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      availableOnly: filters.availableOnly === "true" ? true : undefined,
      lat: filters.lat ? Number(filters.lat) : undefined,
      lng: filters.lng ? Number(filters.lng) : undefined,
      radiusKm: filters.radiusKm ? Number(filters.radiusKm) : undefined,
      sort: filters.sort as "newest" | "price_asc" | "price_desc" | "distance",
      amenities: filters.amenities ? filters.amenities.split(",").map(a => a.trim()).filter(Boolean) : undefined,
      page: Number(page),
      limit: PAGE_SIZE,
    };
  }

  const results = useAsync(
    (signal) =>
      searchProperties(toSearchParams(), signal),
    [filters, q, page],
  );

  /** Writes a filter set to the URL, always resetting to page 1. */
  function commit(next: Filters, options: { q?: string } = {}) {
    const search = new URLSearchParams();
    const text = options.q ?? q;
    if (text) search.set("q", text);
    for (const [key, value] of Object.entries(next)) {
      if (value !== "" && value !== null) {
        search.set(key, value);
      }
    }
    setParams(search);
  }

  function goToPage(next: number) {
    const search = new URLSearchParams(params);
    if (next <= 1) search.delete("page");
    else search.set("page", String(next));
    setParams(search);
  }

  const items = results.data?.items ?? [];
  const pagination = results.data?.pagination;

  // Filtering and sorting are handled by the backend.
  const visible = items;

  const activeChips = describeFilters(filters);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h1 text-foreground">Search</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Explore verified listings across Kenya&apos;s coastal counties.
        </p>
      </div>

      <div className="flex gap-2">
        <form
          className="relative flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            commit(filters, { q: queryDraft.trim() });
          }}
        >
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="Search listings"
            aria-label="Search listings"
            className="pl-9"
          />
        </form>

        <Sheet
          open={sheetOpen}
          onOpenChange={(open) => {
            // Re-seed the draft from the URL each time it opens, so a cancelled
            // edit doesn't linger into the next visit.
            if (open) setDraft(filters);
            setSheetOpen(open);
          }}
        >
          <SheetTrigger asChild>
            <Button variant="outline" className="shrink-0">
              <SlidersHorizontal />
              <span className="hidden sm:inline">Filters</span>
              {activeChips.length > 0 ? (
                <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-caption font-semibold text-primary-foreground">
                  {activeChips.length}
                </span>
              ) : null}
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-4">
              {/* Availability */}
              <fieldset className="space-y-2">
                <legend className="text-body-sm font-medium text-foreground">
                  Availability
                </legend>
                <label className="flex items-center gap-2 text-body-sm text-muted-foreground">
                  <Checkbox
                    checked={draft.availableOnly === "true"}
                    onCheckedChange={(checked) => {
                      setDraft((prev) => ({
                        ...prev,
                        availableOnly: checked === true ? "true" : "",
                      }));
                    }}
                  />
                  Only show available units
                </label>
              </fieldset>

              {/* Amenities */}
              <fieldset className="space-y-2">
                <legend className="text-body-sm font-medium text-foreground">
                  Amenities
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {["wifi", "parking", "water", "petFriendly", "furnished"].map(
                    (amenity) => {
                      const checked = draft.amenities
                        ? draft.amenities
                            .split(",")
                            .map((a) => a.trim())
                            .includes(amenity)
                        : false;
                      return (
                        <label
                          key={amenity}
                          className="flex items-center gap-2 text-body-sm text-muted-foreground"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(checked) => {
                              setDraft((prev) => {
                                const amenitiesList = prev.amenities
                                  ? prev.amenities
                                      .split(",")
                                      .map((a) => a.trim())
                                      .filter(Boolean)
                                  : [];
                                const updated =
                                  checked === true
                                    ? [...amenitiesList, amenity]
                                    : amenitiesList.filter((a) => a !== amenity);
                                return { ...prev, amenities: updated.join(",") };
                              });
                            }}
                          />
                          {amenity.charAt(0).toUpperCase() + amenity.slice(1)}
                        </label>
                      );
                    }
                  )}
                </div>
              </fieldset>

              {/* Geolocation */}
              <fieldset className="space-y-2">
                <legend className="text-body-sm font-medium text-foreground">
                  Geolocation
                </legend>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                          navigator.geolocation.getCurrentPosition(resolve, reject);
                        });
                        const { latitude, longitude } = pos.coords;
                        setDraft((prev) => ({
                          ...prev,
                          lat: latitude.toString(),
                          lng: longitude.toString(),
                          radiusKm: "10", // default radius
                        }));
                      } catch (err) {
                        console.error("Geolocation error:", err);
                        alert("Could not get your location. Please enable geolocation permissions.");
                      }
                    }}
                  >
                    Use my location
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-lat">Latitude</Label>
                  <Input
                    id="filter-lat"
                    value={draft.lat}
                    placeholder="e.g. -1.234"
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, lat: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-lng">Longitude</Label>
                  <Input
                    id="filter-lng"
                    value={draft.lng}
                    placeholder="e.g. 36.567"
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, lng: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-radius">Radius (km)</Label>
                  <Input
                    id="filter-radius"
                    value={draft.radiusKm}
                    placeholder="e.g. 5"
                    type="number"
                    min="0.1"
                    step="0.1"
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, radiusKm: e.target.value }))
                    }
                  />
                </div>
              </fieldset>

              {/* Existing filters: County, Town, Estate, Price, Bedrooms */}
              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="filter-county">County</Label>
                <Select
                  value={draft.county || "any"}
                  onValueChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      county: value === "any" ? "" : value,
                      town: "",
                    }))
                  }
                >
                  <SelectTrigger id="filter-county" className="w-full">
                    <SelectValue placeholder="Any coastal county" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All coastal counties</SelectItem>
                    {COASTAL_COUNTIES.map((county) => (
                      <SelectItem key={county} value={county}>
                        {county}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-town">Town</Label>
                <Select
                  value={draft.town || "any"}
                  onValueChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      town: value === "any" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger id="filter-town" className="w-full">
                    <SelectValue placeholder="Any town" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any town</SelectItem>
                    {townsForCounty(draft.county).map((town) => (
                      <SelectItem key={town} value={town}>
                        {town}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-estate">Estate or area</Label>
                <Input
                  id="filter-estate"
                  value={draft.estate}
                  placeholder="e.g. Bofa"
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, estate: event.target.value }))
                  }
                />
              </div>

              <fieldset className="space-y-1.5">
                <legend className="text-body-sm font-medium text-foreground">
                  Monthly rent (KSh)
                </legend>
                <div className="flex items-center gap-2">
                  <Input
                    value={draft.minPrice}
                    inputMode="numeric"
                    placeholder="Min"
                    aria-label="Minimum rent"
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        minPrice: digitsOnly(event.target.value),
                      }))
                    }
                  />
                  <span aria-hidden="true" className="text-muted-foreground">
                    –
                  </span>
                  <Input
                    value={draft.maxPrice}
                    inputMode="numeric"
                    placeholder="Max"
                    aria-label="Maximum rent"
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        maxPrice: digitsOnly(event.target.value),
                      }))
                    }
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-body-sm font-medium text-foreground">Bedrooms</legend>
                <div className="flex flex-wrap gap-2">
                  {BEDROOM_OPTIONS.map((count) => {
                    const active = draft.bedrooms === count;
                    return (
                      <Button
                        key={count}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        aria-pressed={active}
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            bedrooms: active ? "" : count,
                          }))
                        }
                      >
                        {count}
                        {count === "5" ? "+" : ""}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-caption text-muted-foreground">
                  Matched against the unit type, so “2” finds “2 Bedroom”.
                </p>
              </fieldset>
            </div>

            <SheetFooter className="flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDraft(EMPTY);
                  commit(EMPTY);
                  setSheetOpen(false);
                }}
              >
                Clear all
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  commit(draft);
                  setSheetOpen(false);
                }}
              >
                Show results
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {activeChips.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={() => commit({ ...filters, ...chip.clear })}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-caption font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
              >
                {chip.label}
                <X aria-hidden="true" className="size-3.5" />
                <span className="sr-only">Remove this filter</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-muted-foreground" aria-live="polite">
          {results.loading
            ? "Loading…"
            : pagination
              ? `${pagination.total} ${pagination.total === 1 ? "listing" : "listings"}`
              : `${items.length} shown`}
        </p>

        <div className="flex items-center gap-2">
          <Select
            value={filters.sort}
            onValueChange={(value) => commit({ ...filters, sort: value })}
          >
            <SelectTrigger className="h-9 w-[9.5rem]" aria-label="Sort results">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem>
              <SelectItem value="distance">Distance</SelectItem>
            </SelectContent>
          </Select>
          <DemoBadge feature="sorting" />
          <Button type="button" variant="outline" size="sm" disabled>
            <Map />
            <span className="hidden sm:inline">Map</span>
          </Button>
          <DemoBadge feature="map" />
        </div>
      </div>

      {results.loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : results.error ? (
        <ErrorState error={results.error} onRetry={results.reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={q || activeChips.length > 0 ? "Nothing matches that" : "No listings yet"}
          body={
            q || activeChips.length > 0
              ? "Try a wider price range, a different town, or clear the filters."
              : "Nothing has been published across the coastal counties so far."
          }
          action={
            activeChips.length > 0 || q ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQueryDraft("");
                  commit(EMPTY, { q: "" });
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((property) => (
            <ListingCard key={property.id} property={property} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <nav
          aria-label="Results pages"
          className="flex items-center justify-between gap-3 border-t border-border pt-4"
        >
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </Button>
          <p className="text-body-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={page >= pagination.totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

type Chip = { key: string; label: string; clear: Partial<Filters> };

function describeFilters(filters: Filters): Chip[] {
  const chips: Chip[] = [];

  if (filters.county) {
    chips.push({
      key: "county",
      label: `${filters.county} County`,
      clear: { county: "", town: "" },
    });
  }
  if (filters.town) {
    chips.push({ key: "town", label: filters.town, clear: { town: "" } });
  }
  if (filters.estate) {
    chips.push({ key: "estate", label: filters.estate, clear: { estate: "" } });
  }
  if (filters.bedrooms) {
    chips.push({
      key: "bedrooms",
      label: `${filters.bedrooms} bedroom`,
      clear: { bedrooms: "" },
    });
  }
  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice ? formatKes(Number(filters.minPrice)) : null;
    const max = filters.maxPrice ? formatKes(Number(filters.maxPrice)) : null;
    chips.push({
      key: "price",
      label: min && max ? `${min} – ${max}` : min ? `From ${min}` : `Up to ${max}`,
      clear: { minPrice: "", maxPrice: "" },
    });
  }
  if (filters.availableOnly === "true") {
    chips.push({
      key: "availableOnly",
      label: "Available units",
      clear: { availableOnly: "" },
    });
  }
  if (filters.amenities) {
    const amenitiesList = filters.amenities
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    if (amenitiesList.length > 0) {
      chips.push({
        key: "amenities",
        label: `Amenities: ${amenitiesList.join(", ")}`,
        clear: { amenities: "" },
      });
    }
  }
  if (filters.lat && filters.lng) {
    const radius = filters.radiusKm ? ` (radius ${filters.radiusKm}km)` : "";
    chips.push({
      key: "geolocation",
      label: `Near ${filters.lat}, ${filters.lng}${radius}`,
      clear: { lat: "", lng: "", radiusKm: "" },
    });
  }

  return chips;
}
