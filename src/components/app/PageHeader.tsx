import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The heading block every dashboard screen opens with. Uses the design sheet's
 * H1 (28/700) rather than Tailwind's display sizes, and stacks its actions below
 * the title on narrow screens so a long title never squeezes the buttons.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-h1 text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
