import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormError } from "@/components/auth/FormError";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { homePathFor, useAuth } from "@/lib/auth/AuthProvider";
import { safeNextPath, signupPath } from "@/lib/search-params";

/**
 * Sign-in.
 *
 * No social buttons: `socialProviders` is not configured on the backend, so a
 * Google or Apple button would be decoration that 404s. They are omitted rather
 * than rendered disabled — a greyed-out button reads as "temporarily broken".
 *
 * `?next=` is honoured so a hero search, or a redirect out of a protected route,
 * resumes where it left off; without one, the role decides the landing page.
 */
export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const next = safeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * An unverified account can't sign in, and the fix isn't on this screen — the
   * error offers a route to the code instead of leaving them retrying a password
   * that was never wrong.
   */
  const needsVerification =
    error instanceof ApiError &&
    (error.code === "EMAIL_NOT_VERIFIED" ||
      (error.status === 403 && /verif/i.test(error.message)));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);
    try {
      const user = await signIn(email.trim(), password);
      navigate(next ?? homePathFor(user.role), { replace: true });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Log in to manage your listings or pick up your search."
      footer={
        <>
          New to NyumbaLink?{" "}
          <Link
            to={signupPath("tenant", next ?? undefined)}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={error} />

        {needsVerification ? (
          <Button asChild variant="outline" className="w-full">
            <Link
              to={`/verify-email?email=${encodeURIComponent(email.trim())}${
                next ? `&next=${encodeURIComponent(next)}` : ""
              }`}
            >
              Verify this email
            </Link>
          </Button>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="login-email">Email address</Label>
          <Input
            id="login-email"
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

        <div className="space-y-1.5">
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            disabled={submitting}
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-body-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </Button>

        <p className="text-center text-caption text-muted-foreground">
          Signing up as a landlord?{" "}
          <Link
            to={signupPath("landlord", next ?? undefined)}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            List your property
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
