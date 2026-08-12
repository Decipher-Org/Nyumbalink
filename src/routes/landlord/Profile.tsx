import { Camera, Clock, IdCard, Loader2, Mail, Phone, Store, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { ApprovedBadge } from "@/components/landlord/VerificationNotice";
import { PageHeader } from "@/components/app/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/lib/api/client";
import { updateMyLandlordProfile, uploadProfilePhoto } from "@/lib/api/profiles";
import { E164_RE, normalisePhone, PROFILE_LIMITS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatDate } from "@/lib/format";

/**
 * The landlord's own profile.
 *
 * Only two fields are editable. `nationalId` is deliberately not updatable
 * server-side — it is the identity an admin approved against, so changing it
 * would silently invalidate that review — and `verified` is an admin decision
 * made elsewhere. Both are shown read-only rather than hidden, because a landlord
 * waiting on approval needs to see what was submitted.
 *
 * Name, email and phone belong to the `User`, not this profile, and are edited
 * under Settings via `PATCH /users/me`. They are shown here read-only because
 * this is the screen that answers "what did tenants and the reviewer see?", and
 * that answer spans both records.
 */
export default function LandlordProfile() {
  const { user, landlordProfile, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [businessName, setBusinessName] = useState(landlordProfile?.businessName ?? "");
  const [mpesaNumber, setMpesaNumber] = useState(landlordProfile?.mpesaNumber ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // The profile arrives asynchronously from the provider; seed the form when it
  // lands, keyed on the record's own id so a later refresh doesn't wipe edits.
  useEffect(() => {
    if (!landlordProfile) return;
    setBusinessName(landlordProfile.businessName ?? "");
    setMpesaNumber(landlordProfile.mpesaNumber ?? "");
    setErrors({});
  }, [landlordProfile?.id]);

  if (!landlordProfile) {
    return (
      <>
        <PageHeader title="Profile" />
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-body text-foreground">You haven't set up your landlord details yet.</p>
          <Button asChild className="mt-4">
            <Link to="/landlord/onboarding">Complete setup</Link>
          </Button>
        </div>
      </>
    );
  }

  const dirty =
    businessName !== (landlordProfile.businessName ?? "") ||
    mpesaNumber !== (landlordProfile.mpesaNumber ?? "");

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};

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

  async function save() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const business = businessName.trim();
      const phone = mpesaNumber.trim();

      // `null` clears, `""` does not: both fields have minimum lengths, so an
      // empty string comes back a validation error rather than an erasure.
      await updateMyLandlordProfile({
        businessName: business === "" ? null : business,
        mpesaNumber: phone === "" ? null : normalisePhone(phone),
      });
      await refreshProfile();
      toast.success("Profile updated.");
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
        toast.error("Couldn't save your profile.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function changePhoto(file: File | undefined) {
    if (!file) return;

    setUploading(true);
    try {
      await uploadProfilePhoto("landlords", file);
      await refreshProfile();
      toast.success("Photo updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't upload that photo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const displayName = landlordProfile.businessName || user?.name || "Landlord";
  const normalised = mpesaNumber.trim() === "" ? "" : normalisePhone(mpesaNumber.trim());

  return (
    <>
      <PageHeader title="Profile" description="What tenants see, and what we verified you with." />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar className="size-24">
                <AvatarImage src={landlordProfile.profilePhoto ?? undefined} alt="" />
                <AvatarFallback className="text-h2">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={uploading}
                aria-label="Change your photo"
                className="absolute right-0 bottom-0 size-9 rounded-full"
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => changePhoto(event.target.files?.[0])}
              />
            </div>

            <p className="mt-4 text-h3 text-foreground">{displayName}</p>
            <div className="mt-2">
              {landlordProfile.verified ? (
                <ApprovedBadge />
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-0.5 text-caption font-semibold text-warning-strong">
                  <Clock aria-hidden="true" className="size-3.5" />
                  Awaiting approval
                </span>
              )}
            </div>
            <p className="mt-3 text-caption text-muted-foreground">
              Landlord since {formatDate(landlordProfile.createdAt)}
            </p>
          </div>

          <Separator className="my-5" />

          <dl className="space-y-3 text-body-sm">
            <ReadOnlyRow icon={User} label="Name" value={user?.name} />
            <ReadOnlyRow icon={Mail} label="Email" value={user?.email} />
            <ReadOnlyRow icon={Phone} label="Phone" value={user?.phoneNumber ?? "Not provided"} />
            <ReadOnlyRow icon={IdCard} label="ID verified with" value={landlordProfile.nationalId} />
          </dl>

          <p className="mt-4 text-caption text-muted-foreground">
            Your ID can't be changed — it's what your approval was granted against. Name and phone
            live under{" "}
            <Link to="/landlord/settings" className="text-primary underline-offset-4 hover:underline">
              Settings
            </Link>
            .
          </p>
        </section>

        <section className="space-y-6 lg:col-span-2">
          <div className="space-y-5 rounded-xl border border-border bg-card p-5">
            <div>
              <h2 className="text-h3 text-foreground">Details tenants see</h2>
              <p className="mt-1 text-body-sm text-muted-foreground">
                These appear on every listing you publish.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business name</Label>
              <div className="relative">
                <Store
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="businessName"
                  value={businessName}
                  maxLength={PROFILE_LIMITS.businessName.max}
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
                  Leave it empty to show your own name instead.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mpesaNumber">M-Pesa number</Label>
              <div className="relative">
                <Phone
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="mpesaNumber"
                  value={mpesaNumber}
                  inputMode="tel"
                  className="pl-9"
                  placeholder="0722334455"
                  aria-invalid={Boolean(errors.mpesaNumber)}
                  onChange={(event) => setMpesaNumber(event.target.value)}
                />
              </div>
              {errors.mpesaNumber ? (
                <p className="text-caption text-destructive-strong">{errors.mpesaNumber}</p>
              ) : (
                <p className="text-caption text-muted-foreground">
                  {normalised && normalised !== mpesaNumber.trim()
                    ? `Saved as ${normalised}. `
                    : ""}
                  Tenants use this to reach you. Any Kenyan format works.
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="button" disabled={saving || !dirty} onClick={save}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>

          {!landlordProfile.verified ? (
            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3.5">
              <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning-strong" />
              <div className="text-body-sm text-warning-strong">
                <p className="font-semibold">Approval is still pending</p>
                <p className="mt-0.5 opacity-90">
                  Our team reviews new landlords by hand, so this can take a little time. You can
                  fill in your details and prepare drafts meanwhile.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}

function ReadOnlyRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-caption text-muted-foreground">{label}</dt>
        <dd className="truncate text-foreground">{value || "—"}</dd>
      </div>
    </div>
  );
}
