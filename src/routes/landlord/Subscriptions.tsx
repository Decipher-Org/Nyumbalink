/**
 * What each property has paid for.
 *
 * ## Why this is a list of properties, not a list of plans
 *
 * There are no tiers. A landlord buys a 30-day term **per property**, priced at
 * `unitPrice × sum(totalUnits)` — so someone with four blocks holds four
 * independent subscriptions and can be paid up on three of them. A single "your
 * plan" panel could not express that, which is why the tier cards this screen used
 * to show were not merely fake but the wrong shape.
 *
 * ## Quote before you push
 *
 * Every purchase here fetches `GET /subscriptions/landlord/quote` and shows the
 * figure before initiating. The route comment on the backend gives the reason: an
 * unexpected 4,800 KES prompt is a cancelled push, and ten successive
 * cancellations block that phone number for 24 hours account-wide. So the extra
 * round trip buys real protection, and skipping it to save a request would cost
 * the landlord their ability to pay at all.
 *
 * The client never computes an amount. `unpaidUnits` and `topUpAmount` are
 * server-side arithmetic, and a second implementation of the pricing rule here is
 * a second thing to keep in step with `PRICE_LANDLORD_UNIT`.
 *
 * ## Lapsing hides, it does not delete
 *
 * A term running out leaves `Property.status` untouched — visibility is a read
 * filter on the tenant side, evaluated per request. Nothing is archived and no
 * cron reaps anything, so renewing restores the listing exactly as it was. The
 * copy has to say that, because "expired" otherwise reads as "gone".
 */

import { AlertTriangle, ArrowRight, CreditCard, Layers, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { StkCheckoutDialog } from "@/components/app/StkCheckoutDialog";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/app/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  buyLandlordTerm,
  buyUnitTopup,
  listLandlordSubscriptions,
  quoteLandlordTerm,
  quoteUnitTopup,
} from "@/lib/api/subscriptions";
import type { LandlordSubscriptionRow, SubscriptionQuote } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatDate, formatKes, formatTimeLeft } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";

/**
 * The five states a property can be in, in the order the landlord cares about.
 *
 * `expiresAt` is what separates "never subscribed" from "lapsed": the backend
 * returns null for a property with no subscription row and a past date for one
 * whose term ran out. Both read as `active: false`, but they need different words
 * and a different verb on the button.
 */
type RowState = "no-units" | "unpaid" | "lapsed" | "short" | "covered";

function rowStateOf(row: LandlordSubscriptionRow): RowState {
  // Quoting a property with no units is a `400 PROPERTY_HAS_NO_UNITS`, so this
  // state exists to send the landlord to the units editor instead of into a
  // refusal they can do nothing about from here.
  if (row.currentUnits <= 0) return "no-units";
  if (!row.active) return row.expiresAt ? "lapsed" : "unpaid";
  return row.unpaidUnits > 0 ? "short" : "covered";
}

export default function LandlordSubscriptions() {
  const { data, error, loading, reload } = useAsync(
    (signal) => listLandlordSubscriptions(signal),
    [],
  );

  const rows = data ?? [];
  const needsAttention = rows.filter((row) => {
    const state = rowStateOf(row);
    return state === "unpaid" || state === "lapsed" || state === "short";
  }).length;

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="One term per property, priced by the number of units it lists."
        actions={
          <Button asChild variant="outline">
            <Link to="/landlord/payments">
              <CreditCard />
              Payment history
            </Link>
          </Button>
        }
      />

      {loading && rows.length === 0 ? (
        <div className="space-y-3">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No properties yet"
          body="A subscription is bought per property, so there is nothing to pay for until you've listed one."
          action={
            <Button asChild>
              <Link to="/landlord/properties/new">
                <Plus />
                Add a property
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {needsAttention > 0 ? (
            <p className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning-soft p-4 text-body-sm text-warning-strong">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                {needsAttention === 1
                  ? "One property isn't fully covered."
                  : `${needsAttention} properties aren't fully covered.`}{" "}
                A property without an active term stays exactly as you left it — it just
                isn't shown to tenants until you renew.
              </span>
            </p>
          ) : null}

          {rows.map((row) => (
            <SubscriptionRow key={row.propertyId} row={row} onSettled={reload} />
          ))}
        </div>
      )}
    </>
  );
}

/** Copy per state, kept together so the four wordings can be read against each other. */
const STATE_COPY: Record<RowState, { badge: string; tone: "default" | "outline" | "secondary" }> = {
  "no-units": { badge: "No units", tone: "outline" },
  unpaid: { badge: "Not subscribed", tone: "outline" },
  lapsed: { badge: "Expired", tone: "outline" },
  short: { badge: "Units not covered", tone: "secondary" },
  covered: { badge: "Active", tone: "default" },
};

