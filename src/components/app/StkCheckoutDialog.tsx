/**
 * The M-Pesa checkout, shared by all three things this app sells: a tenant's
 * browsing pass, a landlord's listing term, and a mid-term unit top-up.
 *
 * One component rather than three because the flow is identical and the risky
 * parts are the same everywhere — showing the amount before the prompt goes out,
 * not claiming failure when we merely stopped watching, and not implying a fresh
 * prompt when the backend reused one already in flight. `use-stk-payment` owns the
 * state machine; this renders it.
 *
 * ## A timeout ends in a button, not an instruction
 *
 * The one state with no natural resolution is `timeout`: the prompt may still be live
 * and we have stopped watching. Telling someone to go and check their history later
 * puts the work on them at the moment they are least sure what happened, so this
 * offers **Check status** instead — `stk.recheck()`, which asks the gateway directly
 * and settles the payment if it can. A success from there flows through the same
 * `onSettled` path as a normal one, so the caller's state refreshes either way.
 *
 * ## The amount shown here is the server's
 *
 * Callers pass the figure they got from a quote, and it is displayed, never
 * computed. The backend prices every initiate itself and discards a
 * client-supplied amount, so a figure derived in the browser could differ from
 * what the handset is asked for — which is exactly the surprise that gets prompts
 * cancelled.
 */

import { AlertTriangle, CheckCircle2, Clock, Loader2, Smartphone } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { PaymentInitiation } from "@/lib/api/types";
import { KE_MOBILE_RE, normalisePhone } from "@/lib/api/types";
import { formatKes } from "@/lib/format";
import { useStkPayment } from "@/lib/hooks/use-stk-payment";

export type CheckoutLine = { label: string; value: string };

