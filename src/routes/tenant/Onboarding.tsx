import { ArrowRight, Briefcase, Loader2, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { createTenantProfile, getMyTenantProfile } from "@/lib/api/profiles";
import type { Gender } from "@/lib/api/types";
import { useAsync } from "@/lib/hooks/use-async";

/**
 * The first screen a new tenant sees after verifying their email.
 *
 * ## Skipping is a real option, not a dark pattern
 *
 * A `TenantProfile` gates nothing — no listing, no search, no contact detail
 * depends on it, and `GET /properties` only needs a session. So this step is
 * genuinely optional and says so, with "Skip for now" as a peer of the save
 * button rather than a link hidden in the corner. Everything here can be edited
 * later on the Profile screen, which creates the record if this was skipped.
 *
 * Contrast with the landlord equivalent, where onboarding is mandatory: without a
 * profile, every property write comes back `403 LANDLORD_PROFILE_NOT_FOUND`.
 */

const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

/** Stands in for `null` in the select, which cannot hold an empty value. */
const UNSET = "unset";

export default function TenantOnboarding() {
  const navigate = useNavigate();

  const [occupation, setOccupation] = useState("");
  const [gender, setGender] = useState<string>(UNSET);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // A tenant can reach this route again later — from a stale link or the back
  // button — so check whether the record already exists. A 404 is the expected
  // answer for a new account, not a failure.
  const existing = useAsync(async () => {
    try {
      return await getMyTenantProfile();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      // Anything else: treat it as "not set up" and let the form handle the
      // conflict on submit. Blocking a skippable screen on a failed read would be
      // worse than attempting it.
      return null;
    }
  }, []);

  if (existing.loading) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  // Already done. Nothing to collect, so this becomes a way onwards.
  if (existing.data) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
            <Search className="size-6" />
          </span>
          <h1 className="text-h2 text-foreground">You're all set</h1>
          <p className="mt-2 text-body-sm text-muted-foreground">
            Your details are saved. You can change them any time on your profile.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate("/tenant/search")}>Find a home</Button>
            <Button variant="outline" onClick={() => navigate("/tenant/profile")}>
              Edit my details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = occupation.trim();
    if (trimmed !== "" && (trimmed.length < 2 || trimmed.length > 100)) {
      setError("Between 2 and 100 characters, or leave it empty.");
      return;
    }
    setError(null);

    setSaving(true);
    try {
      await createTenantProfile({
        // `null` rather than `""`: an empty string fails the minimum length.
        occupation: trimmed === "" ? null : trimmed,
        gender: gender === UNSET ? null : (gender as Gender),
      });
      toast.success("Saved. Happy house hunting.");
      navigate("/tenant", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "PROFILE_ALREADY_EXISTS") {
        // Two tabs, or a retry after a response we never saw. The record exists,
        // which is the outcome that was wanted.
        navigate("/tenant", { replace: true });
        return;
      }
      toast.error(err instanceof ApiError ? err.message : "Couldn't save your details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-h1 text-foreground">Karibu NyumbaLink</h1>
      <p className="mt-1 text-body-sm text-muted-foreground">
        Two optional details, then you're into the listings. Landlords see your name and how to
        reach you when you get in touch — nothing on this page appears on any listing.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <section className="space-y-5 rounded-xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="occupation">Occupation</Label>
              <span className="text-caption text-muted-foreground">Optional</span>
            </div>
            <div className="relative">
              <Briefcase
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="occupation"
                value={occupation}
                maxLength={100}
                className="pl-9"
                placeholder="e.g. Teacher"
                aria-invalid={Boolean(error)}
                onChange={(event) => setOccupation(event.target.value)}
              />
            </div>
            {error ? (
              <p className="text-caption text-destructive-strong">{error}</p>
            ) : (
              <p className="text-caption text-muted-foreground">
                Some landlords ask. Filling it in saves a round trip later.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="gender">Gender</Label>
              <span className="text-caption text-muted-foreground">Optional</span>
            </div>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender" className="w-full">
                <SelectValue placeholder="Not specified" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>Not specified</SelectItem>
                {(Object.keys(GENDER_LABELS) as Gender[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {GENDER_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/*
          This previously claimed browsing every coastal listing was free while we get
          started. There's nothing to pay and nothing held back." Onboarding is the last
          screen before the gate, so that sentence was setting up the paywall on the very
          next click to look like a bait-and-switch.

          It names no figure on purpose. The price belongs to the server, and
          `AccessRequired` renders it from `GET /subscriptions/tenant`; quoting a literal
          here would contradict it in development, where the backend runs `PRICE_*=1`.
        */}
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3.5">
          <Sparkles aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-body-sm text-muted-foreground">
            Next you'll pick up a day pass — one M-Pesa payment opens every listing across the
            coastal counties for 24 hours, with nothing held back. It simply lapses when the day
            is up, so there is nothing to cancel.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" size="lg" className="sm:flex-1" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Save and continue
                <ArrowRight />
              </>
            )}
          </Button>
          {/* A peer of the save button, not a footnote: the record is optional and
              pretending otherwise would be a lie about what the app needs. */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="sm:flex-1"
            disabled={saving}
            onClick={() => navigate("/tenant", { replace: true })}
          >
            Skip for now
          </Button>
        </div>
      </form>
    </div>
  );
}
