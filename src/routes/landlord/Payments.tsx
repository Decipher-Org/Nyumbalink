import { Check, Clock, CreditCard, Download, Receipt, Smartphone, X } from "lucide-react";
import { useMemo } from "react";

import { DemoNotice } from "@/components/app/DemoBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_PAYMENTS, type DemoPayment } from "@/lib/demo/landlord";
import { formatDate, formatKes } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Payment history — entirely sample data.
 *
 * M-Pesa and card payments are Milestone 4; there is no transaction table behind
 * this. The receipt buttons are inert for the same reason as the plan buttons on
 * Subscriptions: a download that produced nothing would be worse than one that
 * says it isn't ready.
 */
export default function LandlordPayments() {
  const summary = useMemo(() => {
    const paid = DEMO_PAYMENTS.filter((payment) => payment.status === "Paid");
    return {
      paidTotal: paid.reduce((sum, payment) => sum + payment.amount, 0),
      paidCount: paid.length,
      failed: DEMO_PAYMENTS.filter((payment) => payment.status === "Failed").length,
      last: paid[0],
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Payments"
        description="Receipts for plans and featured listings, once billing is switched on."
      />

      <DemoNotice feature="payments" className="mb-6" />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatCard
            label="Paid to date"
            value={formatKes(summary.paidTotal)}
            note={`${summary.paidCount} ${summary.paidCount === 1 ? "payment" : "payments"}`}
            demo="payments"
          />
          <StatCard
            label="Last payment"
            value={summary.last ? formatKes(summary.last.amount) : "—"}
            note={summary.last ? formatDate(summary.last.date) : "Nothing yet"}
            demo="payments"
          />
          <StatCard
            label="Failed"
            value={summary.failed}
            note={summary.failed === 0 ? "All good" : "Needs another attempt"}
            demo="payments"
          />
        </div>

        {/* Table from md up, cards below — the reference table is six columns wide. */}
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
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEMO_PAYMENTS.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(payment.date)}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {payment.description}
                  </TableCell>
                  <TableCell>
                    <MethodLabel method={payment.method} />
                  </TableCell>
                  <TableCell className="font-mono text-caption text-muted-foreground">
                    {payment.reference}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-foreground">
                    {formatKes(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <PaymentStatus status={payment.status} />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled
                      aria-label={`Receipt for ${payment.description} (not available yet)`}
                    >
                      <Download />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <ul className="space-y-3 md:hidden">
          {DEMO_PAYMENTS.map((payment) => (
            <li key={payment.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body font-semibold text-foreground">{payment.description}</p>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    {formatDate(payment.date)}
                  </p>
                </div>
                <p className="shrink-0 text-body font-semibold tabular-nums text-foreground">
                  {formatKes(payment.amount)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                <MethodLabel method={payment.method} />
                <PaymentStatus status={payment.status} />
              </div>
              <p className="mt-2 font-mono text-caption text-muted-foreground">
                {payment.reference}
              </p>
            </li>
          ))}
        </ul>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3.5">
          <Receipt aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p className="text-body-sm text-muted-foreground">
            When payments go live you'll pay by M-Pesa using the number on your profile, and every
            receipt will be downloadable from here.
          </p>
        </div>
      </div>
    </>
  );
}

function MethodLabel({ method }: { method: DemoPayment["method"] }) {
  const Icon = method === "M-Pesa" ? Smartphone : CreditCard;
  return (
    <span className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {method}
    </span>
  );
}

/**
 * Status carries an icon as well as a colour, so it survives a colourblind reader,
 * greyscale printing and forced-colours mode.
 */
const PAYMENT_STATUS: Record<
  DemoPayment["status"],
  { className: string; icon: typeof Check; label: string }
> = {
  Paid: { className: "bg-success-soft text-success-strong", icon: Check, label: "Paid" },
  Pending: { className: "bg-warning-soft text-warning-strong", icon: Clock, label: "Pending" },
  Failed: { className: "bg-destructive-soft text-destructive-strong", icon: X, label: "Failed" },
};

function PaymentStatus({ status }: { status: DemoPayment["status"] }) {
  const { className, icon: Icon, label } = PAYMENT_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}
