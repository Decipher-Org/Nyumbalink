import { Archive, Building2, Eye, EyeOff, MoreHorizontal, Pencil, Plus, Search, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/app/States";
import { useLandlordGate, VerificationNotice } from "@/components/landlord/VerificationNotice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { archiveProperty, updateProperty } from "@/lib/api/properties";
import { STATUS_TRANSITIONS, type PropertyStatus } from "@/lib/api/types";
import { formatDate, formatLocation, formatRentPerMonth } from "@/lib/format";
import { usePortfolio, type PortfolioProperty } from "@/lib/hooks/use-portfolio";

/**
 * The landlord's property list.
 *
 * ## Why search, filter, sort and paging all happen in the browser
 *
 * The backend has no `status` filter, no title search and no `sort` param, and
 * its list is hardcoded to `createdAt desc`. Rather than mix server paging with
 * client filtering — which would filter only the current page and quietly lie
 * about the totals — this loads the whole catalogue in one call and does all four
 * locally. The result is consistent: the count under the table always matches
 * what the filters say.
 *
 * That holds because a landlord's catalogue is small. `usePortfolio` reports
 * `truncated` when it isn't, and this screen surfaces it instead of pretending
 * the page is complete.
 *
 * Sorting here is **not** marked as demo, unlike the tenant search screen. There
 * it reorders one page of many; here every row is already loaded, so the order is
 * genuinely complete.
 */

type SortKey = "newest" | "oldest" | "title" | "rent-asc" | "rent-desc" | "vacancy";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title A–Z",
  "rent-asc": "Rent: low to high",
  "rent-desc": "Rent: high to low",
  vacancy: "Most vacancies",
};

const PAGE_SIZE = 10;

const STATUS_FILTERS: Array<{ value: PropertyStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "HIDDEN", label: "Hidden" },
  { value: "ARCHIVED", label: "Archived" },
];

/** Wording for each legal move, so a menu item reads as an action not a state. */
const TRANSITION_LABELS: Partial<Record<PropertyStatus, { label: string; icon: typeof Eye }>> = {
  ACTIVE: { label: "Publish", icon: Send },
  HIDDEN: { label: "Hide from search", icon: EyeOff },
  ARCHIVED: { label: "Archive", icon: Archive },
};

