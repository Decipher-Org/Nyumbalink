/**
 * The register → verify → sign-in handoff.
 *
 * Sign-up returns no session token (`autoSignIn: false`,
 * `requireEmailVerification: true`), and verifying the OTP does not return one
 * either. So the only way to land a freshly-registered user in their dashboard is
 * to sign in for them right after verification — which needs the password they
 * just typed.
 *
 * It is held **in memory only**, in this module, and consumed once. Deliberately
 * not in `localStorage`, `sessionStorage`, a URL, or router `location.state` —
 * every one of those persists a password to disk. The cost is that a page reload
 * on the verify screen loses it; that path falls back to sending the user to the
 * login form, which is a small inconvenience rather than a stored credential.
 */

import type { SignupRole } from "@/lib/roles";

type PendingSignup = {
  email: string;
  password: string;
  role: SignupRole;
  /** Where to go once signed in, carried through from the hero search. */
  next?: string;
};

let pending: PendingSignup | null = null;

export function setPendingSignup(value: PendingSignup): void {
  pending = value;
}

/** Read without consuming — the verify screen needs the email to display. */
export function peekPendingSignup(): PendingSignup | null {
  return pending;
}

/** Read and clear. Call once the credentials have been used to sign in. */
export function takePendingSignup(): PendingSignup | null {
  const value = pending;
  pending = null;
  return value;
}

export function clearPendingSignup(): void {
  pending = null;
}
