/**
 * Every M-Pesa charge on this account, newest first.
 *
 * The layout is the one this screen has always had — the wide table, the card list
 * below `md`, the status pill that carries an icon as well as a colour. Only the
 * data changed: `GET /payments` instead of `DEMO_PAYMENTS`, and buttons that do
 * something instead of buttons that are disabled to stay honest.
 *
 * ## Two requests, and why the second one exists
 *
 * The table pages server-side, so all history is reachable. The three tiles cannot
 * be derived from one page of it — a "paid to date" total that changed every time
 * the landlord pressed Next would be worse than no total at all — so they come from
 * their own request for the most recent {@link SUMMARY_WINDOW} payments, which is
 * the server's ceiling on `limit`.
 *
 * That window is exact for anyone with fewer than a hundred payments, and where it
 * isn't, the tile says so rather than presenting a partial sum as a lifetime one.
 * The unconfirmed count is safe in the window regardless: a payment only sits
 * unsettled while it is recent, so it cannot fall out of the newest hundred.
 *
 * Both requests fire concurrently, which matters more than the request count here —
 * this backend answers in 1-17s and two parallel reads cost about what one does.
 *
 * ## "Check status" is the point of this screen
 *
 * M-Pesa callbacks get lost. When one does, the money has left the handset and the
 * payment is still `PENDING`, so the pass or the units it bought were never granted
 * — the worst state the system holds. `POST /payments/:id/reconcile` asks PayHero
 * directly and settles it, and it is safe to press repeatedly. This is also where
 * `StkCheckoutDialog` sends anyone whose polling timed out, so the row they came
 * looking for has to offer the fix.
 *
 * ## The receipt buttons stay disabled
 *
 * Not because downloads are unbuilt, but because there is no document to download.
 * `mpesaReceipt` is Safaricom's reference string; the receipt itself is the SMS on
 * the payer's phone. A button that generated a PDF we invented would be worse than
 * one that admits the reference is all we hold.
 */

import { Ban, Check, Clock, Download, Loader2, Receipt, RefreshCw, Smartphone, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { StatCard, StatCardSkeleton } from "@/components/app/StatCard";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, type ApiPagination } from "@/lib/api/client";
import { listPayments, reconcilePayment } from "@/lib/api/payments";
import { isTerminalPayment, PURPOSE_LABELS, type Payment, type PaymentStatus } from "@/lib/api/types";
import { formatDate, formatDateTime, formatKes } from "@/lib/format";
import { useAsync, type AsyncResult } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";

/** The server's own default. Named here so the pager and the request agree. */
const PAGE_SIZE = 20;

/** `limit` is capped at 100 server-side, so this is as wide as one read gets. */
const SUMMARY_WINDOW = 100;