function SubscriptionRow({
  row,
  onSettled,
}: {
  row: LandlordSubscriptionRow;
  onSettled: () => void;
}) {
  const { user } = useAuth();
  const state = rowStateOf(row);

  /**
   * The quote, once fetched, and the checkout it opens. Held per row rather than
   * once for the screen so two rows can be worked on without one clobbering the
   * other's figure — and so the amount in the dialog provably belongs to the
   * property whose button was pressed.
   */
  const [quote, setQuote] = useState<SubscriptionQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [open, setOpen] = useState(false);

  async function fetchQuote(kind: "term" | "topup") {
    setQuoting(true);
    try {
      const next =
        kind === "term"
          ? await quoteLandlordTerm(row.propertyId)
          : await quoteUnitTopup(row.propertyId, row.unpaidUnits);
      setQuote(next);
      setOpen(true);
    } catch (err) {
      // Shown rather than swallowed: the likely causes are a property that lost its
      // units and an unset PRICE_LANDLORD_UNIT, and both are things the landlord or
      // we need to know about before a prompt is sent.
      toast.error(err instanceof ApiError ? err.message : "Couldn't work out the price.");
    } finally {
      setQuoting(false);
    }
  }

  const isTopup = quote?.purpose === "LANDLORD_UNIT_TOPUP";

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-h3 text-foreground">{row.title}</h2>
            <Badge variant={STATE_COPY[state].tone}>{STATE_COPY[state].badge}</Badge>
          </div>

          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-body-sm">
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Units listed</dt>
              <dd className="text-foreground tabular-nums">{row.currentUnits}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Units paid for</dt>
              <dd className="text-foreground tabular-nums">{row.paidUnits}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Rate</dt>
              <dd className="text-foreground tabular-nums">
                KSh {formatKes(row.unitPrice)}/unit
              </dd>
            </div>
          </dl>

          <p className="mt-2 text-body-sm text-muted-foreground">
            {state === "no-units" ? (
              <>Add the units this property rents out before subscribing — the price is
              worked out from them.</>
            ) : state === "unpaid" ? (
              <>
                Not yet shown to tenants. {row.currentUnits}{" "}
                {row.currentUnits === 1 ? "unit" : "units"} × KSh {formatKes(row.unitPrice)}{" "}
                covers it for 30 days.
              </>
            ) : state === "lapsed" ? (
              <>Expired {formatDate(row.expiresAt)}. Renew to put it back in front of tenants.</>
            ) : state === "short" ? (
              <>
                {row.unpaidUnits} {row.unpaidUnits === 1 ? "unit" : "units"} beyond what this
                term covers. Top up to keep the listing accurate.
              </>
            ) : (
              <>
                {formatTimeLeft(row.expiresAt)} — renews {formatDate(row.expiresAt)}. Nothing
                is charged automatically.
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {state === "no-units" ? (
            <Button asChild variant="outline">
              <Link to={`/landlord/properties/${row.propertyId}`}>
                Add units
                <ArrowRight />
              </Link>
            </Button>
          ) : state === "covered" ? (
            <Button variant="outline" disabled={quoting} onClick={() => void fetchQuote("term")}>
              {quoting ? <Loader2 className="animate-spin" /> : null}
              Extend 30 days
            </Button>
          ) : (
            <Button
              disabled={quoting}
              onClick={() => void fetchQuote(state === "short" ? "topup" : "term")}
            >
              {quoting ? <Loader2 className="animate-spin" /> : null}
              {state === "short"
                ? `Top up ${row.unpaidUnits} ${row.unpaidUnits === 1 ? "unit" : "units"}`
                : state === "lapsed"
                  ? "Renew"
                  : "Subscribe"}
            </Button>
          )}
        </div>
      </div>

      {quote ? (
        <StkCheckoutDialog
          open={open}
          onOpenChange={setOpen}
          title={isTopup ? "Top up units" : "Pay for 30 days"}
          description={row.title}
          amount={quote.amount}
          lines={[
            {
              label: isTopup ? "Extra units" : "Units",
              value: `${quote.unitCount} × KSh ${formatKes(quote.unitPrice)}`,
            },
            {
              label: "Term",
              // A top-up has no term of its own — it buys capacity inside the one
              // already running, and saying "30 days" here would imply otherwise.
              value: quote.termDays === null ? "Rest of current term" : `${quote.termDays} days`,
            },
          ]}
          defaultPhone={user?.phoneNumber}
          paymentsHref="/landlord/payments"
          initiate={(phoneNumber) =>
            isTopup
              ? buyUnitTopup(row.propertyId, quote.unitCount, { phoneNumber })
              : buyLandlordTerm(row.propertyId, { phoneNumber })
          }
          onSettled={onSettled}
        />
      ) : null}
    </section>
  );
}