export function StkCheckoutDialog({
  open,
  onOpenChange,
  title,
  description,
  amount,
  lines,
  defaultPhone,
  paymentsHref,
  initiate,
  onSettled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** In KES, from a server quote. */
  amount: number;
  /** The breakdown behind the amount — "3 units x KSh 40", "30 days", and so on. */
  lines?: CheckoutLine[];
  /** The account's verified number, prefilled. */
  defaultPhone?: string | null;
  /**
   * Where "see all your payments" points, shown alongside the status check on a
   * timeout. Omit to hide it — the tenant checkout does, because the tenant app has no
   * payment history screen and "Check status" already answers the only question that
   * matters about this one payment.
   */
  paymentsHref?: string;
  initiate: (phoneNumber: string | undefined) => Promise<PaymentInitiation>;
  /** Called once, after a payment settles as SUCCESS. Refresh state here. */
  onSettled?: () => void;
}) {
  const stk = useStkPayment();
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  /**
   * Read through a ref, the way `use-async.ts` reads its fetcher: callers pass an
   * inline `() => access.refresh()`, so the identity changes every render and a
   * direct dependency would fire the settle effect continuously.
   */
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  // Reopening after a failure should offer a fresh attempt, not the old outcome.
  // Keyed on `open` and `defaultPhone` only: `stk` is a new object every render, so
  // depending on it would re-run this on every state change the poller makes and
  // reset the run it is in the middle of. `stk.reset` itself is stable.
  useEffect(() => {
    if (open) {
      stk.reset();
      setPhone(defaultPhone ?? "");
      setPhoneError(null);
    }
  }, [open, defaultPhone, stk.reset]);

  // Fires once per settled run. `onSettled` is not a dependency on purpose —
  // callers pass an inline arrow, which would make this fire on every render.
  useEffect(() => {
    if (stk.phase === "success") onSettledRef.current?.();
  }, [stk.phase]);

  function send() {
    const trimmed = phone.trim();
    if (trimmed === "") {
      setPhoneError("Enter the M-Pesa number to charge.");
      return;
    }
    // Normalised locally purely so the label matches what gets stored; the
    // backend normalises and validates again, and its answer is the one that counts.
    const normalised = normalisePhone(trimmed);
    if (!KE_MOBILE_RE.test(normalised)) {
      setPhoneError("Enter a Kenyan mobile number, e.g. 0722 334 455.");
      return;
    }
    setPhoneError(null);
    void stk.start(() => initiate(normalised));
  }

  /**
   * A settled run must not be dismissed by an outside click before it registers, and
   * neither must a status check the user just asked for. The footer's own Close button
   * calls `onOpenChange` directly and so still works throughout — this only stops a
   * stray click or Esc from throwing away an answer that is one second away.
   */
  const dismissable = !stk.busy && !stk.rechecking;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : dismissable && onOpenChange(false))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {stk.phase === "idle" ? (
          <div className="space-y-5">
            <Summary amount={amount} lines={lines} />

            <div className="space-y-1.5">
              <Label htmlFor="stk-phone">M-Pesa number</Label>
              <div className="relative">
                <Smartphone
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="stk-phone"
                  inputMode="tel"
                  autoComplete="tel"
                  className="pl-9"
                  placeholder="0722 334 455"
                  value={phone}
                  aria-invalid={Boolean(phoneError)}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              {phoneError ? (
                <p className="text-caption text-destructive-strong">{phoneError}</p>
              ) : (
                <p className="text-caption text-muted-foreground">
                  The request goes to this number. It doesn't have to be the one on your account.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {stk.phase === "starting" ? (
          <Status icon={<Loader2 className="size-5 animate-spin" />} tone="neutral" title="Sending the request…">
            Hold on — we're asking M-Pesa to prompt {phone.trim()}.
          </Status>
        ) : null}

        {stk.phase === "polling" ? (
          <Status icon={<Smartphone className="size-5" />} tone="neutral" title="Check your phone">
            {stk.reused
              ? `A request for ${formatKes(amount)} KES is already waiting on your handset — we didn't send a second one. Enter your M-Pesa PIN to approve it.`
              : `Enter your M-Pesa PIN to approve ${formatKes(amount)} KES. This page updates by itself.`}
          </Status>
        ) : null}

        {stk.phase === "success" ? (
          <Status icon={<CheckCircle2 className="size-5" />} tone="success" title="Paid">
            {formatKes(stk.payment?.amount ?? amount)} KES received
            {stk.payment?.mpesaReceipt ? ` — receipt ${stk.payment.mpesaReceipt}` : ""}.
          </Status>
        ) : null}

        {stk.phase === "failed" ? (
          <Status icon={<AlertTriangle className="size-5" />} tone="error" title="Not completed">
            {stk.failureMessage ?? "The payment didn't go through. Nothing was charged."}
          </Status>
        ) : null}

        {stk.phase === "timeout" ? (
          <Status icon={<Clock className="size-5" />} tone="warning" title="Still processing">
            We stopped waiting, but the request may still be on your phone — and it can
            still go through after this closes. Check the status below rather than paying
            again, so you don't pay twice.
            {stk.recheckMessage ? (
              <span className="mt-2 block font-medium">{stk.recheckMessage}</span>
            ) : null}
            {paymentsHref ? (
              <span className="mt-2 block">
                <Link to={paymentsHref} className="font-medium underline">
                  Or see all your payments
                </Link>
              </span>
            ) : null}
          </Status>
        ) : null}

        <DialogFooter>
          {stk.phase === "idle" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={send}>Send M-Pesa request</Button>
            </>
          ) : null}

          {stk.busy ? (
            <Button variant="outline" disabled>
              <Loader2 className="animate-spin" />
              Waiting…
            </Button>
          ) : null}

          {stk.phase === "success" ? <Button onClick={() => onOpenChange(false)}>Done</Button> : null}

          {stk.phase === "failed" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => stk.reset()}>Try again</Button>
            </>
          ) : null}

          {stk.phase === "timeout" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => void stk.recheck()} disabled={stk.rechecking}>
                {stk.rechecking ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Checking…
                  </>
                ) : (
                  "Check status"
                )}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Summary({ amount, lines }: { amount: number; lines?: CheckoutLine[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      {lines && lines.length > 0 ? (
        <>
          <dl className="space-y-2 text-body-sm">
            {lines.map((line) => (
              <div key={line.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{line.label}</dt>
                <dd className="text-foreground tabular-nums">{line.value}</dd>
              </div>
            ))}
          </dl>
          <Separator className="my-3" />
        </>
      ) : null}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body-sm font-medium text-foreground">Total</span>
        <span className="text-h3 text-foreground tabular-nums">KSh {formatKes(amount)}</span>
      </div>
    </div>
  );
}

const TONES = {
  neutral: "border-border bg-surface text-foreground",
  success: "border-success/25 bg-success-soft text-success-strong",
  warning: "border-warning/25 bg-warning-soft text-warning-strong",
  error: "border-destructive/25 bg-destructive-soft text-destructive-strong",
} as const;

function Status({
  icon,
  tone,
  title,
  children,
}: {
  icon: ReactNode;
  tone: keyof typeof TONES;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${TONES[tone]}`}>
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-body font-semibold">{title}</p>
        <p className="mt-1 text-body-sm opacity-90">{children}</p>
      </div>
    </div>
  );
}
