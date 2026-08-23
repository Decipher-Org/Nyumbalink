import { ArrowRight, Building2, Check, Search, type LucideIcon } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { LANDLORD_PRICING, TENANT_PASS, formatKes } from "@/lib/content/pricing";
import { parseRoleParam, type SignupRole } from "@/lib/roles";
import { loginPath, safeNextPath } from "@/lib/search-params";
import { cn } from "@/lib/utils";

type RoleOption = {
  role: SignupRole;
  title: string;
  description: string;
  points: string[];
  icon: LucideIcon;
};

/**
 * Both cards quote a price, so both interpolate from `lib/content/pricing.ts`.
 *
 * The tenant bullet read "KES 20 day pass" and the landlord one "Free to start" —
 * a price that was never charged and a claim that stopped being true when M5 shipped
 * (publishing a property costs its unit count). This is the screen where someone
 * decides which account to open, so the numbers on it have to be the ones they will
 * actually meet.
 */
const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "TENANT",
    title: "I'm looking for a home",
    description: "Search verified listings and contact landlords directly.",
    points: [
      "Browse homes across 40+ towns",
      `KSh ${formatKes(TENANT_PASS.price)} day pass`,
      "No agent fees",
    ],
    icon: Search,
  },
  {
    role: "LANDLORD",
    title: "I have property to rent out",
    description: "List your properties and reach tenants without a middleman.",
    points: [
      "List properties and units",
      "Track vacancies",
      `KSh ${formatKes(LANDLORD_PRICING.unitPrice)} per unit, ${LANDLORD_PRICING.termDays} days`,
    ],
    icon: Building2,
  },
];

/**
 * Role gate — the only entry point to account creation.
 *
 * The backend defaults an unspecified role to TENANT without erroring
 * (`propertyHubBackend/src/auth/index.js`), so a landlord who reached a signup
 * form without choosing would be silently created as a tenant and could never
 * list a property. Nothing here preselects on the visitor's behalf: an absent
 * or unrecognised `?role=` leaves both cards unselected and the Continue button
 * disabled.
 */
export default function ChooseRole() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Intent from the hero / "List your property" CTAs preselects a card, but
  // stays visible and changeable rather than being applied silently.
  const roleFromUrl = parseRoleParam(searchParams.get("role"));
  // Dropped here rather than only where it is navigated to, so an off-site value
  // never survives long enough to be forwarded down the signup chain.
  const next = safeNextPath(searchParams.get("next"));

  function choose(role: SignupRole) {
    const params = new URLSearchParams({ role: role.toLowerCase() });
    if (next) params.set("next", next);
    // `replace` keeps the chooser out of history, so Back returns to the
    // landing page rather than cycling through each card the visitor tried.
    navigate(`/signup?${params.toString()}`, { replace: true });
  }

  function continueToDetails() {
    if (!roleFromUrl) return;
    const params = new URLSearchParams({ role: roleFromUrl.toLowerCase() });
    if (next) params.set("next", next);
    navigate(`/signup/details?${params.toString()}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="NyumbaLink home">
            <Logo />
          </Link>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to={loginPath(next ?? undefined)}
              className="font-medium text-primary underline underline-offset-4 hover:text-accent"
            >
              Log in
            </Link>
          </p>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
        <div className="w-full max-w-4xl">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
              First, tell us who you are
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              This decides what your account can do, so pick the one that fits. You can't change it
              later without contacting support.
            </p>
          </div>

          <fieldset className="mt-10">
            <legend className="sr-only">Account type</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {ROLE_OPTIONS.map(({ role, title, description, points, icon: Icon }) => {
                const selected = roleFromUrl === role;
                return (
                  <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => choose(role)}
                    className={cn(
                      "group relative flex flex-col rounded-2xl border-2 p-6 text-left transition-all",
                      "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                      selected
                        ? "border-primary bg-mint shadow-md"
                        : "border-border bg-surface hover:border-primary/40 hover:shadow-sm",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-5 right-5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background",
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>

                    <span
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                        selected ? "bg-primary text-primary-foreground" : "bg-mint text-primary",
                      )}
                    >
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </span>

                    <span className="mt-5 font-serif text-xl font-semibold">{title}</span>
                    <span className="mt-1.5 text-sm text-muted-foreground">{description}</span>

                    <ul className="mt-4 space-y-2">
                      {points.map((point) => (
                        <li
                          key={point}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="w-full sm:w-auto sm:min-w-64"
              disabled={!roleFromUrl}
              onClick={continueToDetails}
            >
              Continue
              <ArrowRight />
            </Button>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {roleFromUrl
                ? "You can change this before creating your account."
                : "Select an option to continue."}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
