/**
 * What a tenant sees instead of the catalogue when they have no browsing pass.
 *
 * ## This is a sales screen, not an error
 *
 * Nothing has gone wrong here. The visitor signed up correctly, arrived where
 * they meant to, and simply hasn't bought the thing yet — so this borrows
 * `EmptyState`'s vocabulary from `components/app/States.tsx` and deliberately not
 * `ErrorState`'s. A red panel would tell someone their account is broken at the
 * exact moment we're asking them to pay us.
 *
 * It carries the weight of a first impression: `requireTenantAccess` gates the
 * whole catalogue, so for a new tenant this is the *second* screen of the product,
 * arriving before they have seen a single listing. It has to explain what the pass
 * buys rather than just demanding money for it.
 *
 * ## Every figure comes from the server
 *
 * `price` and `hours` are read from `GET /subscriptions/tenant`, never written as
 * literals. The backend prices from `PRICE_TENANT_DAILY_ACCESS`, which is `1`
 * during testing — a hard-coded "200" here would be a lie about the amount the
 * handset is about to be asked for, and the landing page is already the one place
 * allowed to state a figure statically.
 *
 * The absent case matters too: a failed check leaves `price` null, and a paywall
 * that renders "KSh null" is worse than one that admits it couldn't look it up.
 */

import { AlertTriangle, Clock, Lock, MessageCircle, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { StkCheckoutDialog } from "@/components/app/StkCheckoutDialog";
import { Button } from "@/components/ui/button";
import { buyTenantPass } from "@/lib/api/subscriptions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatKes } from "@/lib/format";
import { useTenantAccess } from "@/lib/subscriptions/TenantAccessProvider";

/** What the pass actually gets you. Kept short — this is a decision, not a brochure. */
const INCLUDED = [
  { icon: Search, label: "Every listing, unlimited searches" },
  { icon: MessageCircle, label: "Landlord phone numbers and direct chat" },
  { icon: ShieldCheck, label: "No auto-renewal — it just ends" },
] as const;

export function AccessRequired() {
  const { user } = useAuth();
  const access = useTenantAccess();
  const [open, setOpen] = useState(false);

  const price = access.price;
  const hours = access.hours;

  /**
   * The check failed, so we cannot name a price. Still worth offering the
   * purchase — the failure may have been a blip and the backend will quote the
   * real figure on the prompt regardless — but not worth inventing a number.
   */
  const priceUnknown = price === null;

  /** "24 hours", or whatever the backend is configured for. */
  const term = hours === null ? "a full day" : hours === 24 ? "24 hours" : `${hours} hours`;

  /**
   * Closing the checkout is itself a reason to re-check.
   *
   * A payment can settle after `use-stk-payment` stops watching, so someone who timed
   * out, closed the dialog and paused for a few seconds may already hold the pass this
   * screen is still asking them to buy. `onSettled` covers the case where we watched it
   * succeed; this covers the case where we didn't, and the dialog's own "Check status"
   * covers the case where they ask outright.
   *
   * Skipped once access is live, so the ordinary success path does not fetch twice —
   * which matters more than usual against a backend that answers in 1-17s.
   */
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && !access.active) void access.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Lock aria-hidden="true" className="size-6" />
        </span>

        <h1 className="mt-5 text-h2 text-foreground">Get a browsing pass to see listings</h1>
        <p className="mt-3 max-w-prose text-body text-muted-foreground">
          NyumbaLink charges tenants once per day rather than taking a commission on
          your rent. One payment opens the whole catalogue for {term} — then it
          simply stops. No subscription, no card stored.
        </p>

        {access.error ? (
          <div className="mt-6 flex w-full items-start gap-3 rounded-xl border border-warning/25 bg-warning-soft p-4 text-left text-warning-strong">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-body-sm font-semibold">We couldn't check your pass</p>
              <p className="mt-1 text-body-sm opacity-90">
                If you've already paid, this may just be a connection problem —{" "}
                <button type="button" onClick={() => void access.refresh()} className="font-medium underline">
                  try again
                </button>{" "}
                before paying a second time.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-8 w-full rounded-2xl border border-border bg-surface p-6 text-left">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-h1 text-foreground">
              {priceUnknown ? "Day pass" : `KSh ${formatKes(price)}`}
            </p>
            {priceUnknown ? null : (
              <p className="text-body-sm text-muted-foreground">
                for {term} of full access
              </p>
            )}
          </div>

          <ul className="mt-5 space-y-3">
            {INCLUDED.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3 text-body-sm text-foreground">
                <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                {label}
              </li>
            ))}
          </ul>

          <Button size="lg" className="mt-6 w-full" onClick={() => setOpen(true)}>
            Pay with M-Pesa
          </Button>

          {/*
            Stacking is worth saying out loud. Someone with two hours left who
            wants a full day would otherwise wait for the pass to lapse rather
            than lose the remainder — the backend adds to the end of the current
            term, and staying quiet about that costs us the sale.
          */}
          <p className="mt-3 flex items-start gap-2 text-caption text-muted-foreground">
            <Clock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            Buying again while a pass is still live adds to the time you have left —
            you never lose hours you've paid for.
          </p>
        </div>

        <p className="mt-8 text-body-sm text-muted-foreground">
          Your account works either way —{" "}
          <Link to="/tenant/profile" className="font-medium text-foreground underline">
            view your profile
          </Link>{" "}
          or{" "}
          <Link to="/tenant/chats" className="font-medium text-foreground underline">
            open your chats
          </Link>
          .
        </p>
      </div>

      <StkCheckoutDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Buy a browsing pass"
        description={`Unlocks every listing for ${term}.`}
        amount={price ?? 0}
        lines={[{ label: "Browsing pass", value: term }]}
        defaultPhone={user?.phoneNumber}
        initiate={(phoneNumber) => buyTenantPass({ phoneNumber })}
        onSettled={() => void access.refresh()}
      />
    </div>
  );
}
