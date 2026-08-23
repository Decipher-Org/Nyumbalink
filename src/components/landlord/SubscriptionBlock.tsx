/**
 * The two subscription refusals that can stop a landlord mid-edit, and the way out
 * of each.
 *
 * `assertCapacity` and `assertPublishable` guard unit writes and the DRAFT→ACTIVE
 * transition, so a landlord raising "Bedsitter" from 10 to 15 units, or publishing
 * a finished listing, can be refused with:
 *
 *   - `403 SUBSCRIPTION_UNITS_EXCEEDED` — the term is live but covers fewer units
 *     than the change would list. Fixed by a top-up.
 *   - `403 LANDLORD_SUBSCRIPTION_REQUIRED` — there is no live term at all. Fixed by
 *     buying one.
 *
 * ## Why this exists rather than a toast
 *
 * A toast saying "top up 5 units for 200 KES first" leaves the landlord on a save
 * button that refuses, with the fix on a screen they have to go and find — and
 * having lost the edit they were making. Offering the payment right here means the
 * refusal is a step in the flow instead of a dead end. That is the whole reason the
 * backend puts numbers in `details` rather than only in the message.
 *
 * ## The arithmetic is the server's
 *
 * A units-exceeded refusal already carries `additionalUnits` and `topUpAmount`
 * computed against the subscription's own locked-in `unitPrice`, so this shows those
 * figures directly and does not re-derive them. Recomputing `units × 40` in the
 * client would quietly disagree with a term bought at a different rate.
 *
 * Only the no-subscription case needs a quote fetched, because there is no
 * subscription to read a price from yet.
 */

import { AlertTriangle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { StkCheckoutDialog } from "@/components/app/StkCheckoutDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import {
  buyLandlordTerm,
  buyUnitTopup,
  quoteLandlordTerm,
} from "@/lib/api/subscriptions";
import type { SubscriptionQuote, UnitsExceededDetails } from "@/lib/api/types";
import { unitsExceededFrom } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatKes } from "@/lib/format";

export type SubscriptionBlock =
  | { kind: "units"; propertyId: string; message: string; details: UnitsExceededDetails }
  | { kind: "term"; propertyId: string; message: string };

/**
 * Catch the two subscription refusals and leave everything else alone.
 *
 * `capture` returns `true` when it recognised the error and has taken
 * responsibility for showing it, so a caller's `catch` reads:
 *
 *     if (!capture(err, propertyId)) toast.error(…)
 *
 * — the existing error handling stays exactly as it was for every other failure.
 */
export function useSubscriptionBlock() {
  const [block, setBlock] = useState<SubscriptionBlock | null>(null);

  const capture = useCallback((err: unknown, propertyId: string): boolean => {
    if (!(err instanceof ApiError) || err.status !== 403) return false;

    if (err.code === "SUBSCRIPTION_UNITS_EXCEEDED") {
      const details = unitsExceededFrom(err.details);
      // Without the numbers there is nothing to offer, so let the caller's own
      // handling show the message rather than opening an empty dialog.
      if (!details) return false;
      setBlock({ kind: "units", propertyId, message: err.message, details });
      return true;
    }

    if (err.code === "LANDLORD_SUBSCRIPTION_REQUIRED") {
      setBlock({ kind: "term", propertyId, message: err.message });
      return true;
    }

    return false;
  }, []);

  const clear = useCallback(() => setBlock(null), []);

  return { block, capture, clear };
}

