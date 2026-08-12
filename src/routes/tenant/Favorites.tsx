import { Heart, Search } from "lucide-react";

import { DemoNotice } from "@/components/app/DemoBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/app/States";
import { ListingCard } from "@/components/tenant/ListingCard";
import { Button } from "@/components/ui/button";
import { getProperty } from "@/lib/api/properties";
import type { PropertyCard } from "@/lib/api/types";
import { useFavourites } from "@/lib/demo/favourites";
import { useAsync } from "@/lib/hooks/use-async";
import { Link } from "react-router-dom";

/**
 * Saved listings.
 *
 * ## Fake set, real listings
 *
 * The saved *ids* are demo state (`DEMO_FEATURES.favorites`, in-memory, gone on
 * reload). The listings behind them are not: each id is fetched from
 * `GET /properties/:id`, so what renders is the live title, price and vacancy —
 * not a snapshot taken when the heart was clicked. That is the same shape the
 * real feature will have, so Milestone 8 replaces the id source and nothing else.
 *
 * ## Why one request per id
 *
 * `GET /properties` has no `id in (…)` filter, so the alternatives were a
 * `limit=100` sweep filtered client-side, or one fetch per saved id. The sweep
 * is a single request but silently drops any saved property that falls outside
 * the first 100 — a favourite that vanishes with no explanation. Per-id is exact,
 * and the set is bounded by how many things one person hearts.
 *
 * A saved property that has since been hidden or archived answers `403`. Those
 * are counted and reported rather than dropped in silence, because a list that
 * quietly shrinks looks like data loss.
 */
export default function TenantFavourites() {
  const { ids, count } = useFavourites();

  // `ids.join` keys the fetch: the array identity changes on every store read,
  // but its contents are what actually decide the request.
  const key = ids.join(",");

  const saved = useAsync(
    async (signal) => {
      if (ids.length === 0) return { items: [] as PropertyCard[], unavailable: 0 };

      const settled = await Promise.allSettled(ids.map((id) => getProperty(id, signal)));

      const items: PropertyCard[] = [];
      let unavailable = 0;

      for (const result of settled) {
        if (result.status === "rejected") {
          unavailable += 1;
          continue;
        }
        const detail = result.value;
        items.push({
          id: detail.id,
          title: detail.title,
          county: detail.county,
          town: detail.town,
          estate: detail.estate,
          images: detail.images.slice(0, 1),
          status: detail.status,
          unitsFrom: detail.units.reduce<number | null>(
            (low, unit) => (low === null || unit.rent < low ? unit.rent : low),
            null,
          ),
          createdAt: detail.createdAt ?? "",
        });
      }

      return { items, unavailable };
    },
    [key],
  );

  return (
    <>
      <PageHeader
        title="Saved homes"
        description={count === 0 ? undefined : `${count} saved this session.`}
      />

      <DemoNotice feature="favorites" className="mb-6" />

      {count === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          body="Tap the heart on any listing to keep it here while you compare. Saves reset when you reload, until the favourites milestone lands."
          action={
            <Button asChild>
              <Link to="/tenant/search">
                <Search />
                Find a home
              </Link>
            </Button>
          }
        />
      ) : saved.loading && !saved.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: Math.min(count, 3) }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : saved.error ? (
        <ErrorState error={saved.error} onRetry={saved.reload} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Filtered against the live id set, not just the fetched page.
                Un-hearting changes `key` and triggers a refetch, but `useAsync`
                keeps the previous data while it runs — without this filter the
                removed card would linger until the new response landed, and
                skeletons would flash on every removal. */}
            {saved.data?.items
              .filter((property) => ids.includes(property.id))
              .map((property) => <ListingCard key={property.id} property={property} />)}
          </div>

          {saved.data && saved.data.unavailable > 0 ? (
            <p className="text-body-sm text-muted-foreground">
              {saved.data.unavailable}{" "}
              {saved.data.unavailable === 1 ? "saved listing has" : "saved listings have"} been
              taken down since you saved {saved.data.unavailable === 1 ? "it" : "them"}.
            </p>
          ) : null}
        </div>
      )}
    </>
  );
}
