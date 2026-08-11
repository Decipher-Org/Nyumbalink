import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { TENANT_PLAN, LANDLORD_TIERS, PAYMENT_NOTE, formatKes } from "@/lib/content/pricing";
import { SectionHeading } from "./SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signupPath } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export function PricingSection() {
  return (
    <section id="pricing" className="bg-surface/60 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing. No hidden agent fees."
          subtitle="Tenants pay for a day pass when they want a landlord's contact. Landlords pay a small monthly fee to list — starting free."
        />

        <div className="mt-12 grid gap-6 sm:mt-16 lg:grid-cols-2">
          {/* Tenant day pass */}
          <div className="flex flex-col rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl font-semibold">Tenant day pass</h3>
                <p className="mt-1 text-sm text-muted-foreground">{TENANT_PLAN.blurb}</p>
              </div>
              <Badge className="bg-mint text-primary hover:bg-mint">Pay only when you call</Badge>
            </div>

            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-serif text-4xl font-semibold sm:text-5xl">
                {formatKes(TENANT_PLAN.price)}
              </span>
              <span className="text-sm text-muted-foreground">/ {TENANT_PLAN.unit}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{TENANT_PLAN.window}</p>

            <ul className="mt-6 flex-1 space-y-3">
              {TENANT_PLAN.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                  {perk}
                </li>
              ))}
            </ul>

            <Button asChild size="lg" className="mt-8 w-full">
              <Link to={signupPath("tenant")}>Start searching free</Link>
            </Button>
          </div>

          {/* Landlord tiers */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-peach">
                <Sparkles className="h-4 w-4 text-accent" strokeWidth={2.5} />
              </span>
              <div>
                <h3 className="font-serif text-xl font-semibold">Landlord plans</h3>
                <p className="text-sm text-muted-foreground">List once, manage forever.</p>
              </div>
            </div>

            <div className="grid flex-1 gap-4 sm:grid-cols-3">
              {LANDLORD_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-background p-5",
                    tier.badge ? "border-primary shadow-md" : "border-border",
                  )}
                >
                  {tier.badge && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground whitespace-nowrap">
                      {tier.badge}
                    </Badge>
                  )}
                  <h4 className="text-sm font-semibold">{tier.name}</h4>
                  <p className="mt-3 flex items-baseline gap-1">
                    <span className="font-serif text-2xl font-semibold">{formatKes(tier.price)}</span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{tier.cap}</p>
                </div>
              ))}
            </div>

            <Button asChild variant="outlineAccent" size="lg" className="w-full">
              <Link to={signupPath("landlord")}>List your first property free</Link>
            </Button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">{PAYMENT_NOTE}</p>
      </div>
    </section>
  );
}
