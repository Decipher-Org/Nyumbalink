import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormError } from "@/components/auth/FormError";
import { PasswordField } from "@/components/auth/PasswordField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { setPendingSignup } from "@/lib/auth/pending-signup";
import { parseRoleParam, ROLE_LABELS } from "@/lib/roles";
import { loginPath, safeNextPath } from "@/lib/search-params";

/** Better Auth's default floor; a shorter password is rejected server-side. */
const MIN_PASSWORD_LENGTH = 8;

const ROLE_BLURBS: Record<"TENANT" | "LANDLORD", string> = {
  TENANT: "Browse homes across Kenya's coastal counties and save the ones you like.",
  LANDLORD: "List your properties and manage units, rent, and vacancies.",
};

/**
 * Account creation.
 *
 * The routing guard is the important part and predates the form: no path reaches
 * here without a resolved role, because the backend silently turns a roleless
 * signup into a tenant. Anything without a valid `?role=` bounces to the chooser.
 *
 * Sign-up does not return a session (`autoSignIn: false`,
 * `requireEmailVerification: true`), so this hands off to the verify screen
 * rather than to a dashboard.
 */
export default function SignupDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const role = parseRoleParam(searchParams.get("role"));
  const next = safeNextPath(searchParams.get("next"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!role) {
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    const query = params.toString();
    return <Navigate to={query ? `/signup?${query}` : "/signup"} replace />;
  }

  const backParams = new URLSearchParams({ role: role.toLowerCase() });
  if (next) backParams.set("next", next);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !role) return;

    if (password !== confirm) {
      setError(new Error("Those passwords don't match."));
      return;
    }

    setError(null);
    setSubmitting(true);
    const trimmedEmail = email.trim();

    try {
      await signUp({
        name: name.trim(),
        email: trimmedEmail,
        password,
        role,
        // Omitted entirely when blank: the column is unique, and "" would
        // collide with the next person who also left it empty.
        ...(phone.trim() ? { phoneNumber: phone.trim() } : {}),
      });

      // In memory only, consumed once — it carries the password so verification
      // can sign the user straight in. See `pending-signup.ts`.
      setPendingSignup({
        email: trimmedEmail,
        password,
        role,
        next: next ?? undefined,
      });

      // `next` also rides in the URL, because verification signs the user in and
      // `GuestOnlyRoute` reads the destination from the query string. Only the
      // password is withheld from the URL; a path the visitor typed is not secret.
      navigate(next ? `/verify-email?next=${encodeURIComponent(next)}` : "/verify-email", {
        replace: true,
      });
    } catch (err) {
      // An account that exists but was never verified is a dead end here; send
      // them to the code screen instead of telling them to try another email.
      if (err instanceof ApiError && err.status === 422) {
        setError(
          new Error(
            "That email is already registered. Try logging in, or verify it if you never received the code.",
          ),
        );
      } else {
        setError(err);
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description={ROLE_BLURBS[role]}
      badge={
        <div className="flex items-center gap-2">
          <span className="text-body-sm text-muted-foreground">Creating a</span>
          <Badge className="bg-primary text-primary-foreground">{ROLE_LABELS[role]}</Badge>
          <span className="text-body-sm text-muted-foreground">account</span>
        </div>
      }
      footer={
        <>
          Already have an account?{" "}
          <Link
            to={loginPath(next ?? undefined)}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      {/* Native validation does the required/email/length checks — the messages
          are localised and announced for free. `FormError` carries what the
          browser can't know: cross-field mismatches and the server's replies. */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError error={error} />

        <div className="space-y-1.5">
          <Label htmlFor="signup-name">Full name</Label>
          <Input
            id="signup-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
            disabled={submitting}
            placeholder="Jane Wanjiru"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-email">Email address</Label>
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            disabled={submitting}
            placeholder="you@example.com"
          />
          <p className="text-caption text-muted-foreground">
            We'll send a 6-digit code here to confirm it's yours.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-phone">
            Phone number <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="signup-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            disabled={submitting}
            placeholder="+254 712 345 678"
          />
          <p className="text-caption text-muted-foreground">
            {role === "LANDLORD"
              ? "Shown to tenants who want to reach you about a listing."
              : "Helps landlords reach you about a viewing."}
          </p>
        </div>

        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          disabled={submitting}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        />

        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          disabled={submitting}
        />

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>

        {next ? (
          <p className="text-caption text-muted-foreground">
            You'll be taken back to your search once you're in.
          </p>
        ) : null}

        {/* The chosen role stays editable — the whole point of the gate is that
            it's a deliberate choice, not a default. */}
        <Button asChild variant="ghost" size="sm" className="w-full">
          <Link to={`/signup?${backParams.toString()}`}>
            <ArrowLeft />
            Change account type
          </Link>
        </Button>
      </form>
    </AuthLayout>
  );
}