function compareBy(sort: SortKey) {
  return (a: PortfolioProperty, b: PortfolioProperty): number => {
    switch (sort) {
      case "oldest":
        return a.createdAt.localeCompare(b.createdAt);
      case "title":
        return a.title.localeCompare(b.title);
      case "rent-asc":
        // Properties with no units sort last either way — an unpriced listing is
        // not "cheapest".
        return (a.unitsFrom ?? Infinity) - (b.unitsFrom ?? Infinity);
      case "rent-desc":
        return (b.unitsFrom ?? -Infinity) - (a.unitsFrom ?? -Infinity);
      case "vacancy":
        return b.availableUnits - a.availableUnits;
      case "newest":
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  };
}

export default function LandlordProperties() {
  const gate = useLandlordGate();
  const { data, error, loading, reload } = usePortfolio({ enabled: gate !== "onboarding" });

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PropertyStatus | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [pendingArchive, setPendingArchive] = useState<PortfolioProperty | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const all = data?.properties ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return all
      .filter((property) => status === "ALL" || property.status === status)
      .filter((property) => {
        if (!needle) return true;
        return [property.title, property.town, property.estate, property.county]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle));
      })
      .sort(compareBy(sort));
  }, [all, query, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // A filter change can leave the cursor past the end of the new result set.
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetPaging<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  async function moveStatus(property: PortfolioProperty, next: PropertyStatus) {
    setBusyId(property.id);
    try {
      if (next === "ARCHIVED") {
        await archiveProperty(property.id);
      } else {
        await updateProperty(property.id, { status: next });
      }
      toast.success(
        next === "ACTIVE"
          ? `"${property.title}" is now live.`
          : next === "HIDDEN"
            ? `"${property.title}" is hidden from search.`
            : `"${property.title}" was archived.`,
      );
      reload();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "That didn't work. Please try again.";
      toast.error(message);
    } finally {
      setBusyId(null);
      setPendingArchive(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Properties"
        description="Everything you've listed, at every stage."
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
        <div className="space-y-4">
          {/* One filter row above the table, scoping everything below it. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="property-search">Search</Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="property-search"
                  value={query}
                  onChange={(event) => resetPaging(setQuery)(event.target.value)}
                  placeholder="Title, town or estate"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="property-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => resetPaging(setStatus)(value as PropertyStatus | "ALL")}
              >
                <SelectTrigger id="property-status" className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="property-sort">Sort</Label>
              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger id="property-sort" className="w-full sm:w-48">
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

          {data?.truncated ? (
            <p className="rounded-lg border border-border bg-surface px-4 py-3 text-body-sm text-muted-foreground">
              You have {data.serverTotal} properties and this screen works with the{" "}
              {all.length} most recent. Search and filters apply to those.
            </p>
          ) : null}

          {loading ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {Array.from({ length: 5 }, (_, index) => (
                <RowSkeleton key={index} columns={6} />
              ))}
            </div>
          ) : all.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No properties yet"
              body={
                gate === "approved"
                  ? "Add a property, then list the unit types tenants can rent in it."
                  : "You'll be able to add your first property once your account is approved."
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
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nothing matches those filters"
              body="Try a different search term, or clear the status filter."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setStatus("ALL");
                    setPage(1);
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
                      <TableHead>Property</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Vacant</TableHead>
                      <TableHead className="text-right">From</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell>
                          <Link
                            to={`/landlord/properties/${property.id}`}
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {property.title}
                          </Link>
                          <p className="text-caption text-muted-foreground">
                            {formatLocation(property)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={property.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {property.totalUnits}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {property.availableUnits}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {property.unitsFrom === null ? "—" : formatRentPerMonth(property.unitsFrom)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(property.createdAt)}
                        </TableCell>
                        <TableCell>
                          <RowActions
                            property={property}
                            busy={busyId === property.id}
                            canManage={gate === "approved"}
                            onMove={moveStatus}
                            onArchive={setPendingArchive}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="space-y-3 md:hidden">
                {visible.map((property) => (
                  <li
                    key={property.id}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/landlord/properties/${property.id}`}
                          className="block truncate text-body font-semibold text-foreground"
                        >
                          {property.title}
                        </Link>
                        <p className="truncate text-body-sm text-muted-foreground">
                          {formatLocation(property)}
                        </p>
                      </div>
                      <RowActions
                        property={property}
                        busy={busyId === property.id}
                        canManage={gate === "approved"}
                        onMove={moveStatus}
                        onArchive={setPendingArchive}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-body-sm">
                      <StatusBadge status={property.status} />
                      <span className="text-muted-foreground">
                        {property.totalUnits} {property.totalUnits === 1 ? "unit" : "units"} ·{" "}
                        {property.availableUnits} vacant
                      </span>
                      <span className="text-foreground">
                        {property.unitsFrom === null
                          ? "No rent set"
                          : formatRentPerMonth(property.unitsFrom)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-body-sm text-muted-foreground">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                {totalPages > 1 ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-body-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      )}

      {/* Archiving is terminal in the backend's state machine, so it confirms. */}
      <Dialog open={pendingArchive !== null} onOpenChange={(open) => !open && setPendingArchive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this property?</DialogTitle>
            <DialogDescription>
              "{pendingArchive?.title}" will be removed from search and cannot be republished —
              archiving is permanent. Hide it instead if you only want a break from enquiries.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={busyId !== null}
              onClick={() => pendingArchive && moveStatus(pendingArchive, "ARCHIVED")}
            >
              {busyId ? "Archiving…" : "Archive permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Row menu, offering only the moves the backend's state machine actually allows
 * from the current status. Anything else would collect
 * `400 INVALID_STATUS_TRANSITION`.
 */
function RowActions({
  property,
  busy,
  canManage,
  onMove,
  onArchive,
}: {
  property: PortfolioProperty;
  busy: boolean;
  canManage: boolean;
  onMove: (property: PortfolioProperty, next: PropertyStatus) => void;
  onArchive: (property: PortfolioProperty) => void;
}) {
  const transitions = STATUS_TRANSITIONS[property.status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={busy}
          aria-label={`Actions for ${property.title}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/landlord/properties/${property.id}`}>
            <Pencil />
            {canManage ? "Edit" : "View"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/landlord/properties/${property.id}?tab=units`}>
            <Building2 />
            Manage units
          </Link>
        </DropdownMenuItem>

        {canManage && transitions.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            {transitions.map((next) => {
              const meta = TRANSITION_LABELS[next];
              if (!meta) return null;
              const Icon = meta.icon;

              // Publishing a property with no units would list something nobody
              // can rent, so the backend's happy path is still a bad listing.
              const blocked = next === "ACTIVE" && property.totalUnits === 0;

              return (
                <DropdownMenuItem
                  key={next}
                  variant={next === "ARCHIVED" ? "destructive" : "default"}
                  disabled={blocked}
                  onSelect={(event) => {
                    if (next === "ARCHIVED") {
                      event.preventDefault();
                      onArchive(property);
                      return;
                    }
                    onMove(property, next);
                  }}
                >
                  <Icon />
                  {blocked ? "Add a unit before publishing" : meta.label}
                </DropdownMenuItem>
              );
            })}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
