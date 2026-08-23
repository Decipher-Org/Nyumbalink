import { Search, Unlock, MessageCircle, type LucideIcon } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { TENANT_PASS, formatKes } from "@/lib/content/pricing";
import { cn } from "@/lib/utils";

type Step = {
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

/**
 * The pass comes first, because that is the actual order.
 *
 * These steps used to read Find → Unlock → Connect, opening with "no account needed
 * to explore". That was never true — every property route is `requireAuth`, so an
 * anonymous search has nothing to answer it — and since the pass gates the catalogue
 * itself rather than the phone numbers, the sequence was inverted as well. Promising
 * a browse that the router then refuses is the worst possible first impression, so
 * the honest order is the one described here.
 */
const STEPS: Step[] = [
  {
    step: "01",
    title: "Get a pass",
    description: `Create an account for free, then buy a day pass — KSh ${formatKes(TENANT_PASS.price)} by M-Pesa opens every listing for 24 hours. Nothing renews, so there is nothing to cancel.`,
    icon: Unlock,
  },
  {
    step: "02",
    title: "Find",
    description:
      "Search homes by town and budget, compare photos, rent and unit details, and shortlist the ones you like — as many searches as you want while your pass runs.",
    icon: Search,
  },
  {
    step: "03",
    title: "Connect",
    description:
      "Call or message the landlord straight from the listing, view the home in person, and move in. You stay in control of the relationship.",
    icon: MessageCircle,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="Find. Unlock. Connect."
          subtitle="Looking for a home shouldn't cost you a broker's fee. NyumbaLink keeps it simple — three steps, zero middlemen."
        />

        <div className="mt-12 grid gap-6 sm:mt-16 sm:grid-cols-3">
          {STEPS.map(({ step, title, description, icon: Icon }, index) => (
            <div
              key={step}
              className={cn(
                "relative rounded-2xl border border-border bg-surface p-6 sm:p-8",
                index === 1 && "sm:-translate-y-3",
              )}
            >
              <span className="absolute top-6 right-6 font-serif text-4xl font-semibold text-primary/15">
                {step}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint text-primary">
                <Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <h3 className="mt-6 font-serif text-2xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
