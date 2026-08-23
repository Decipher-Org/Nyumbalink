/**
 * Whether the signed-in tenant may browse, held once for the whole tenant app.
 *
 * A browsing pass is not a nicety — `requireTenantAccess` gates the entire
 * catalogue (`GET /properties`, `GET /properties/:id`, and the units under it), so
 * a tenant without one can see nothing at all. That makes this the difference
 * between a working app and three stacked error panels, and it is worth one
 * request on entry to get right.
 *
 * ## Expiry is a deadline, not a fetch result
 *
 * A 24-hour pass read as `active: true` at 11:59 is dead at 12:00. Polling to
 * discover that would mean a request every minute for a fact we already know, so
 * the provider schedules a single timer for the exact expiry instead — the same
 * reasoning `lib/hooks/use-countdown.ts` gives for measuring against a fixed end
 * time rather than counting down.
 *
 * `setTimeout` is clamped to ~24.8 days by the spec, which no pass here comes near.
 *
 * ## The clock-skew backstop
 *
 * The timer trusts the browser's clock and the server trusts its own. A client
 * running behind would keep rendering listings while every request came back 403,
 * so `client.ts` dispatches `TENANT_ACCESS_LAPSED_EVENT` on that specific refusal
 * and this listens for it. Belt and braces, deliberately — the braces cost six
 * lines and the failure they prevent looks like a broken app.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ApiError, TENANT_ACCESS_LAPSED_EVENT } from "@/lib/api/client";
import { getTenantAccess } from "@/lib/api/subscriptions";
import type { TenantAccess } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

type TenantAccessState = {
  /** May this account browse? True for landlords and admins, who are exempt. */
  active: boolean;
  /**
   * True for a landlord or admin: they are not gated and have no pass. Render
   * nothing about passes when this is set — a countdown on a pass they never
   * bought is a bill they do not owe.
   */
  exempt: boolean;
  expiresAt: string | null;
  startedAt: string | null;
  /** The pass price in KES, from the server. Never hard-code it in a screen. */
  price: number | null;
  /** How long a pass lasts, in hours. */
  hours: number | null;
  loading: boolean;
  /** Set when the check itself failed — distinct from "checked, and no pass". */
  error: unknown;
  /** Re-read after a purchase settles. */
  refresh: () => Promise<void>;
};

const TenantAccessContext = createContext<TenantAccessState | undefined>(undefined);

export function TenantAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [access, setAccess] = useState<TenantAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  /** Flipped by the deadline timer or the 403 backstop, without a refetch. */
  const [lapsed, setLapsed] = useState(false);

  /** Guards against a stale response overwriting a newer refresh. */
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!user) {
      setAccess(null);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setError(null);

    try {
      const next = await getTenantAccess();
      if (id !== requestId.current) return;
      setAccess(next);
      setLapsed(false);
    } catch (err) {
      if (id !== requestId.current) return;
      // A 401 has already cleared the session elsewhere; anything else leaves
      // `active` false, which fails towards the paywall rather than towards free
      // access. The paywall can say "we couldn't check" — see AccessRequired.
      setError(err instanceof ApiError ? err : new Error("Could not check browsing access."));
      setAccess(null);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  /** One timer, set for the exact expiry. See the header note. */
  useEffect(() => {
    if (!access?.active || access.exempt || !access.expiresAt) return;

    const msLeft = new Date(access.expiresAt).getTime() - Date.now();
    // Already past, or an unparseable date: treat as lapsed rather than trusting it.
    if (!Number.isFinite(msLeft) || msLeft <= 0) {
      setLapsed(true);
      return;
    }

    const timer = window.setTimeout(() => setLapsed(true), msLeft);
    return () => window.clearTimeout(timer);
  }, [access?.active, access?.exempt, access?.expiresAt]);

  useEffect(() => {
    function onLapsed() {
      setLapsed(true);
    }
    window.addEventListener(TENANT_ACCESS_LAPSED_EVENT, onLapsed);
    return () => window.removeEventListener(TENANT_ACCESS_LAPSED_EVENT, onLapsed);
  }, []);

  const value = useMemo<TenantAccessState>(() => {
    const exempt = access?.exempt === true;
    return {
      active: exempt ? true : Boolean(access?.active) && !lapsed,
      exempt,
      expiresAt: access?.expiresAt ?? null,
      startedAt: access?.startedAt ?? null,
      price: access?.price ?? null,
      hours: access?.hours ?? null,
      loading,
      error,
      refresh: load,
    };
  }, [access, lapsed, loading, error, load]);

  return <TenantAccessContext.Provider value={value}>{children}</TenantAccessContext.Provider>;
}

export function useTenantAccess(): TenantAccessState {
  const context = useContext(TenantAccessContext);
  if (!context) {
    throw new Error("useTenantAccess must be used inside <TenantAccessProvider>");
  }
  return context;
}
