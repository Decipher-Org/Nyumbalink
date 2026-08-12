import { ArrowRight, Home as HomeIcon, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ListingCard } from "@/components/tenant/ListingCard";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listProperties } from "@/lib/api/properties";
import { useAuth } from "@/lib/auth/AuthProvider";
import { COUNTY, POPULAR_TOWNS } from "@/lib/content/kilifi";
import { PRICE_BRACKETS } from "@/lib/content/locations";
import { DEMO_BROWSE_GATE } from "@/lib/demo/tenant";
import { useAsync } from "@/lib/hooks/use-async";
import { tenantSearchPath } from "@/lib/search-params";

/**
 * The tenant home screen.
 *
 * ## Everything on this page is real
 *
 * There is no "Featured" row, and that is a deliberate departure from the
 * mockup. `Property` has no `featured` flag, so a curated-looking strip would
 * have to be an arbitrary slice of the list dressed up as editorial selection —
 * fake data wearing a real label, which is the one thing the demo rule exists to
 * prevent. What the server can actually promise is recency (`createdAt desc`),
 * so the strip says "Newest".
 *
 * The town and price shortcuts are real too: both expand into query params
 * `GET /properties` genuinely supports, via the same builder the marketing hero
 * uses. The only sample content is the daily-pass banner, which is informational
 * and blocks nothing.
 */

const NEWEST_LIMIT = 8;

export default function TenantHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const newest = useAsync(
    (signal) => listProperties({ county: COUNTY, limit: NEWEST_LIMIT }, signal),
    [],
  );

  const firstName = user?.name?.trim().split(/\s+/)[0];

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    // `q` is applied client-side over the loaded page — there is no title-search
    // param. Search says so on screen; see its header comment.
    navigate(trimmed === "" ? "/tenant/search" : `/tenant/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-h1 text-foreground">
          {firstName ? `Karibu, ${firstName}.` : "Karibu."}
        </h1>
        <p className="mt-1 text-body text-muted-foreground">
          Find your next home in {COUNTY} County.
        </p>

        <form onSubmit={submitSearch} className="mt-5 flex gap-2">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, estate or town"
              aria-label="Search listings"
              className="pl-9"
            />
          </div>
          <Button type="submit">
            <span className="hidden sm:inline">Search</span>
            <Search className="sm:hidden" />
          </Button>
        </form>
      </section>

      <section aria-labelledby="by-town">
        <h2 id="by-town" className="text-h3 text-foreground">
          Popular towns
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {POPULAR_TOWNS.map((town) => (
            <li key={town}>
              <Link
                to={tenantSearchPath({ town })}
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-body-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {town}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="by-budget">
        <h2 id="by-budget" className="text-h3 text-foreground">
          By budget
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {PRICE_BRACKETS.map((bracket) => (
            <li key={bracket.id}>
              <Link
                to={tenantSearchPath({ priceBracketId: bracket.id })}
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-body-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                KSh {bracket.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="newest">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="newest" className="text-h3 text-foreground">
              Newest in {COUNTY}
            </h2>
            <p className="mt-0.5 text-body-sm text-muted-foreground">
              The most recently published listings.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link to="/tenant/search">
              See all
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="mt-4">
          {newest.loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <CardSkeleton key={index} />
              ))}
            </div>
          ) : newest.error ? (
            <ErrorState error={newest.error} onRetry={newest.reload} />
          ) : newest.data && newest.data.items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {newest.data.items.map((property) => (
                <ListingCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={HomeIcon}
              title="No listings yet"
              body={`Nothing has been published in ${COUNTY} County so far. Check back soon — landlords are still coming on board.`}
            />
          )}
        </div>
      </section>

      {/* Informational, not a gate. See the note in lib/demo/tenant.ts. */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Sparkles aria-hidden="true" className="size-5 text-primary" />
        </span>
        <div className="flex-1">
          <p className="text-body font-semibold text-foreground">
            Browsing is free while we get started
          </p>
          <p className="mt-0.5 text-body-sm text-muted-foreground">{DEMO_BROWSE_GATE.note}</p>
        </div>
      </section>
    </div>
  );
}
