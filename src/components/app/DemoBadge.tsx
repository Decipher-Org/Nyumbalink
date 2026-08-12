import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DEMO_FEATURES, type DemoFeatureId } from "@/lib/demo/registry";

/**
 * Marks a value or surface as sample data rather than something the backend
 * stores. Every screen that reads from `lib/demo/` carries one of these — see
 * `lib/demo/registry.ts` for why.
 */
export function DemoBadge({
  feature,
  className,
  showLabel = false,
}: {
  feature: DemoFeatureId;
  className?: string;
  /** Adds the feature name; useful in a panel header, noisy inside a stat card. */
  showLabel?: boolean;
}) {
  const { label, milestone, note } = DEMO_FEATURES[feature];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex cursor-help items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-caption font-medium text-warning-strong",
            className,
          )}
        >
          <Info aria-hidden="true" className="size-3" />
          {showLabel ? `${label} · demo` : "Demo"}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-medium">{label} — sample data</p>
        <p className="mt-1 text-caption opacity-90">{note}</p>
        <p className="mt-1 text-caption opacity-75">Arrives with: {milestone}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The panel-level version: a full-width strip above a demo surface, for when a
 * whole screen (Payments, Notifications) is sample data and a small badge would
 * be too easy to miss.
 */
export function DemoNotice({
  feature,
  className,
}: {
  feature: DemoFeatureId;
  className?: string;
}) {
  const { label, milestone, note } = DEMO_FEATURES[feature];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3",
        className,
      )}
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning-strong" />
      <div className="text-body-sm text-warning-strong">
        <p className="font-semibold">{label} is a preview</p>
        <p className="mt-0.5 opacity-90">
          {note} <span className="whitespace-nowrap">(Arrives with: {milestone}.)</span>
        </p>
      </div>
    </div>
  );
}
