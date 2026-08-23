/**
 * The browsing-pass gate for the tenant catalogue routes.
 *
 * Modelled on `ProtectedRoute` in `lib/auth/ProtectedRoute.tsx`, and for the same
 * reason: a layout route decides *once*, before its children mount, so the user
 * gets either the page or the paywall and never a half-rendered page with a
 * dialog over it. `client.ts` explains why the alternative — a central 403
 * interceptor — was rejected as the mechanism.
 *
 * ## What is deliberately not gated
 *
 * Only the catalogue. `/tenant/profile`, `/tenant/onboarding` and `/tenant/chats`
 * sit outside this guard in `App.tsx`, because locking someone out of their own
 * account details — and out of the sign-out button living in that shell — over an
 * unpaid 200 KES would be indefensible. `requireTenantAccess` on the backend
 * guards exactly the same three property reads and nothing else, so the guard
 * boundary and the middleware boundary agree.
 *
 * ## Landlords and admins pass straight through
 *
 * `exempt` is folded into `active` by the provider, so no role check is needed
 * here. It should be rare — these are `/tenant/*` routes and `ProtectedRoute`
 * already pins them to `role="TENANT"` — but an admin impersonating or inspecting
 * should not meet a paywall for a pass they cannot buy.
 */

import { Outlet } from "react-router-dom";

import { AccessRequired } from "@/routes/tenant/AccessRequired";
import { useTenantAccess } from "@/lib/subscriptions/TenantAccessProvider";

/**
 * Held while the pass is checked. Deliberately *not* the paywall — flashing "pay
 * us" at someone who has already paid, for the second or two this backend takes
 * to answer, would be a small betrayal every time they open the app.
 */
function AccessLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        role="status"
        aria-label="Checking your browsing pass"
        className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"
      />
    </div>
  );
}

export function RequireTenantAccess() {
  const { active, loading } = useTenantAccess();

  if (loading) return <AccessLoading />;

  // No redirect: the paywall renders *at* the attempted URL, so a tenant who
  // followed a link to a specific listing is still on that listing's address when
  // the payment settles and the gate opens. A `<Navigate>` here would silently
  // discard the search criteria the hero put in the query string.
  if (!active) return <AccessRequired />;

  return <Outlet />;
}