export default function LandlordPayments() {
  const [page, setPage] = useState(1);

  const history = useAsync((signal) => listPayments({ page, limit: PAGE_SIZE }, signal), [page]);
  const summary = useAsync((signal) => listPayments({ limit: SUMMARY_WINDOW }, signal), []);

  const rows = history.data?.items ?? [];
  const pagination = history.data?.pagination;

  /** A settled payment changes both the row and the tiles, so both are re-read. */
  function refreshAll() {
    history.reload();
    summary.reload();
  }

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every M-Pesa charge for your listings, newest first."
        actions={
          <Button variant="outline" onClick={refreshAll} disabled={history.loading}>
            <RefreshCw className={cn(history.loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="space-y-6">
        <Summary state={summary} />

        {history.loading && rows.length === 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <RowSkeleton columns={6} />
            <RowSkeleton columns={6} />
            <RowSkeleton columns={6} />
          </div>
        ) : history.error ? (
          <ErrorState error={history.error} onRetry={history.reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payments yet"
            body="Charges appear here as soon as you subscribe a property or top up its units."
            action={
              <Button asChild>
                <Link to="/landlord/subscriptions">Go to subscriptions</Link>
              </Button>
            }
          />
        ) : (
          <>
            {/* Table from md up, cards below — the ledger is seven columns wide. */}
            <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>What for</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-36" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(payment.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {describe(payment)}
                      </TableCell>
                      <TableCell>
                        <MethodLabel payment={payment} />
                      </TableCell>
                      <TableCell className="font-mono text-caption text-muted-foreground">
                        {reference(payment)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {formatKes(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <RowAction payment={payment} onSettled={refreshAll} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="space-y-3 md:hidden">
              {rows.map((payment) => (
                <li key={payment.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-body font-semibold text-foreground">
                        {describe(payment)}
                      </p>
                      <p className="mt-0.5 text-caption text-muted-foreground">
                        {formatDateTime(payment.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-body font-semibold tabular-nums text-foreground">
                      {formatKes(payment.amount)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                    <MethodLabel payment={payment} />
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="truncate font-mono text-caption text-muted-foreground">
                      {reference(payment)}
                    </p>
                    <RowAction payment={payment} onSettled={refreshAll} />
                  </div>
                </li>
              ))}
            </ul>

            {pagination && pagination.totalPages > 1 ? (
              <nav
                aria-label="Payment history pages"
                className="flex items-center justify-between gap-3 border-t border-border pt-4"
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1 || history.loading}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <p className="text-body-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= pagination.totalPages || history.loading}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </nav>
            ) : null}
          </>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3.5">
          <Receipt aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p className="text-body-sm text-muted-foreground">
            Every charge here is an M-Pesa payment, and the receipt is the confirmation SMS
            Safaricom sent to the number that paid — the reference beside each row is the same
            code. Nothing renews automatically, so a charge only appears when you asked for one.
          </p>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------- tiles

function Summary({
  state,
}: {
  state: AsyncResult<{ items: Payment[]; pagination?: ApiPagination }>;
}) {
  if (state.loading && !state.data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  // No panel and no zeroes: the table below carries its own error, and inventing a
  // "KSh 0 paid" for a request that never answered would be a lie with a number on it.
  if (!state.data) return null;

  const items = state.data.items;
  const total = state.data.pagination?.total ?? items.length;

  const paid = items.filter((payment) => payment.status === "SUCCESS");
  const paidTotal = paid.reduce((sum, payment) => sum + payment.amount, 0);
  const unsettled = items.filter((payment) => !isTerminalPayment(payment.status)).length;
  const last = paid[0] ?? null;
  const partial = total > items.length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <StatCard
        label={partial ? "Paid, last 100 charges" : "Paid to date"}
        value={`KSh ${formatKes(paidTotal)}`}
        note={
          partial
            ? `${paid.length} of your ${total} charges`
            : `${paid.length} ${paid.length === 1 ? "payment" : "payments"}`
        }
      />
      <StatCard
        label="Last payment"
        value={last ? `KSh ${formatKes(last.amount)}` : "—"}
        note={last ? formatDate(last.createdAt) : "Nothing yet"}
      />
      <StatCard
        label="Unconfirmed"
        value={unsettled}
        note={unsettled === 0 ? "All settled" : "Use Check status on the row"}
      />
    </div>
  );
}

// -------------------------------------------------------------------- cells

/**
 * What the charge bought. `unitCount` is included where the purpose is priced per
 * unit, because it is the whole explanation of the amount — the property's title
 * would be better still, but the payment DTO carries only its id and guessing a
 * title from that is not worth a request per row.
 */
function describe(payment: Payment): string {
  const label = PURPOSE_LABELS[payment.purpose] ?? "Payment";
  if (payment.unitCount === null) return label;
  return `${label} · ${payment.unitCount} ${payment.unitCount === 1 ? "unit" : "units"}`;
}

/** Safaricom's receipt once settled, ours until then — the DTO's own distinction. */
function reference(payment: Payment): string {
  return payment.mpesaReceipt ?? payment.transactionReference ?? "—";
}

/**
 * Only M-Pesa exists. PayHero is the gateway and never appears in this column: a
 * landlord recognises the rail their money moved on, not the integration behind it.
 */
function MethodLabel({ payment }: { payment: Payment }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
      <Smartphone aria-hidden="true" className="size-4 shrink-0" />
      M-Pesa
      {payment.phoneNumber ? (
        <span className="hidden font-mono text-caption lg:inline">{payment.phoneNumber}</span>
      ) : null}
    </span>
  );
}

/**
 * Status carries an icon as well as a colour, so it survives a colourblind reader,
 * greyscale printing and forced-colours mode.
 *
 * Five states rather than the three the sample data had. The two additions are the
 * ones that matter: `QUEUED` reads as **Unconfirmed** because the prompt went out and
 * nobody has told us the outcome — not "pending", which sounds like we haven't tried.
 * And `CANCELLED` is not tinted as an error, because dismissing a prompt is a choice,
 * not a fault, and nothing was charged either way.
 */
const PAYMENT_STATUS: Record<
  PaymentStatus,
  { className: string; icon: typeof Check; label: string }
> = {
  SUCCESS: { className: "bg-success-soft text-success-strong", icon: Check, label: "Paid" },
  PENDING: { className: "bg-warning-soft text-warning-strong", icon: Clock, label: "Pending" },
  QUEUED: { className: "bg-warning-soft text-warning-strong", icon: Clock, label: "Unconfirmed" },
  FAILED: { className: "bg-destructive-soft text-destructive-strong", icon: X, label: "Failed" },
  CANCELLED: { className: "bg-muted text-muted-foreground", icon: Ban, label: "Cancelled" },
};

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { className, icon: Icon, label } = PAYMENT_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}

/**
 * One button per row, chosen by what the row can actually offer.
 *
 * Unsettled gets "Check status"; paid gets the disabled receipt button; a failed or
 * cancelled payment gets nothing at all, because there is nothing to check and
 * nothing to download — the way to act on it is to buy again from Subscriptions.
 */
function RowAction({ payment, onSettled }: { payment: Payment; onSettled: () => void }) {
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const result = await reconcilePayment(payment.id);
      if (!result.applied) {
        // Not a failure. The gateway had nothing new either, so the payment is
        // genuinely still in flight and the honest report is the backend's own —
        // it distinguishes "never reached the provider" from "not recognised yet".
        toast.warning(result.message ?? "Still awaiting confirmation from M-Pesa.");
        return;
      }
      if (result.payment.status === "SUCCESS") {
        toast.success(`Confirmed — KSh ${formatKes(result.payment.amount)} received.`);
      } else {
        // It settled unhappily, which is still news worth having: it explains a
        // listing that never went live, and nothing was charged.
        toast.error(result.message ?? "This payment did not go through.");
      }
      onSettled();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't reach M-Pesa to check this.");
    } finally {
      setChecking(false);
    }
  }

  if (!isTerminalPayment(payment.status)) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={checking}
        onClick={() => void check()}
      >
        {checking ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        Check status
      </Button>
    );
  }

  if (payment.status === "SUCCESS") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        aria-label="No receipt document exists — your M-Pesa SMS is the receipt"
      >
        <Download />
      </Button>
    );
  }

  return null;
}
