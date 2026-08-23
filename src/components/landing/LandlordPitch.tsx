import { CheckCircle2, ClipboardList, Eye, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { SectionHeading } from "./SectionHeading";
import { Button } from "@/components/ui/button";
import { LANDLORD_PRICING, formatKes } from "@/lib/content/pricing";
import { signupPath } from "@/lib/search-params";

const LANDLORD_BENEFITS = [
  {
    title: "List in minutes",
    description: "Add your property with photos, units, and rent — no paperwork, no agents.",
  },
  {
    title: "Reach serious tenants only",
    description: "Everyone who contacts you has paid for the day pass, so calls are genuine.",
  },
  {
    title: "One dashboard, all units",
    description: "Track vacancies, units, and enquiries across all your properties in one place.",
  },
  {
    title: "Pay for what you list",
    description: `KSh ${formatKes(LANDLORD_PRICING.unitPrice)} per rentable unit for ${LANDLORD_PRICING.termDays} days, per property — no tiers and no property limits.`,
  },
];

function ListingStatusCard() {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-peach">
          <ClipboardList className="h-5 w-5 text-accent" strokeWidth={2} />
        </span>
        <div>
          <p className="font-serif text-lg font-semibold">Sunrise Apartments</p>
          <p className="text-sm text-muted-foreground">Mnarani, Kilifi · 12 units</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm font-medium">Active · 3 units vacant</span>
      </div>

      <div className="mt-4 space-y-3">
        {[
          { label: "1 Bedroom · 8,500/mo", state: "3 vacant" },
          { label: "2 Bedroom · 12,000/mo", state: "0 vacant" },
        ].map((unit) => (
          <div
            key={unit.label}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm"
          >
            <span>{unit.label}</span>
            <span className="text-xs font-semibold text-emerald-600">{unit.state}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" /> 248 views this week
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5" /> 12 pass unlocks
        </span>
      </div>
    </div>
  );
}

export function LandlordPitch() {
  return (
    <section id="for-landlords" className="bg-mint py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <ListingStatusCard />
          </div>

          <div className="order-1 flex flex-col items-start gap-2 lg:order-2">
            <SectionHeading
              align="left"
              eyebrow="For landlords"
              title="Own your listings. Skip the middlemen."
              subtitle="List, track, and update your properties yourself. Rent directly to tenants who come to you — no agent commission, no call-forwarding games."
            />

            <ul className="mt-6 space-y-4">
              {LANDLORD_BENEFITS.map(({ title, description }) => (
                <li key={title} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={2} />
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Button asChild size="lg">
                <Link to={signupPath("landlord")}>List your property</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
