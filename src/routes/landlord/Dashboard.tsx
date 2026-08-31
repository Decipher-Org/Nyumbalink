import { Building2, DoorOpen, Eye, Heart, House, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { StatusBreakdown, TrendChart } from "@/components/app/charts";
import { DemoBadge } from "@/components/app/DemoBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard, StatCardSkeleton } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/app/States";
import {
  useLandlordGate,
  VerificationNotice,
} from "@/components/landlord/VerificationNotice";
import { Button } from "@/components/ui/button";
import { demoLandlordStats, demoViewsTrend } from "@/lib/demo/landlord";
import { formatDate, formatLocation, formatRentPerMonth } from "@/lib/format";
import { usePortfolio } from "@/lib/hooks/use-portfolio";

/**
 * The landlord's overview.
 *
 * Four of the six tiles are real and derived from the catalogue; two (views,
 * favourites) are sample data and say so. The split is deliberate and visible —
 * a landlord should never have to guess which number on their dashboard is real.
 */
export default function LandlordDashboard() {
  const gate = useLandlordGate();
  // Before onboarding every property call is a 403, so don't make them.
  const { data, error, loading, reload } = usePortfolio({
    enabled: gate !== "onboarding",
  });

  const properties = data?.properties ?? [];
  const totals = data?.totals;
  const demoStats = demoLandlordStats(properties);
  const trend = demoViewsTrend(properties);

  const recent = properties.slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How your listings are doing at a glance."
        actions={
          gate === "approved" ? (
            <Button asChild>
              <Link to="/landlord/properties/new">
                <Plus />
                Add property
              </Link>
            </Button>
          ) : null
        }
      />

      <VerificationNotice className="mb-6" />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          {data?.truncated ? (
            <p className="rounded-lg border border-border bg-surface px-4 py-3 text-body-sm text-muted-foreground">
              Showing the {properties.length} most recent of {data.serverTotal}{" "}
              properties. The totals below cover those {properties.length}.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {loading || !totals ? (
              Array.from({ length: 6 }, (_, index) => (
                <StatCardSkeleton key={index} />
              ))
            ) : (
              <>
                <StatCard
                  label="Properties"
                  value={totals.properties}
                  icon={Building2}
                />
                <StatCard
                  label="Active listings"
                  value={totals.active}
                  note={
                    totals.drafts > 0
                      ? `${totals.drafts} still in draft`
                      : undefined
                  }
                  icon={House}
                />
                <StatCard
                  label="Units"
                  value={totals.totalUnits}
                  icon={DoorOpen}
                />
                <StatCard
                  label="Vacant units"
                  value={totals.vacantUnits}
                  note={
                    totals.totalUnits > 0
                      ? `${Math.round((totals.vacantUnits / totals.totalUnits) * 100)}% of your units`
                      : undefined
                  }
                  icon={DoorOpen}
                />
                <StatCard
                  label="Views this month"
                  value={demoStats.monthlyViews.toLocaleString("en-KE")}
                  demo="views"
                />
                <StatCard
                  label="Saved by tenants"
                  value={demoStats.favourites}
                  icon={Heart}
                />
              </>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-h3 text-foreground">Listing status</h2>
              <p className="mt-1 mb-5 text-body-sm text-muted-foreground">
                Where your {totals?.properties ?? 0}{" "}
                {totals?.properties === 1 ? "property" : "properties"} stand.
              </p>
              {totals ? <StatusBreakdown counts={totals.byStatus} /> : null}
            </section>

            <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
              <div className="mb-1 flex items-start justify-between gap-3">
                <h2 className="text-h3 text-foreground">
                  Views over the last 6 months
                </h2>
                <DemoBadge feature="views" />
              </div>
              <p className="mb-4 text-body-sm text-muted-foreground">
                Sample figures — the platform doesn't count listing views yet.
              </p>
              <TrendChart points={trend} />
            </section>
          </div>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="text-h3 text-foreground">Recent properties</h2>
              {properties.length > 5 ? (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/landlord/properties">View all</Link>
                </Button>
              ) : null}
            </div>

            {loading ? (
              <div>
                {Array.from({ length: 3 }, (_, index) => (
                  <RowSkeleton key={index} columns={4} />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <EmptyState
                className="border-0 bg-transparent"
                icon={Building2}
                title="No properties yet"
                body={
                  gate === "approved"
                    ? "Add your first property, then add the unit types tenants can rent."
                    : "Once your account is approved you'll be able to add your first property."
                }
                action={
                  gate === "approved" ? (
                    <Button asChild>
                      <Link to="/landlord/properties/new">
                        <Plus />
                        Add property
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((property) => (
                  <li key={property.id}>
                    <Link
                      to={`/landlord/properties/${property.id}`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60"
                    >
                      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {property.images[0] ? (
                          <img
                            src={property.images[0]}
                            alt=""
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-muted-foreground">
                            <House className="size-5" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-semibold text-foreground">
                          {property.title}
                        </p>
                        <p className="truncate text-body-sm text-muted-foreground">
                          {formatLocation(property)} · added{" "}
                          {formatDate(property.createdAt)}
                        </p>
                      </div>

                      <div className="hidden text-right sm:block">
                        <p className="text-body-sm font-medium text-foreground">
                          {property.totalUnits}{" "}
                          {property.totalUnits === 1 ? "unit" : "units"}
                        </p>
                        <p className="text-caption text-muted-foreground">
                          {property.availableUnits} vacant
                        </p>
                      </div>

                      <div className="hidden text-right md:block">
                        <p className="text-body-sm font-medium text-foreground">
                          {formatRentPerMonth(property.unitsFrom)}
                        </p>
                        <p className="text-caption text-muted-foreground">
                          from
                        </p>
                      </div>

                      <StatusBadge status={property.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-h3 text-foreground">Tenant interest</h2>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  Enquiries and saves across your listings.
                </p>
              </div>
              <DemoBadge feature="messages" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-surface px-4 py-3">
                <p className="text-body-sm text-muted-foreground">
                  Unread enquiries
                </p>
                <p className="mt-1 text-h2 text-foreground">
                  {demoStats.unreadMessages}
                </p>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg bg-surface px-4 py-3">
                <Heart className="size-4 shrink-0 text-muted-foreground" />
                <p className="text-body-sm text-muted-foreground">
                  {demoStats.favourites} tenants saved a listing
                </p>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg bg-surface px-4 py-3">
                <Eye className="size-4 shrink-0 text-muted-foreground" />
                <p className="text-body-sm text-muted-foreground">
                  {demoStats.monthlyViews.toLocaleString("en-KE")} views this
                  month
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
