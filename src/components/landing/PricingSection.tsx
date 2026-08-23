import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { TENANT_PASS, LANDLORD_PRICING, PAYMENT_NOTE, formatKes } from "@/lib/content/pricing";
import { SectionHeading } from "./SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signupPath } from "@/lib/search-params";

/**
 * Two cards, because there are exactly two things to buy.
 *
 * The landlord side used to be three tier cards with property caps. It is now one
 * card with a worked example, and the example is the important part: "KSh 40 per
 * unit" reads as the whole bill until it is multiplied out, and a landlord who
 * expects 40 and meets a 480 KES prompt cancels it. Ten cancellations in a row and
 * Safaricom blocks that number for a day, so a misread price here has a cost.
 *
 * Neither call to action promises anything free that isn't. Creating an account and
 * drafting a property genuinely are — browsing and publishing are not, and the old
 * "Start searching free" / "List your first property free" both claimed otherwise.
 */
export function PricingSection() {
  const { unitPrice, termDays, example } = LANDLORD_PRICING;
  const exampleTotal = example.units * unitPrice;

  return (
    <section id="pricing" className="bg-surface/60 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing. No hidden agent fees."
          subtitle="Tenants buy a day pass to browse listings. Landlords pay per unit for a 30-day term on each property. Nothing renews automatically."
        />

        <div className="mt-12 grid items-stretch gap-6 sm:mt-16 lg:grid-cols-2">
          {/* Tenant day pass */}
          <div className="flex flex-col rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl font-semibold">Tenant day pass</h3>
                <p className="mt-1 text-sm text-muted-foreground">{TENANT_PASS.blurb}</p>
              </div>
              <Badge className="bg-mint text-primary hover:bg-mint whitespace-nowrap">
                One payment
              </Badge>
            </div>

            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-serif text-4xl font-semibold sm:text-5xl">
                KSh {formatKes(TENANT_PASS.price)}
              </span>
              <span className="text-sm text-muted-foreground">/ {TENANT_PASS.unit}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{TENANT_PASS.window}</p>

            <ul className="mt-6 flex-1 space-y-3">
              {TENANT_PASS.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                  {perk}
                </li>
              ))}
            </ul>

            <Button asChild size="lg" className="mt-8 w-full">
              <Link to={signupPath("tenant")}>Sign up free</Link>
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              The account costs nothing. Buy a pass when you're ready to look.
            </p>
          </div>

          {/* Landlord term — priced per unit, per property */}
          <div className="flex flex-col rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-peach">
                  <Sparkles className="h-4 w-4 text-accent" strokeWidth={2.5} />
                </span>
                <div>
                  <h3 className="font-serif text-2xl font-semibold">Landlord listing</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pay for the units you actually rent out — no tiers, no property limits.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-serif text-4xl font-semibold sm:text-5xl">
                KSh {formatKes(unitPrice)}
              </span>
              <span className="text-sm text-muted-foreground">per unit / month</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {termDays}-day term, bought per property
            </p>

            {/* The worked example. A per-unit price is not readable without it. */}
            <div className="mt-6 flex-1 rounded-xl border border-border bg-surface/70 p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Example
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                A property with{" "}
                <span className="font-semibold text-foreground">{example.units} units</span> ×{" "}
                <span className="font-semibold text-foreground">KSh {formatKes(unitPrice)}</span>
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold">
                = KSh {formatKes(exampleTotal)}{" "}
                <span className="font-sans text-sm font-normal text-muted-foreground">
                  / month
                </span>
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                We show you the exact figure before the M-Pesa prompt goes out, every time.
              </p>
            </div>

            <Button asChild variant="outlineAccent" size="lg" className="mt-8 w-full">
              <Link to={signupPath("landlord")}>Add your first property</Link>
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Set it up and add units for free. You pay when you publish it.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">{PAYMENT_NOTE}</p>
      </div>
    </section>
  );
}
