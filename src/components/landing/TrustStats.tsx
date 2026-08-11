import { Building2, MapPin, Users, ShieldCheck, type LucideIcon } from "lucide-react";
import { TRUST_STATS, TESTIMONIALS, type Stat } from "@/lib/content/stats";
import { SectionHeading } from "./SectionHeading";

/** Keyed by Stat["icon"] so reordering the stats can't mismatch the icons. */
const STAT_ICONS: Record<Stat["icon"], LucideIcon> = {
  home: Building2,
  pin: MapPin,
  users: Users,
  shield: ShieldCheck,
};

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5 text-amber-400" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 0 0 .95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 0 0-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 0 0-1.175 0l-3.367 2.446c-.783.57-1.838-.196-1.538-1.118l1.286-3.957a1 1 0 0 0-.363-1.118L2.064 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 0 0 .951-.69l1.285-3.958Z" />
        </svg>
      ))}
    </div>
  );
}

export function TrustStats() {
  return (
    <section id="trust" className="bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why NyumbaLink"
          title="Trusted by tenants and landlords across Kenya"
          subtitle="No agents, no surprises. Every listing is verified, every contact is direct."
        />

        <dl className="mt-12 grid grid-cols-2 gap-4 sm:mt-16 lg:grid-cols-4">
          {TRUST_STATS.map(({ value, label, icon }) => {
            const Icon = STAT_ICONS[icon];
            return (
              <div
                key={label}
                className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-8 text-center"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mint text-primary">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <dd className="font-serif text-3xl font-semibold sm:text-4xl">{value}</dd>
                <dt className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</dt>
              </div>
            );
          })}
        </dl>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {TESTIMONIALS.map(({ quote, name, role }) => (
            <figure
              key={name}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-peach/60 p-6 sm:p-8"
            >
              <div>
                <Stars />
                <blockquote className="mt-4 font-serif text-lg leading-relaxed sm:text-xl">
                  “{quote}”
                </blockquote>
              </div>
              <figcaption>
                <p className="font-medium">{name}</p>
                <p className="text-sm text-muted-foreground">{role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