export function SubscriptionBlockDialog({
  block,
  onClose,
  onResolved,
}: {
  block: SubscriptionBlock | null;
  onClose: () => void;
  /**
   * Fired once the payment settles. Callers retry the write that was refused —
   * the landlord asked for it before being interrupted, and making them press
   * save again is a second chance to lose the edit.
   */
  onResolved: () => void;
}) {
  const { user } = useAuth();
  const [checkout, setCheckout] = useState(false);

  /** Only needed for the no-subscription case; a top-up's price is in the error. */
  const [quote, setQuote] = useState<SubscriptionQuote | null>(null);
  const [quoteError, setQuoteError] = useState<unknown>(null);

  const needsQuote = block?.kind === "term";
  const propertyId = block?.propertyId;

  useEffect(() => {
    if (!needsQuote || !propertyId) return;

    let cancelled = false;
    setQuote(null);
    setQuoteError(null);

    void (async () => {
      try {
        const next = await quoteLandlordTerm(propertyId);
        if (!cancelled) setQuote(next);
      } catch (err) {
        if (!cancelled) setQuoteError(err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [needsQuote, propertyId]);

  if (!block) return null;

  const amount = block.kind === "units" ? block.details.topUpAmount : quote?.amount ?? 0;
  const units = block.kind === "units" ? block.details.additionalUnits : quote?.unitCount ?? 0;

  // A quote that failed to load leaves nothing honest to put on the button.
  const ready = block.kind === "units" || quote !== null;

  return (
    <>
      <Dialog open={!checkout} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {block.kind === "units" ? "A few units aren't covered" : "This property needs a subscription"}
            </DialogTitle>
            <DialogDescription>{block.message}</DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border bg-surface p-4">
            {block.kind === "units" ? (
              <dl className="space-y-2 text-body-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Units after this change</dt>
                  <dd className="text-foreground tabular-nums">{block.details.requestedUnits}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Covered by this term</dt>
                  <dd className="text-foreground tabular-nums">{block.details.paidUnits}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-medium text-foreground">
                    Top up {units} {units === 1 ? "unit" : "units"}
                  </dt>
                  <dd className="font-semibold text-foreground tabular-nums">
                    KSh {formatKes(amount)}
                  </dd>
                </div>
              </dl>
            ) : quoteError ? (
              <p className="flex items-start gap-2 text-body-sm text-destructive-strong">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {quoteError instanceof ApiError
                  ? quoteError.message
                  : "Couldn't work out what this would cost."}
              </p>
            ) : quote === null ? (
              <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Working out the price…
              </p>
            ) : (
              <dl className="space-y-2 text-body-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {quote.unitCount} {quote.unitCount === 1 ? "unit" : "units"} × KSh{" "}
                    {formatKes(quote.unitPrice)}
                  </dt>
                  <dd className="text-foreground tabular-nums">KSh {formatKes(quote.amount)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Term</dt>
                  <dd className="text-foreground tabular-nums">{quote.termDays ?? 30} days</dd>
                </div>
              </dl>
            )}
          </div>

          <p className="text-caption text-muted-foreground">
            {block.kind === "units"
              ? "A top-up adds capacity to the term already running — the expiry date doesn't change."
              : "Nothing you've entered is lost. We'll finish saving as soon as this goes through."}
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Not now
            </Button>
            <Button disabled={!ready} onClick={() => setCheckout(true)}>
              Pay KSh {formatKes(amount)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StkCheckoutDialog
        open={checkout}
        onOpenChange={(open) => {
          setCheckout(open);
          // Closing the checkout closes the whole flow: the refusal it was
          // answering is either resolved or still standing, and reopening the
          // explanation behind it would just be a second dialog to dismiss.
          if (!open) onClose();
        }}
        title={block.kind === "units" ? "Top up units" : "Pay for 30 days"}
        amount={amount}
        lines={[
          {
            label: block.kind === "units" ? "Extra units" : "Units",
            value:
              block.kind === "units"
                ? String(units)
                : `${quote?.unitCount ?? 0} × KSh ${formatKes(quote?.unitPrice ?? 0)}`,
          },
        ]}
        defaultPhone={user?.phoneNumber}
        paymentsHref="/landlord/payments"
        initiate={(phoneNumber) =>
          block.kind === "units"
            ? buyUnitTopup(block.propertyId, units, { phoneNumber })
            : buyLandlordTerm(block.propertyId, { phoneNumber })
        }
        onSettled={onResolved}
      />
    </>
  );
}
