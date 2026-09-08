import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/button";
import { homePathFor, onboardingPathFor, useAuth } from "@/lib/auth/AuthProvider";
import type { AuthUser } from "@/lib/api/types";
import { loginPath, safeNextPath } from "@/lib/search-params";

export default function AuthCallback() {
  const { completeGoogleSignIn, loading } = useAuth();
  const navigate = useNavigate();
  const [callback] = useState(() => {
    const url = new URL(window.location.href);
    return {
      token: new URLSearchParams(url.hash.slice(1)).get("token"),
      error: url.searchParams.has("error"),
      next: safeNextPath(url.searchParams.get("next")),
      isNew: url.searchParams.get("new") === "1",
    };
  });
  const [error, setError] = useState<unknown>(null);
  // Share the exchange across StrictMode effect replays: the ticket is one-use.
  const exchange = useRef<Promise<AuthUser> | null>(null);

  useEffect(() => {
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    if (callback.error || !callback.token) {
      setError(new Error("Google sign-in could not be completed. Please try again."));
      return;
    }
    if (loading) return;
    let active = true;
    exchange.current ??= completeGoogleSignIn(callback.token);
    void exchange.current.then((user) => {
      if (active) navigate(callback.next ?? (callback.isNew
        ? onboardingPathFor(user.role) : homePathFor(user.role)), { replace: true });
    }).catch((err: unknown) => { if (active) setError(err); });
    return () => { active = false; };
  }, [callback, completeGoogleSignIn, loading, navigate]);

  return (
    <AuthLayout title={error ? "Unable to sign in" : "Signing you in"}
      description={error ? "Return to login to try Google again." : "Finishing your Google sign-in…"}>
      <FormError error={error} />
      {error ? <Button asChild className="w-full"><Link to={loginPath(callback.next ?? undefined)}>Back to login</Link></Button> : null}
    </AuthLayout>
  );
}
