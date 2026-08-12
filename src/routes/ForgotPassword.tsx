import { useState } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormError } from "@/components/auth/FormError";
import { OTP_LENGTH, OtpField } from "@/components/auth/OtpField";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword, sendVerificationOtp } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useCountdown } from "@/lib/hooks/use-countdown";
import { loginPath } from "@/lib/search-params";

const MIN_PASSWORD_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Password reset, both halves on one screen.
 *
 * The backend flow is `send-verification-otp` with `type: "forget-password"`,
 * then `email-otp/reset-password` with the code and the new password. Keeping the
 * two steps in one component means the email typed in step one is still in state
 * for step two — no token in the URL, and no way to land on the reset form
 * without an email attached to it.
 *
 * Requesting a code deliberately reports success even for an address that has no
 * account: whether an email is registered is not something an unauthenticated
 * form should confirm.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const resend = useCountdown();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  async function requestCode(isResend = false) {
    if (submitting) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setError(null);
    setSubmitting(true);
    try {
      await sendVerificationOtp({ email: trimmedEmail, type: "forget-password" });
    } catch (err) {
      // A 404/400 here would leak whether the address is registered, so only a
      // genuine transport failure is surfaced — everything else falls through to
      // the code screen exactly as a real account would.
      if (err instanceof ApiError && err.isNetworkError) {
        setError(err);
        setSubmitting(false);
        return;
      }
    }

    resend.start(RESEND_COOLDOWN_SECONDS);
    setSubmitting(false);
    setStep("reset");
    if (isResend) toast.success(`New code sent to ${trimmedEmail}.`);
  }

  async function submitReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (password !== confirm) {
      setError(new Error("Those passwords don't match."));
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await resetPassword({ email: email.trim(), otp, password });
      toast.success("Password updated. Log in with your new password.");
      navigate(loginPath(), { replace: true });
    } catch (err) {
      setError(err);
      setOtp("");
      setSubmitting(false);
    }
  }

  const badge = (
    <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
      <KeyRound aria-hidden="true" className="size-6" />
    </span>
  );

  const footer = (
    <Link to={loginPath()} className="font-medium text-primary underline-offset-4 hover:underline">
      Back to log in
    </Link>
  );

  if (step === "request") {
    return (
      <AuthLayout
        title="Reset your password"
        description="We'll email you a 6-digit code to confirm it's you."
        badge={badge}
        footer={footer}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void requestCode();
          }}
          className="space-y-4"
        >
          <FormError error={error} />

          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Email address</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              autoFocus
              disabled={submitting}
              placeholder="you@example.com"
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending code…" : "Send reset code"}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      description={`Enter the code we sent to ${email.trim()} and your new password.`}
      badge={badge}
      footer={footer}
    >
      <form onSubmit={submitReset} className="space-y-5">
        <FormError error={error} />

        <OtpField value={otp} onChange={setOtp} disabled={submitting} invalid={Boolean(error)} />

        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          disabled={submitting}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        />

        <PasswordField
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          disabled={submitting}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || otp.length < OTP_LENGTH || !password}
        >
          {submitting ? "Updating password…" : "Update password"}
        </Button>

        <div className="text-center text-body-sm text-muted-foreground">
          Didn't get the code?{" "}
          <button
            type="button"
            onClick={() => void requestCode(true)}
            disabled={submitting || resend.active}
            className="font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {resend.active ? `Resend in ${resend.remaining}s` : "Resend code"}
          </button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => {
            setStep("request");
            setOtp("");
            setError(null);
          }}
        >
          <ArrowLeft />
          Use a different email
        </Button>
      </form>
    </AuthLayout>
  );
}
