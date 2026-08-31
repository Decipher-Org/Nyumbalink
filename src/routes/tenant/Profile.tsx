import {
  Briefcase,
  Camera,
  Heart,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import {
  AccountSection,
  DeactivateSection,
  SecuritySection,
} from "@/components/app/AccountSettings";
import { PageHeader } from "@/components/app/PageHeader";
import { ErrorState } from "@/components/app/States";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import {
  createTenantProfile,
  getMyTenantProfile,
  updateMyTenantProfile,
  uploadProfilePhoto,
} from "@/lib/api/profiles";
import type {
  Gender,
  TenantProfile as TenantProfileRecord,
} from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFavorites } from "@/lib/favorites/FavoritesProvider";
import { formatDate, formatTimeLeft } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { useTenantAccess } from "@/lib/subscriptions/TenantAccessProvider";

/**
 * The tenant's own profile, and their account.
 *
 * ## The profile is optional, and the code has to mean it
 *
 * Nothing gates on a `TenantProfile` — unlike a landlord's, which every property
 * write is checked against. `GET /tenants/me` therefore answers `404
 * TENANT_PROFILE_NOT_FOUND` for most tenants, which is a normal state and not an
 * error, and `PATCH /tenants/me` 404s in the same case. So saving here is
 * create-or-update: `POST /tenants/profile` when the record is missing, `PATCH`
 * when it exists.
 *
 * ## Account sections live next door
 *
 * The tenant nav is five tabs with no room for a Settings entry, so name, email,
 * password, sign-out and deactivation sit at the bottom of this screen from
 * `components/app/AccountSettings.tsx` — the same components the landlord's
 * Settings screen uses.
 *
 * ## The browsing pass
 *
 * The card at the bottom reads `useTenantAccess()`, not `profile.subscription` —
 * the profile is optional and 404s for most tenants, so it cannot answer whether
 * someone may browse. See `BrowsingPassCard` below.
 */

const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

/** Stands in for `null` in the select, which cannot hold an empty value. */
const UNSET = "unset";

