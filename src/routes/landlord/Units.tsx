import { Building2, DoorOpen, Minus, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { StatCard, StatCardSkeleton } from "@/components/app/StatCard";
import { StatusBadge, VacancyBadge } from "@/components/app/StatusBadge";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/app/States";
import { useLandlordGate, VerificationNotice } from "@/components/landlord/VerificationNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { updateUnit } from "@/lib/api/properties";
import type { Unit } from "@/lib/api/types";
import { formatAmenity, formatRent } from "@/lib/format";
import { usePortfolio, useUnitRows } from "@/lib/hooks/use-portfolio";

/**
 * Every unit type the landlord owns, across every property.
 *
 * The per-property editor already manages units one building at a time. This
 * screen exists for the job that spans buildings: a landlord who has just let
 * three units in three different properties should be able to correct all three
 * vacancy counts without opening three editors. So the table is read-mostly, with
 * one editable control — the availability stepper — and a link out to the full
 * editor for anything else.
 *
 * Everything here is real. It reuses `usePortfolio`, which has already fetched
 * units per property for the dashboard, so this screen adds no new requests and
 * inherits the same `truncated` ceiling.
 */

type VacancyFilter = "ALL" | "VACANT" | "FULL";

const VACANCY_FILTERS: Array<{ value: VacancyFilter; label: string }> = [
  { value: "ALL", label: "All units" },
  { value: "VACANT", label: "Has vacancies" },
  { value: "FULL", label: "Fully occupied" },
];

type SortKey = "property" | "type" | "rent-desc" | "rent-asc" | "vacant-desc";

const SORT_LABELS: Record<SortKey, string> = {
  property: "By property",
  type: "By unit type",
  "rent-desc": "Rent: high to low",
  "rent-asc": "Rent: low to high",
  "vacant-desc": "Most vacancies",
};

export default function LandlordUnits() {
  const gate = useLandlordGate();
  const { data, error, loading, reload } = usePortfolio({ enabled: gate !== "onboarding" });
  const rows = useUnitRows(data);

  const [query, setQuery] = useState("");
  const [propertyId, setPropertyId] = useState<string>("ALL");
  const [vacancy, setVacancy] = useState<VacancyFilter>("ALL");
  const [sort, setSort] = useState<SortKey>("property");
  const [busyId, setBusyId] = useState<string | null>(null);

  const properties = data?.properties ?? [];
  const totals = data?.totals;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return rows
      .filter((row) => propertyId === "ALL" || row.property.id === propertyId)
      .filter((row) => {
        if (vacancy === "VACANT") return row.unit.availableUnits > 0;
        if (vacancy === "FULL") return row.unit.availableUnits === 0;
        return true;
      })
      .filter((row) => {
        if (!needle) return true;
        return [row.unit.unitType, row.property.title, row.property.town, row.property.estate]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        switch (sort) {
          case "type":
            return a.unit.unitType.localeCompare(b.unit.unitType);
          case "rent-desc":
            return b.unit.rent - a.unit.rent;
          case "rent-asc":
            return a.unit.rent - b.unit.rent;
          case "vacant-desc":
            return b.unit.availableUnits - a.unit.availableUnits;
          case "property":
          default:
            // Within a property, keep the cheapest type first — that is the order
            // the property's own listing shows.
            return (
              a.property.title.localeCompare(b.property.title) || a.unit.rent - b.unit.rent
            );
        }
      });
  }, [rows, query, propertyId, vacancy, sort]);

  const occupancy =
    totals && totals.totalUnits > 0
      ? Math.round(((totals.totalUnits - totals.vacantUnits) / totals.totalUnits) * 100)
      : null;

  /**
   * One PATCH per press, on `availableUnits` only. `vacancy` is derived
   * server-side from this count and never stored, so the count is the only honest
   * thing to edit — the boolean shorthand the API also accepts would discard it.
   */
  async function stepAvailable(unit: Unit, propertyKey: string, delta: number) {
    const next = unit.availableUnits + delta;
    if (next < 0 || next > unit.totalUnits) return;

    setBusyId(unit.id);
    try {
      await updateUnit(propertyKey, unit.id, { availableUnits: next });
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update the vacancy.");
    } finally {
      setBusyId(null);
    }
  }

  const canEdit = gate === "approved";

  return (
    <>
      <PageHeader
        title="Units"
        description="Every unit type you rent out, in one place. Adjust what's free as tenants move in and out."
      />

      <VerificationNotice className="mb-6" />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {loading || !totals ? (
              Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)
            ) : (
              <>
                <StatCard label="Units" value={totals.totalUnits} icon={DoorOpen} />
                <StatCard
                  label="Vacant"
                  value={totals.vacantUnits}
                  note={
                    totals.totalUnits > 0
                      ? `${Math.round((totals.vacantUnits / totals.totalUnits) * 100)}% of your units`
                      : undefined
                  }
                  icon={DoorOpen}
                />
                <StatCard
                  label="Occupied"
                  value={occupancy === null ? "—" : `${occupancy}%`}
                  note={
                    totals.totalUnits > 0
                      ? `${totals.totalUnits - totals.vacantUnits} of ${totals.totalUnits} let`
                      : undefined
                  }
                />
                <StatCard label="Unit types" value={rows.length} icon={Building2} />
              </>
            )}
          </div>

          {data?.truncated ? (
            <p className="rounded-lg border border-border bg-surface px-4 py-3 text-body-sm text-muted-foreground">
              These figures cover the {properties.length} most recent of {data.serverTotal}{" "}
              properties.
            </p>
          ) : null}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="unit-search">Search</Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="unit-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Unit type, property or town"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit-property">Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger id="unit-property" className="w-full lg:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All properties</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit-vacancy">Vacancy</Label>
              <Select
                value={vacancy}
                onValueChange={(value) => setVacancy(value as VacancyFilter)}
              >
                <SelectTrigger id="unit-vacancy" className="w-full lg:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VACANCY_FILTERS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit-sort">Sort</Label>
              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger id="unit-sort" className="w-full lg:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {SORT_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {Array.from({ length: 5 }, (_, index) => (
                <RowSkeleton key={index} columns={6} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={DoorOpen}
              title="No units yet"
              body={
                properties.length === 0
                  ? "Units live inside a property. Add a property first, then list the unit types it contains."
                  : "Your properties don't have any unit types yet — that's what carries the rent and the vacancy count."
              }
              action={
                canEdit ? (
                  <Button asChild>
                    <Link
                      to={
                        properties.length === 0
                          ? "/landlord/properties/new"
                          : `/landlord/properties/${properties[0].id}?tab=units`
                      }
                    >
                      <Plus />
                      {properties.length === 0 ? "Add property" : "Add unit types"}
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nothing matches those filters"
              body="Try a different search term, or widen the property and vacancy filters."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setPropertyId("ALL");
                    setVacancy("ALL");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              {/* Table from md up; the same rows as cards below it. */}
              <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit type</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Rent</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Available</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(({ property, unit }) => (
                      <TableRow key={unit.id}>
                        <TableCell>
                          <span className="font-medium text-foreground">{unit.unitType}</span>
                          <div className="mt-1">
                            <VacancyBadge
                              availableUnits={unit.availableUnits}
                              totalUnits={unit.totalUnits}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/landlord/properties/${property.id}?tab=units`}
                            className="text-foreground underline-offset-4 hover:underline"
                          >
                            {property.title}
                          </Link>
                          <div className="mt-1">
                            <StatusBadge status={property.status} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatRent(unit.rent)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{unit.totalUnits}</TableCell>
                        <TableCell>
                          <VacancyStepper
                            unit={unit}
                            busy={busyId === unit.id}
                            disabled={!canEdit}
                            onStep={(delta) => stepAvailable(unit, property.id, delta)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${unit.unitType} in ${property.title}`}
                          >
                            <Link to={`/landlord/properties/${property.id}?tab=units`}>
                              <Pencil />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="space-y-3 md:hidden">
                {filtered.map(({ property, unit }) => (
                  <li key={unit.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-body font-semibold text-foreground">
                          {unit.unitType}
                        </p>
                        <Link
                          to={`/landlord/properties/${property.id}?tab=units`}
                          className="block truncate text-body-sm text-muted-foreground underline-offset-4 hover:underline"
                        >
                          {property.title}
                        </Link>
                      </div>
                      <p className="shrink-0 text-body font-semibold text-foreground">
                        {formatRent(unit.rent)}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                      <div>
                        <p className="text-caption text-muted-foreground">
                          {unit.totalUnits} {unit.totalUnits === 1 ? "unit" : "units"} in total
                        </p>
                        <div className="mt-1">
                          <VacancyBadge
                            availableUnits={unit.availableUnits}
                            totalUnits={unit.totalUnits}
                          />
                        </div>
                      </div>
                      <VacancyStepper
                        unit={unit}
                        busy={busyId === unit.id}
                        disabled={!canEdit}
                        onStep={(delta) => stepAvailable(unit, property.id, delta)}
                      />
                    </div>

                    {unit.amenities && unit.amenities.length > 0 ? (
                      <p className="mt-3 truncate border-t border-border pt-3 text-body-sm text-muted-foreground">
                        {unit.amenities.slice(0, 4).map(formatAmenity).join(", ")}
                        {unit.amenities.length > 4 ? ` +${unit.amenities.length - 4} more` : ""}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>

              <p className="text-body-sm text-muted-foreground">
                Showing {filtered.length} of {rows.length} unit{" "}
                {rows.length === 1 ? "type" : "types"}
                {propertyId === "ALL"
                  ? ` across ${properties.length} ${properties.length === 1 ? "property" : "properties"}`
                  : ""}
                .
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}

/**
 * −/+ around a live count. Bounded at 0 and `totalUnits` because the server
 * rejects anything outside that range, and disabling a button is clearer than
 * surfacing a 400.
 */
function VacancyStepper({
  unit,
  busy,
  disabled,
  onStep,
}: {
  unit: Unit;
  busy: boolean;
  disabled?: boolean;
  onStep: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        disabled={disabled || busy || unit.availableUnits <= 0}
        aria-label={`One fewer ${unit.unitType} available`}
        onClick={() => onStep(-1)}
      >
        <Minus className="size-3.5" />
      </Button>
      <span
        aria-live="polite"
        className="w-12 text-center text-body font-semibold tabular-nums text-foreground"
      >
        {unit.availableUnits}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        disabled={disabled || busy || unit.availableUnits >= unit.totalUnits}
        aria-label={`One more ${unit.unitType} available`}
        onClick={() => onStep(1)}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}
