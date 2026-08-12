import { cn } from "@/lib/utils";
import type { PropertyStatus } from "@/lib/api/types";

/**
 * The four property statuses, rendered with the design system's status triads
 * (soft background, strong text) so each badge clears WCAG AA — which a solid
 * fill on white does not.
 *
 * `ARCHIVED` deliberately uses muted rather than destructive red: archiving is a
 * normal end-of-life move, not an error.
 */
const STATUS_STYLES: Record<PropertyStatus, { className: string; label: string }> = {
  ACTIVE: { className: "bg-success-soft text-success-strong", label: "Active" },
  DRAFT: { className: "bg-warning-soft text-warning-strong", label: "Draft" },
  HIDDEN: { className: "bg-inactive-soft text-inactive-strong", label: "Hidden" },
  ARCHIVED: { className: "bg-muted text-muted-foreground", label: "Archived" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: PropertyStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold",
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  );
}

/**
 * Unit availability. Derived from the count rather than passed as a flag,
 * mirroring the backend, where `vacancy` is computed from `availableUnits > 0`
 * and never stored.
 */
export function VacancyBadge({
  availableUnits,
  totalUnits,
  className,
}: {
  availableUnits: number;
  totalUnits: number;
  className?: string;
}) {
  const vacant = availableUnits > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold",
        vacant ? "bg-success-soft text-success-strong" : "bg-inactive-soft text-inactive-strong",
        className,
      )}
    >
      {vacant ? `${availableUnits} of ${totalUnits} vacant` : "Fully occupied"}
    </span>
  );
}
