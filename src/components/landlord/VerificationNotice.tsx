import { BadgeCheck, Clock, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils";

/**
 * Where a landlord stands with the backend's two gates on property writes.
 *
 * Both are server-side and unavoidable:
 *
 *  - no `LandlordProfile` -> `403 LANDLORD_PROFILE_NOT_FOUND`
 *  - a profile with `verified: false` -> `403 LANDLORD_NOT_VERIFIED`
 *
 * Approval is an admin decision made in a different application, so there is
 * nothing the landlord can do to hurry it — which is exactly why the waiting
 * state has to say so plainly instead of offering a button that 403s.
 */
export type LandlordGate = "onboarding" | "awaiting-approval" | "approved";

export function useLandlordGate(): LandlordGate {
  const { landlordProfile } = useAuth();
  if (!landlordProfile) return "onboarding";
  return landlordProfile.verified ? "approved" : "awaiting-approval";
}

/**
 * The banner for whichever gate is closed. Renders nothing once approved, so a
 * screen can mount it unconditionally at the top of its content.
 */
export function VerificationNotice({ className }: { className?: string }) {
  const gate = useLandlordGate();

  if (gate === "approved") return null;

  if (gate === "onboarding") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-info/30 bg-info-soft px-4 py-3.5 sm:flex-row sm:items-center",
          className,
        )}
      >
        <UserPlus aria-hidden="true" className="size-5 shrink-0 text-info-strong" />
        <div className="min-w-0 flex-1 text-body-sm text-info-strong">
          <p className="font-semibold">Finish setting up your landlord account</p>
          <p className="mt-0.5 opacity-90">
            We need your ID and M-Pesa details before you can list a property.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/landlord/onboarding">Complete setup</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3.5",
        className,
      )}
    >
      <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning-strong" />
      <div className="min-w-0 text-body-sm text-warning-strong">
        <p className="font-semibold">Your account is awaiting approval</p>
        <p className="mt-0.5 opacity-90">
          Our team reviews new landlord accounts before listings go live. You can look around in
          the meantime — you'll be able to add a property as soon as you're approved.
        </p>
      </div>
    </div>
  );
}

/** The approved counterpart, for the profile screen where the state is the point. */
export function ApprovedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-0.5 text-caption font-semibold text-success-strong",
        className,
      )}
    >
      <BadgeCheck aria-hidden="true" className="size-3.5" />
      Approved
    </span>
  );
}
