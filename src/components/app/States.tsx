import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * The three states every data screen needs besides "loaded": nothing here,
 * something broke, and still loading. Sharing them keeps a dashboard from
 * inventing its own empty copy per table, and keeps a failed fetch from
 * rendering as a blank panel that looks like success.
 */

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
          <Icon className="size-5" />
        </span>
      ) : null}
      <p className="text-h3 text-foreground">{title}</p>
      {body ? <p className="mt-1.5 max-w-sm text-body-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * A failed request. The backend's message is shown as-is when it has one — its
 * codes are written for humans ("Awaiting admin approval") and beat a generic
 * apology. A network failure gets the offline treatment instead, because the fix
 * is different.
 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const isNetwork = error instanceof ApiError && error.isNetworkError;
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Something went wrong loading this page.";

  const Icon = isNetwork ? WifiOff : AlertTriangle;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive-soft px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-card text-destructive-strong">
        <Icon className="size-5" />
      </span>
      <p className="text-h3 text-destructive-strong">
        {isNetwork ? "Can't reach the server" : "Something went wrong"}
      </p>
      <p className="mt-1.5 max-w-sm text-body-sm text-destructive-strong/85">{message}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Card-shaped placeholder, sized to the listing cards it stands in for. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

/** Row-shaped placeholder for tables, so the layout doesn't jump on load. */
export function RowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0">
      {Array.from({ length: columns }, (_, index) => (
        <div
          key={index}
          className="h-4 flex-1 animate-pulse rounded bg-muted"
          style={{ maxWidth: index === 0 ? "none" : "8rem" }}
        />
      ))}
    </div>
  );
}
