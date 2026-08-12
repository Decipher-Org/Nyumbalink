/**
 * The account sections shared by both roles: the `User` record (name, phone,
 * email), password changes, sign-out, and deactivation.
 *
 * These live here rather than in a route because the two roles reach them from
 * different places. A landlord has a Settings screen; a tenant's nav has five
 * tabs and no room for one, so the same sections sit at the bottom of their
 * Profile. Both are the same endpoints (`/api/v1/users`) and the same rules, and
 * only a few lines of copy differ — those are props.
 *
 * ## Changing a password signs you out
 *
 * `PATCH /users/me/password` calls Better Auth with `revokeOtherSessions: true`,
 * which deletes **every** session for the account, this one included, and mints a
 * replacement token the backend does not forward. So the stored token is dead the
 * instant the call succeeds. `SecuritySection` therefore treats a successful
 * change as a deliberate sign-out and says so before the user commits, rather
 * than leaving them in a session where the next click 401s for no visible reason.
 *
 * Deactivation ends the session for the same reason, and is a `status` flip
 * rather than a delete: only an admin can undo it.
 */

import { AlertTriangle, KeyRound, LogOut, Mail, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/lib/api/client";
import { E164_RE, normalisePhone } from "@/lib/api/types";
import {
  changeMyPassword,
  deactivateMyAccount,
  PASSWORD_LIMITS,
  updateMyAccount,
} from "@/lib/api/users";
import { useAuth } from "@/lib/auth/AuthProvider";

/** Name, phone and email — the `User` record, not the role profile. */
export function AccountSection({ nameHint }: { nameHint: string }) {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phoneNumber ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dirty = name !== (user?.name ?? "") || phone !== (user?.phoneNumber ?? "");

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};

    if (name.trim() === "") found.name = "Your name can't be empty.";

    // The users endpoint stores the phone as sent — it has no normaliser of its
    // own, unlike the profile endpoints — so normalise here and say what will be
    // stored.
    const trimmed = phone.trim();
    if (trimmed !== "" && !E164_RE.test(normalisePhone(trimmed))) {
      found.phone = "Something like 0722334455 or +254722334455.";
    }

    return found;
  }

  async function save() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const trimmed = phone.trim();
      await updateMyAccount({
        name: name.trim(),
        // `null` clears it. `""` would be stored, and the column is unique, so a
        // second blank would collide and fail as "already in use".
        phone: trimmed === "" ? null : normalisePhone(trimmed),
      });
      await refreshUser();
      toast.success("Account updated.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "PHONE_ALREADY_IN_USE") {
        setErrors({ phone: "Another account already uses that number." });
        toast.error(err.message);
      } else {
        toast.error(err instanceof ApiError ? err.message : "Couldn't save your account.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <User aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <h2 className="text-h3 text-foreground">Account</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">{nameHint}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account-name">Full name</Label>
        <Input
          id="account-name"
          value={name}
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          onChange={(event) => setName(event.target.value)}
        />
        {errors.name ? (
          <p className="text-caption text-destructive-strong">{errors.name}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="account-phone">Phone number</Label>
          <span className="text-caption text-muted-foreground">Optional</span>
        </div>
        <Input
          id="account-phone"
          value={phone}
          inputMode="tel"
          autoComplete="tel"
          placeholder="0722334455"
          aria-invalid={Boolean(errors.phone)}
          onChange={(event) => setPhone(event.target.value)}
        />
        {errors.phone ? (
          <p className="text-caption text-destructive-strong">{errors.phone}</p>
        ) : (
          <p className="text-caption text-muted-foreground">
            Changing this marks the number unconfirmed. We don't send confirmation texts yet, so
            nothing else changes.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="account-email">Email</Label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input id="account-email" value={user?.email ?? ""} readOnly disabled className="pl-9" />
        </div>
        <p className="text-caption text-muted-foreground">
          {user?.emailVerified
            ? "Confirmed. Your email is how you sign in, and it can't be changed here."
            : "Not confirmed yet. Your email is how you sign in, and it can't be changed here."}
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="button" disabled={saving || !dirty} onClick={save}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </section>
  );
}

/** Password change and sign-out. Identical for both roles. */
export function SecuritySection() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [passwordOpen, setPasswordOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <KeyRound aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="text-h3 text-foreground">Password</h2>
            <p className="mt-1 text-body-sm text-muted-foreground">
              Changing it signs you out of every device, including this one.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => setPasswordOpen(true)}
        >
          Change password
        </Button>
      </div>

      <Separator className="my-5" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <LogOut aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="text-h3 text-foreground">Sign out</h2>
            <p className="mt-1 text-body-sm text-muted-foreground">
              Ends this session only. Your other devices stay signed in.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" className="shrink-0" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>

      {passwordOpen ? (
        <PasswordDialog
          onClose={() => setPasswordOpen(false)}
          onChanged={async () => {
            setPasswordOpen(false);
            // The token this app holds was revoked by the change itself, so the
            // only coherent next state is signed out.
            await signOut();
            toast.success("Password changed. Sign in again with your new password.");
            navigate("/login", { replace: true });
          }}
        />
      ) : null}
    </section>
  );
}

/**
 * Deactivation. `keeps` names what survives it, which differs by role — a
 * landlord's listings, a tenant's saved details — and is the part people actually
 * want to know before they click.
 */
export function DeactivateSection({ keeps }: { keeps: string }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  return (
    <section className="rounded-xl border border-destructive/25 bg-destructive-soft p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-destructive-strong"
          />
          <div>
            <h2 className="text-h3 text-destructive-strong">Deactivate account</h2>
            <p className="mt-1 text-body-sm text-destructive-strong/85">
              Signs you out and blocks sign-in. {keeps} Only our team can switch the account back
              on.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="destructive"
          className="shrink-0"
          onClick={() => setOpen(true)}
        >
          Deactivate
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate your account?</DialogTitle>
            <DialogDescription>
              You'll be signed out immediately and won't be able to sign back in. {keeps}{" "}
              Reactivating means contacting our team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Keep my account
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={working}
              onClick={async () => {
                setWorking(true);
                try {
                  await deactivateMyAccount();
                } catch (err) {
                  toast.error(
                    err instanceof ApiError ? err.message : "Couldn't deactivate the account.",
                  );
                  setWorking(false);
                  return;
                }
                await signOut();
                navigate("/", { replace: true });
                toast.success("Your account has been deactivated.");
              }}
            >
              {working ? "Deactivating…" : "Deactivate account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/**
 * The password form. Confirmation is checked here rather than server-side, since
 * the endpoint takes one new password and has no idea what the user typed twice.
 */
function PasswordDialog({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const found: Record<string, string> = {};
    if (current === "") found.current = "Enter your current password.";
    if (next.length < PASSWORD_LIMITS.min) {
      found.next = `At least ${PASSWORD_LIMITS.min} characters.`;
    } else if (next.length > PASSWORD_LIMITS.max) {
      found.next = `At most ${PASSWORD_LIMITS.max} characters.`;
    } else if (next === current) {
      found.next = "That's the password you're already using.";
    }
    if (confirm !== next) found.confirm = "These two don't match.";

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await changeMyPassword({ currentPassword: current, newPassword: next });
      await onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.code === "CURRENT_PASSWORD_INCORRECT") {
        setErrors({ current: "That isn't your current password." });
      } else {
        toast.error(err instanceof ApiError ? err.message : "Couldn't change your password.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Change your password</DialogTitle>
            <DialogDescription>
              You'll be signed out of every device once this saves, including this one.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={current}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.current)}
                onChange={(event) => setCurrent(event.target.value)}
              />
              {errors.current ? (
                <p className="text-caption text-destructive-strong">{errors.current}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={next}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.next)}
                onChange={(event) => setNext(event.target.value)}
              />
              {errors.next ? (
                <p className="text-caption text-destructive-strong">{errors.next}</p>
              ) : (
                <p className="text-caption text-muted-foreground">
                  At least {PASSWORD_LIMITS.min} characters.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirm)}
                onChange={(event) => setConfirm(event.target.value)}
              />
              {errors.confirm ? (
                <p className="text-caption text-destructive-strong">{errors.confirm}</p>
              ) : null}
            </div>

            <div className="flex items-start gap-2.5 rounded-lg bg-info-soft px-3.5 py-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info-strong" />
              <p className="text-caption text-info-strong">
                Signing out everywhere is deliberate — if someone else had your old password, their
                session ends too.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Changing…" : "Change password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
