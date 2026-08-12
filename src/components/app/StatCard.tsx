import type { ComponentType, ReactNode } from "react";

import { DemoBadge } from "@/components/app/DemoBadge";
import type { DemoFeatureId } from "@/lib/demo/registry";
import { cn } from "@/lib/utils";

/**
 * A dashboard stat tile: label, value, and an optional note beneath.
 *
 * The value uses the font's proportional figures deliberately — `tabular-nums`
 * gives every digit the width of a zero, which makes a number like `121` look
 * gappy at this size. Tabular figures are for columns that must align
 * vertically, which is the table's job, not this one's.
 *
 * `demo` marks the tile as sample data. A tile is either real or demo; there is
 * no half-real figure, so this is the only honest place to put the badge.
 */
export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  demo,
  className,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon?: ComponentType<{ className?: string }>;
  demo?: DemoFeatureId;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-body-sm text-muted-foreground">{label}</p>
        {demo ? <DemoBadge feature={demo} /> : Icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[28px] leading-tight font-semibold text-foreground">{value}</p>
      {note ? <p className="mt-1 text-caption text-muted-foreground">{note}</p> : null}
    </div>
  );
}

/** Placeholder with the same footprint, so the grid doesn't jump on load. */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
    </div>
  );
}
