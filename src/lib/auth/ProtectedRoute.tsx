/**
 * Route guards.
 *
 * `<ProtectedRoute>` blocks unauthenticated access; `role` additionally pins a
 * route to one role, since a tenant reaching `/landlord` would only collect
 * `403 INSUFFICIENT_PERMISSIONS` from every call on the page.
 *
 * Both redirects preserve the attempted URL in `?next=`, so signing in returns
 * the user to where they were headed rather than to a generic home.
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";

import type { Role } from "@/lib/api/types";
import { homePathFor, useAuth } from "@/lib/auth/AuthProvider";
import { loginPath, safeNextPath } from "@/lib/search-params";

/** Full-page hold while the stored token is verified — avoids a login flash. */
function SessionLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div
        role="status"
        aria-label="Loading"
        className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"
      />
    </div>
  );
}

export function ProtectedRoute({ role }: { role?: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <SessionLoading />;

  if (!user) {
    return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  return <Outlet />;
}

/**
 * For login/register: someone already signed in has no business on them, and
 * bouncing them to their dashboard is friendlier than rendering a form that
 * would sign them in as themselves again.
 *
 * `?next=` is honoured here as well as by the forms themselves, and that is
 * load-bearing rather than belt-and-braces. Signing in flips `user` to non-null,
 * which re-renders this guard in the same tick as the form's own
 * `navigate(next)` — if the guard only ever sent people to their dashboard, the
 * two would race for the destination and the visitor's search would sometimes be
 * dropped. Agreeing on the answer means it doesn't matter which one wins.
 */
export function GuestOnlyRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <SessionLoading />;

  if (user) {
    const next = safeNextPath(new URLSearchParams(location.search).get("next"));
    return <Navigate to={next ?? homePathFor(user.role)} replace />;
  }

  return <Outlet />;
}
