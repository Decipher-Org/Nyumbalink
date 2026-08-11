import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseRoleParam, ROLE_LABELS } from "@/lib/roles";

/**
 * Placeholder for the signup form (built in the next milestone alongside the
 * dashboards).
 *
 * It exists now to hold the routing guard: no path reaches a signup form
 * without a resolved role. Anything without a valid `?role=` bounces back to
 * the chooser instead of rendering a form that would post a roleless signup and
 * silently create a tenant.
 */
export default function SignupDetails() {
  const [searchParams] = useSearchParams();
  const role = parseRoleParam(searchParams.get("role"));
  const next = searchParams.get("next");

  if (!role) {
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    const query = params.toString();
    return <Navigate to={query ? `/signup?${query}` : "/signup"} replace />;
  }

  const backParams = new URLSearchParams({ role: role.toLowerCase() });
  if (next) backParams.set("next", next);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="NyumbaLink home">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          {/* Guard 3: the chosen role stays visible and editable on the form. */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Creating a</span>
            <Badge className="bg-primary text-primary-foreground">{ROLE_LABELS[role]}</Badge>
            <span className="text-sm text-muted-foreground">account</span>
          </div>

          <h1 className="mt-6 font-serif text-2xl font-semibold">Signup form coming next</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Account creation, email verification, and login land in the next milestone alongside the
            tenant and landlord dashboards.
          </p>
          {next && (
            <p className="mt-4 rounded-lg bg-mint px-3 py-2 font-mono text-xs break-all text-primary">
              after signup → {next}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-2">
            <Button asChild variant="outline">
              <Link to={`/signup?${backParams.toString()}`}>
                <ArrowLeft />
                Change account type
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
