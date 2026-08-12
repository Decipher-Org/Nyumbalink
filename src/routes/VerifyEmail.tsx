import { useEffect, useMemo, useState } from "react";
import { MailCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormError } from "@/components/auth/FormError";
import { OTP_LENGTH, OtpField } from "@/components/auth/OtpField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendVerificationOtp, verifyEmail } from "@/lib/api/auth";
import { onboardingPathFor, useAuth } from "@/lib/auth/AuthProvider";
import { peekPendingSignup, takePendingSignup } from "@/lib/auth/pending-signup";
import { useCountdown } from "@/lib/hooks/use-countdown";
import { loginPath, safeNextPath } from "@/lib/search-params";

/** Long enough to stop double-taps, short enough that a lost email isn't a wall. */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Email verification.
 *
 * Reached straight from sign-up, which has already dispatched a code
 * (`sendVerificationOnSignUp: true`), so the cooldown starts armed rather than
 * sending a second one on mount.
 *
 * Verifying returns no session token, so a verified user still has to sign in.
 * When the credentials are still in memory from the register step this does that
 * for them; after a reload they are gone by design, and the screen falls back to
 * sending the user to the login form with a note that they're verified.
 */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const resend = useCountdown();

  // Read once: the store is cleared when the credentials are used, and a
  // re-render must not lose the email along with them.
  const pending = useMemo(() => peekPendingSignup(), []);

  const [email, setEmail] = useState(pending?.email ?? searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const next = pending?.next ?? safeNextPath(searchParams.get("next"));
  /** Arrived straight from the form, so a code is already on its way. */
  const arrivedFromSignup = Boolean(pending);

  useEffect(() => {
    if (arrivedFromSignup) resend.start(RESEND_COOLDOWN_SECONDS);
    // Deliberately mount-only: re-running on `resend` identity would reset the
    // user's cooldown out from under them.
  }, []);

  async function submitOtp(code: string) {
    if (submitting) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || code.length < OTP_LENGTH) return;

    setError(null);
    setSubmitting(true);

    try {
      await verifyEmail({ email: trimmedEmail, otp: code });
    } catch (err) {
      setError(err);
      setOtp("");
      setSubmitting(false);
      return;
    }

    // Verified. From here on the account is fine no matter what happens, so
    // failures below route to login rather than reporting the verification failed.
    const credentials = takePendingSignup();

    if (!credentials || credentials.email !== trimmedEmail) {
      toast.success("Email verified. You can log in now.");
      navigate(loginPath(next ?? undefined), { replace: true });
      return;
    }

    try {
      const user = await signIn(credentials.email, credentials.password);
      toast.success("Email verified. Welcome to NyumbaLink.");
      // A fresh account goes to its setup step; `next` still wins, because a
      // visitor who came from a hero search asked for listings, not a form.
      navigate(next ?? onboardingPathFor(user.role), { replace: true });
    } catch {
      toast.success("Email verified. Please log in to continue.");
      navigate(loginPath(next ?? undefined), { replace: true });
    }
  }

  async function handleResend() {
    const trimmedEmail = email.trim();
    if (resending || resend.active || !trimmedEmail) return;

    setError(null);
    setResending(true);
    try {
      await sendVerificationOtp({ email: trimmedEmail, type: "email-verification" });
      resend.start(RESEND_COOLDOWN_SECONDS);
      toast.success(`New code sent to ${trimmedEmail}.`);
    } catch (err) {
      setError(err);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      title="Check your email"
      description={
        email
          ? `Enter the ${OTP_LENGTH}-digit code we sent to ${email}.`
          : `Enter your email address and the ${OTP_LENGTH}-digit code we sent you.`
      }
      badge={
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
          <MailCheck aria-hidden="true" className="size-6" />
        </span>
      }
      footer={
        <>
          Wrong address?{" "}
          <Link
            to="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Start over
          </Link>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitOtp(otp);
        }}
        className="space-y-5"
      >
        <FormError error={error} />

        {/* Shown when the email isn't known — a reload drops the in-memory
            handoff, and this screen is also reachable from a stalled login. */}
        {!arrivedFromSignup ? (
          <div className="space-y-1.5">
            <Label htmlFor="verify-email">Email address</Label>
            <Input
              id="verify-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={submitting}
              placeholder="you@example.com"
            />
          </div>
        ) : null}

        <OtpField
          value={otp}
          onChange={setOtp}
          onComplete={(code) => void submitOtp(code)}
          disabled={submitting}
          invalid={Boolean(error)}
        />

        <Button type="submit" className="w-full" disabled={submitting || otp.length < OTP_LENGTH}>
          {submitting ? "Verifying…" : "Verify email"}
        </Button>

        <div className="text-center text-body-sm text-muted-foreground">
          Didn't get it?{" "}
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resending || resend.active || !email.trim()}
            className="font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {resend.active
              ? `Resend in ${resend.remaining}s`
              : resending
                ? "Sending…"
                : "Resend code"}
          </button>
          <span className="mt-1 block text-caption">
            Codes expire, so use the most recent one. Check your spam folder too.
          </span>
        </div>
      </form>
    </AuthLayout>
  );
}
