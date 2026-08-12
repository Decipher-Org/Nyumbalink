import { BadgeCheck, IdCard, Info, Loader2, Store } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { createLandlordProfile } from "@/lib/api/profiles";
import { E164_RE, NATIONAL_ID_RE, normalisePhone, PROFILE_LIMITS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

/**
 * Landlord onboarding: creating the `LandlordProfile` the account doesn't have
 * yet.
 *
 * This is a separate step from registering because it is a separate record — a
 * `User` exists after sign-up, and `POST /landlords/profile` creates the profile
 * that every property write is checked against. Until it exists, the whole
 * dashboard 403s on writes.
 *
 * Approval is the second gate and is nobody's decision here: an admin flips
 * `verified` in a different application. So this screen promises a review, not
 * an outcome.
 */
export default function LandlordOnboarding() {
  const { landlordProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [nationalId, setNationalId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [mpesaNumber, setMpesaNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Already onboarded: this screen has nothing left to do.
  if (landlordProfile) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success-soft text-success-strong">
            <BadgeCheck className="size-6" />
          </span>
          <h1 className="text-h2 text-foreground">Your details are in</h1>
          <p className="mt-2 text-body-sm text-muted-foreground">
            {landlordProfile.verified
              ? "Your account is approved — you can list properties now."
              : "Our team is reviewing your account. You'll be able to list properties once that's done."}
          </p>
          <Button className="mt-6" onClick={() => navigate("/landlord")}>
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    const id = nationalId.trim();

    if (!NATIONAL_ID_RE.test(id)) {
      found.nationalId = "6–20 letters or digits, as printed on your ID or passport.";
    }

    const business = businessName.trim();
    if (
      business !== "" &&
      (business.length < PROFILE_LIMITS.businessName.min ||
        business.length > PROFILE_LIMITS.businessName.max)
    ) {
      found.businessName = `Between ${PROFILE_LIMITS.businessName.min} and ${PROFILE_LIMITS.businessName.max} characters, or leave it empty.`;
    }

    const phone = mpesaNumber.trim();
    if (phone !== "" && !E164_RE.test(normalisePhone(phone))) {
      found.mpesaNumber = "Something like 0722334455 or +254722334455.";
    }

    return found;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const business = businessName.trim();
      const phone = mpesaNumber.trim();

      await createLandlordProfile({
        nationalId: nationalId.trim(),
        ...(business === "" ? {} : { businessName: business }),
        ...(phone === "" ? {} : { mpesaNumber: normalisePhone(phone) }),
      });

      // The gate everywhere else reads `landlordProfile` from context, so it has
      // to be refreshed before navigating or the dashboard still says "onboarding".
      await refreshProfile();
      toast.success("Details submitted. We'll review your account shortly.");
      navigate("/landlord", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
        const details = err.details as Array<{ field?: string; message?: string }>;
        const mapped: Record<string, string> = {};
        for (const detail of details ?? []) {
          if (detail?.field && detail.message) mapped[detail.field] = detail.message;
        }
        if (Object.keys(mapped).length > 0) setErrors(mapped);
      } else {
        toast.error("Couldn't save your details.");
      }
    } finally {
      setSaving(false);
    }
  }

  const normalised = mpesaNumber.trim() === "" ? "" : normalisePhone(mpesaNumber.trim());

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-h1 text-foreground">Finish setting up</h1>
      <p className="mt-1 text-body-sm text-muted-foreground">
        Two details and you're done. We verify every landlord before their listings go live — it's
        what makes tenants trust the ones that are.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <section className="space-y-5 rounded-xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="nationalId">National ID or passport number</Label>
            <div className="relative">
              <IdCard
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="nationalId"
                value={nationalId}
                maxLength={20}
                autoComplete="off"
                className="pl-9"
                placeholder="12345678"
                aria-invalid={Boolean(errors.nationalId)}
                onChange={(event) => setNationalId(event.target.value)}
              />
            </div>
            {errors.nationalId ? (
              <p className="text-caption text-destructive-strong">{errors.nationalId}</p>
            ) : (
              <p className="text-caption text-muted-foreground">
                Used once, to confirm you are who you say you are. It is never shown to tenants and
                can't be changed afterwards.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="businessName">Business name</Label>
              <span className="text-caption text-muted-foreground">Optional</span>
            </div>
            <div className="relative">
              <Store
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="businessName"
                value={businessName}
                maxLength={100}
                className="pl-9"
                placeholder="e.g. Bahari Properties"
                aria-invalid={Boolean(errors.businessName)}
                onChange={(event) => setBusinessName(event.target.value)}
              />
            </div>
            {errors.businessName ? (
              <p className="text-caption text-destructive-strong">{errors.businessName}</p>
            ) : (
              <p className="text-caption text-muted-foreground">
                Shown to tenants on your listings. Leave it blank to use your own name.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="mpesaNumber">M-Pesa number</Label>
              <span className="text-caption text-muted-foreground">Optional</span>
            </div>
            <Input
              id="mpesaNumber"
              value={mpesaNumber}
              inputMode="tel"
              autoComplete="tel"
              placeholder="0722334455"
              aria-invalid={Boolean(errors.mpesaNumber)}
              onChange={(event) => setMpesaNumber(event.target.value)}
            />
            {errors.mpesaNumber ? (
              <p className="text-caption text-destructive-strong">{errors.mpesaNumber}</p>
            ) : (
              <p className="text-caption text-muted-foreground">
                {normalised && normalised !== mpesaNumber.trim()
                  ? `Saved as ${normalised}. `
                  : ""}
                How tenants reach you, and where rent will be sent once payments are switched on.
              </p>
            )}
          </div>
        </section>

        <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info-soft px-4 py-3.5">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-info-strong" />
          <p className="text-body-sm text-info-strong">
            After this, an admin reviews your account. You can add properties as drafts once
            approved — nothing goes live before then.
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit for review"
          )}
        </Button>
      </form>
    </div>
  );
}
