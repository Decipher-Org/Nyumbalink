/**
 * Session state for the whole app: who is signed in, what role they hold, and —
 * for a landlord — whether an admin has approved them yet.
 *
 * The landlord profile is loaded here rather than per-screen because `verified`
 * gates every property write (`403 LANDLORD_NOT_VERIFIED`). The dashboard has to
 * know before it renders an "Add property" button, and the answer is the same for
 * every screen, so it is fetched once.
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

import * as authApi from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { getMyLandlordProfile } from "@/lib/api/profiles";
import type { AuthUser, LandlordProfile, Role } from "@/lib/api/types";
import {
  clearSession,
  getToken,
  SESSION_CLEARED_EVENT,
  setToken,
} from "@/lib/auth/session";

type AuthState = {
  /** null once resolved and signed out; undefined only before the first check. */
  user: AuthUser | null;
  /** Landlord only. `null` means onboarding is incomplete (no profile yet). */
  landlordProfile: LandlordProfile | null;
  /** True until the stored token has been checked against the server. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  /** Re-read the profile after onboarding or an admin approval. */
  refreshProfile: () => Promise<void>;
  /**
   * Re-read the account after `PATCH /users/me`. That endpoint answers in its own
   * shape (`phone`, `isVerified`) rather than the `AuthUser` the app uses, so this
   * takes the session's copy instead of mapping between the two.
   */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

/** Where a role lands after signing in. */
export function homePathFor(role: Role | undefined): string {
  if (role === "LANDLORD") return "/landlord";
  if (role === "TENANT") return "/tenant";
  // ADMIN is a separate application; there is nothing here for it.
  return "/";
}

/**
 * Where a brand-new account lands, as opposed to `homePathFor` on every later
 * sign-in. Both roles get a setup step, for different reasons: a landlord's is
 * required (without a profile every property write is `403
 * LANDLORD_PROFILE_NOT_FOUND`), a tenant's is optional and skippable. Both
 * screens detect an existing profile and become a way onwards instead, so
 * arriving here twice is harmless.
 */
export function onboardingPathFor(role: Role | undefined): string {
  if (role === "LANDLORD") return "/landlord/onboarding";
  if (role === "TENANT") return "/tenant/onboarding";
  return homePathFor(role);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [landlordProfile, setLandlordProfile] = useState<LandlordProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /** Guards against a stale response overwriting a newer sign-in/out. */
  const requestId = useRef(0);

  const loadLandlordProfile = useCallback(async (nextUser: AuthUser | null) => {
    if (nextUser?.role !== "LANDLORD") {
      setLandlordProfile(null);
      return;
    }
    try {
      setLandlordProfile(await getMyLandlordProfile());
    } catch (err) {
      // 404 is the normal "hasn't onboarded yet" case, not a failure. Anything
      // else is left as null too: the app then treats the landlord as
      // unverified, which is the safe direction to fail.
      if (!(err instanceof ApiError) || err.status !== 404) {
        console.warn("[auth] landlord profile unavailable", err);
      }
      setLandlordProfile(null);
    }
  }, []);

  /** Rehydrate from the stored token on first mount. */
  useEffect(() => {
    const id = ++requestId.current;

    if (!getToken()) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const session = await authApi.getSession();
        if (id !== requestId.current) return;

        const sessionUser = session?.user ?? null;
        if (!sessionUser) {
          // The token outlived its Redis entry.
          clearSession();
          setUser(null);
          return;
        }
        setUser(sessionUser);
        await loadLandlordProfile(sessionUser);
      } catch {
        if (id !== requestId.current) return;
        clearSession();
        setUser(null);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    })();
  }, [loadLandlordProfile]);

  /**
   * The API client clears the token on any 401, including from a background
   * request no screen is awaiting. Mirror that into React state so the UI can't
   * keep showing a signed-in shell over a dead session.
   */
  useEffect(() => {
    function onCleared() {
      requestId.current++;
      setUser(null);
      setLandlordProfile(null);
    }
    window.addEventListener(SESSION_CLEARED_EVENT, onCleared);
    return () => window.removeEventListener(SESSION_CLEARED_EVENT, onCleared);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.signIn({ email, password });
      if (!result.token) {
        // Sign-in without a token would leave the app "logged in" but unable to
        // make a single authenticated call.
        throw new ApiError(500, "NO_SESSION_TOKEN", "Sign-in did not return a session token.");
      }
      const id = ++requestId.current;
      setToken(result.token);
      setUser(result.user);
      await loadLandlordProfile(result.user);
      if (id !== requestId.current) return result.user;
      setLoading(false);
      return result.user;
    },
    [loadLandlordProfile],
  );

  const signOut = useCallback(async () => {
    requestId.current++;
    try {
      await authApi.signOut();
    } catch {
      // A failed sign-out still ends the local session — the token is dropped
      // either way, and leaving the user stuck signed-in would be worse.
    }
    clearSession();
    setUser(null);
    setLandlordProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadLandlordProfile(user);
  }, [loadLandlordProfile, user]);

  const refreshUser = useCallback(async () => {
    const session = await authApi.getSession();
    const sessionUser = session?.user ?? null;
    // A null user here means the session died between calls; the 401 handler has
    // already cleared the token, so don't overwrite that with a half-state.
    if (sessionUser) setUser(sessionUser);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, landlordProfile, loading, signIn, signOut, refreshProfile, refreshUser }),
    [user, landlordProfile, loading, signIn, signOut, refreshProfile, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/**
 * Whether this landlord may create or edit properties. Both conditions are the
 * backend's: no profile is `403 LANDLORD_PROFILE_NOT_FOUND`, an unapproved one is
 * `403 LANDLORD_NOT_VERIFIED`. Checking here keeps the UI from offering an action
 * that is guaranteed to fail.
 */
export function useCanManageProperties(): boolean {
  const { user, landlordProfile } = useAuth();
  return user?.role === "LANDLORD" && landlordProfile?.verified === true;
}
