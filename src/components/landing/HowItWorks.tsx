import { Search, Unlock, MessageCircle, type LucideIcon } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { cn } from "@/lib/utils";

type Step = {
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const STEPS: Step[] = [
  {
    step: "01",
    title: "Find",
    description:
      "Search homes by county and budget, compare photos and details, and shortlist the ones you like — no account needed to explore.",
    icon: Search,
  },
  {
    step: "02",
    title: "Unlock",
    description:
      "Buy a day pass to unlock the landlord's direct contact details. One payment, 24 hours of access, no agent in the middle.",
    icon: Unlock,
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
