import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth/AuthProvider";
import { signupPath } from "@/lib/search-params";

/**
 * `/browse` is not a screen — it is the handoff from the marketing hero.
 *
 * Every properties route is `requireAuth`, including the list, so an anonymous
 * search cannot be answered. What the hero can do is carry the criteria through
 * signing in: this route forwards them, query string intact, to
 * `/tenant/search` for a signed-in tenant, or to the signup role gate for a
 * visitor, which returns here after verification via its `next` parameter.
 *
 * A signed-in landlord gets their own dashboard rather than tenant search — the
 * tenant routes are pinned to `role="TENANT"` and would bounce them anyway.
 */
export default function Browse() {
  const { user, loading } = useAuth();
  const { search } = useLocation();

  // Deciding before the session resolves would send a signed-in tenant to signup.
  if (loading) return null;

  if (!user) {
    // `role=tenant` only preselects a card on the chooser — the Continue button
    // stays disabled until it is confirmed, because the backend silently coerces
    // an unspecified role to TENANT and that has to be a decision, not a default.
    return <Navigate to={signupPath("tenant", `/tenant/search${search}`)} replace />;
  }

  if (user.role === "LANDLORD") {
    return <Navigate to="/landlord" replace />;
  }

  return <Navigate to={`/tenant/search${search}`} replace />;
}
