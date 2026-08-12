import { Check, CreditCard, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { DemoNotice } from "@/components/app/DemoBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DEMO_PLANS, type DemoPlan } from "@/lib/demo/landlord";
import { formatKes } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Plans — entirely sample data.
 *
 * Nothing here is charged and no listing is gated by a plan: subscriptions are
 * Milestone 5. The buttons are therefore inert rather than wired to a checkout
 * that doesn't exist, and the property limits are labelled as not enforced. The
 * screen exists so the shape of the paid tiers is visible and reviewable before
 * the billing work starts.
 */
export default function LandlordSubscriptions() {
  const current = DEMO_PLANS.find((plan) => plan.current);

  return (
    <>
      <PageHeader
        title="Plans"
        description="What each tier includes. Nothing is charged yet, and no limit is enforced."
      />

      <DemoNotice feature="subscriptions" className="mb-6" />

      <div className="space-y-6">
        {current ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Sparkles aria-hidden="true" className="size-5 text-primary" />
                </span>
                <div>
                  <p className="text-caption text-muted-foreground">Your plan</p>
                  <p className="text-h3 text-foreground">{current.name}</p>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    {formatKes(current.price)} {current.cadence} · {current.propertyLimit}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link to="/landlord/payments">
                  <CreditCard />
                  Payment history
                </Link>
              </Button>
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          {DEMO_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        <p className="text-body-sm text-muted-foreground">
          Listing a property is free while we're getting started in Kilifi. When plans go live,
          you'll be told what changes before anything is charged.
        </p>
      </div>
    </>
  );
}

function PlanCard({ plan }: { plan: DemoPlan }) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-xl border bg-card p-5",
        plan.current ? "border-primary ring-1 ring-primary" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-h3 text-foreground">{plan.name}</h2>
        {plan.current ? (
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-caption font-semibold text-primary">
            Current
          </span>
        ) : plan.recommended ? (
          <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-caption font-semibold text-accent-strong">
            Popular
          </span>
        ) : null}
      </div>

      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-h1 text-foreground tabular-nums">{formatKes(plan.price)}</span>
        <span className="text-body-sm text-muted-foreground">{plan.cadence}</span>
      </p>
      <p className="mt-1 text-body-sm text-muted-foreground">{plan.propertyLimit}</p>

      <Separator className="my-4" />

      <ul className="flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-body-sm text-foreground">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success-strong" />
            {feature}
          </li>
        ))}
      </ul>

      {/* Inert on purpose — there is no checkout to send anyone to. */}
      <Button
        type="button"
        disabled
        variant={plan.current ? "outline" : "default"}
        className="mt-5 w-full"
      >
        {plan.current ? "Your current plan" : "Not available yet"}
      </Button>
    </section>
  );
}