export default function TenantProfile() {
  const { user } = useAuth();
  const { count } = useFavorites();
  const fileRef = useRef<HTMLInputElement>(null);

  const profile = useAsync(async () => {
    try {
      return await getMyTenantProfile();
    } catch (err) {
      // No profile yet is the common case, not a failure.
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }, []);

  const record = profile.data ?? null;

  const [occupation, setOccupation] = useState("");
  const [gender, setGender] = useState<string>(UNSET);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Seed the form when the record lands. Keyed on its id (and on `null` becoming
  // an id after the first save) so a later reload doesn't wipe an in-flight edit.
  useEffect(() => {
    setOccupation(record?.occupation ?? "");
    setGender(record?.gender ?? UNSET);
    setErrors({});
  }, [record?.id]);

  const dirty =
    occupation !== (record?.occupation ?? "") ||
    gender !== (record?.gender ?? UNSET);

  /**
   * Guarantees a profile row exists so a `PATCH`-only path (the photo upload) has
   * something to write to. A 409 means one already existed and our read missed
   * it — re-read rather than fail.
   */
  async function ensureRecord(): Promise<TenantProfileRecord> {
    if (record) return record;
    try {
      return await createTenantProfile({});
    } catch (err) {
      if (err instanceof ApiError && err.code === "PROFILE_ALREADY_EXISTS") {
        return getMyTenantProfile();
      }
      throw err;
    }
  }

  async function save() {
    const trimmed = occupation.trim();
    if (trimmed !== "" && (trimmed.length < 2 || trimmed.length > 100)) {
      setErrors({
        occupation: "Between 2 and 100 characters, or leave it empty.",
      });
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      // `null` clears; `""` fails the minimum length rather than erasing.
      const input = {
        occupation: trimmed === "" ? null : trimmed,
        gender: gender === UNSET ? null : (gender as Gender),
      };

      const next = record
        ? await updateMyTenantProfile(input)
        : await createTenantProfile(input);
      profile.setData(next);
      toast.success("Profile updated.");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
        const details = err.details as Array<{
          field?: string;
          message?: string;
        }>;
        const mapped: Record<string, string> = {};
        for (const detail of details ?? []) {
          if (detail?.field && detail.message)
            mapped[detail.field] = detail.message;
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
      // The upload is a PATCH, so the row has to exist first.
      await ensureRecord();
      await uploadProfilePhoto("tenants", file);
      await profile.reload();
      toast.success("Photo updated.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't upload that photo.",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (profile.loading && !profile.data) {
    return (
      <>
        <PageHeader title="Profile" />
        <div className="grid max-w-4xl gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl lg:col-span-1" />
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </>
    );
  }

  if (profile.error) {
    return (
      <>
        <PageHeader title="Profile" />
        <ErrorState error={profile.error} onRetry={profile.reload} />
      </>
    );
  }

  const displayName = user?.name?.trim() || "Tenant";

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your details, and how you sign in."
      />

      <div className="max-w-4xl space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="size-24">
                  <AvatarImage src={record?.profilePhoto ?? undefined} alt="" />
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
                  {uploading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Camera />
                  )}
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
              <p className="mt-1 text-caption text-muted-foreground">
                {record
                  ? `Tenant since ${formatDate(record.createdAt)}`
                  : "Tenant"}
              </p>
            </div>

            <Separator className="my-5" />

            <dl className="space-y-3 text-body-sm">
              <ReadOnlyRow icon={User} label="Name" value={user?.name} />
              <ReadOnlyRow icon={Mail} label="Email" value={user?.email} />
              <ReadOnlyRow
                icon={Phone}
                label="Phone"
                value={user?.phoneNumber ?? "Not provided"}
              />
            </dl>

            <Separator className="my-5" />

            <Link
              to="/tenant/favorites"
              className="flex min-h-11 items-center gap-3 rounded-lg px-1 text-body-sm text-foreground transition-colors hover:text-primary"
            >
              <Heart
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
              <span className="flex-1">Saved homes</span>
              <span className="font-semibold tabular-nums">{count}</span>
            </Link>
          </section>

          <div className="space-y-6 lg:col-span-2">
            <section className="space-y-5 rounded-xl border border-border bg-card p-5">
              <div>
                <h2 className="text-h3 text-foreground">About you</h2>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  Optional, and never shown on a listing. It helps landlords
                  place your enquiry.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <span className="text-caption text-muted-foreground">
                    Optional
                  </span>
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
                    aria-invalid={Boolean(errors.occupation)}
                    onChange={(event) => setOccupation(event.target.value)}
                  />
                </div>
                {errors.occupation ? (
                  <p className="text-caption text-destructive-strong">
                    {errors.occupation}
                  </p>
                ) : (
                  <p className="text-caption text-muted-foreground">
                    Leave it empty to skip. Clearing a saved value removes it.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="gender">Gender</Label>
                  <span className="text-caption text-muted-foreground">
                    Optional
                  </span>
                </div>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender" className="w-full">
                    <SelectValue placeholder="Prefer not to say" />
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
                {errors.gender ? (
                  <p className="text-caption text-destructive-strong">
                    {errors.gender}
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={saving || !dirty}
                  onClick={save}
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </section>

            <BrowsingPassCard />
          </div>
        </div>

        <AccountSection nameHint="Your name is what a landlord sees when you get in touch." />

        <SecuritySection />

        <DeactivateSection keeps="Your details are kept, and nothing you saved is deleted." />
      </div>
    </>
  );
}

/**
 * The pass, as the tenant's own account sees it.
 *
 * Reads `useTenantAccess()` rather than `profile.subscription`, even though the
 * profile now carries a real one. Two reasons: the profile 404s for most tenants
 * (see this file's header note), so it cannot be the source of truth for whether
 * someone can browse; and the provider already holds a live value with an expiry
 * timer on it, so this card lapses at the same instant the gate does instead of
 * showing a stale "active" until the next reload.
 */
function BrowsingPassCard() {
  const access = useTenantAccess();

  // A landlord or admin reading this screen has no pass and owes nothing. Saying
  // anything at all about passes here would invent a bill.
  if (access.exempt) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Sparkles aria-hidden="true" className="size-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-h3 text-foreground">Browsing pass</h2>
            {access.loading ? null : (
              <Badge variant={access.active ? "default" : "outline"}>
                {access.active ? "Active" : "Not active"}
              </Badge>
            )}
          </div>

          {access.loading ? (
            <Skeleton className="mt-2 h-4 w-56" />
          ) : access.active ? (
            <p className="mt-1 text-body-sm text-muted-foreground">
              {formatTimeLeft(access.expiresAt)} — expires{" "}
              {formatDate(access.expiresAt)}. Buying again before then adds to
              this, so you keep the time you've paid for.
            </p>
          ) : (
            <p className="mt-1 text-body-sm text-muted-foreground">
              You need a pass to see listings. Your account, chats and saved
              details stay available either way.
            </p>
          )}

          {access.active ? null : (
            <Button asChild size="sm" className="mt-3">
              <Link to="/tenant/search">Get a pass</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
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
      <Icon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <div className="min-w-0">
        <dt className="text-caption text-muted-foreground">{label}</dt>
        <dd className="truncate text-foreground">{value || "—"}</dd>
      </div>
    </div>
  );
}
