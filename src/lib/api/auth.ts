/**
 * Authentication calls against Better Auth (`/api/auth/*`).
 *
 * The order matters and is not negotiable: the backend runs with
 * `autoSignIn: false` and `requireEmailVerification: true`, so **sign-up returns
 * no token**. The only working sequence is
 *
 *     signUp -> (OTP arrives by email) -> verifyEmail -> signIn
 *
 * `role` is always sent explicitly, because the backend coerces an unspecified
 * or unrecognised role to `TENANT` without complaint — a landlord who signed up
 * without it would silently get the wrong account.
 */

import { authFetch } from "./client";
import type { AuthResponse, Role, SessionResponse } from "./types";

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  /** ADMIN is rejected by design; admins are provisioned server-side. */
  role: Extract<Role, "TENANT" | "LANDLORD">;
  /**
   * Optional, and **omit the key entirely when blank** — the column is
   * `@@unique`, and Postgres treats two empty strings as a collision while
   * allowing many NULLs. Sending `""` would make the second signup fail with an
   * error about a phone number the user never typed.
   *
   * Stored but never verified: `sendSMSOTP` is a stub that only logs, so
   * `/phone-number/verify` cannot complete. It is contact detail, not a second
   * factor.
   */
  phoneNumber?: string;
};

/** Creates the account and dispatches a 6-digit verification OTP. */
export function signUp(input: SignUpInput): Promise<AuthResponse> {
  return authFetch<AuthResponse>("/sign-up/email", { method: "POST", body: input, auth: false });
}

export function signIn(input: { email: string; password: string }): Promise<AuthResponse> {
  return authFetch<AuthResponse>("/sign-in/email", { method: "POST", body: input, auth: false });
}

export function verifyEmail(input: { email: string; otp: string }): Promise<{ status?: boolean }> {
  return authFetch("/email-otp/verify-email", { method: "POST", body: input, auth: false });
}

export type OtpType = "email-verification" | "forget-password" | "sign-in";

/** (Re)send an OTP. Also the first step of a password reset. */
export function sendVerificationOtp(input: { email: string; type: OtpType }): Promise<unknown> {
  return authFetch("/email-otp/send-verification-otp", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function resetPassword(input: {
  email: string;
  otp: string;
  password: string;
}): Promise<unknown> {
  return authFetch("/email-otp/reset-password", { method: "POST", body: input, auth: false });
}

/** Rehydrate from a stored token. Resolves to null-ish when the token is dead. */
export function getSession(): Promise<SessionResponse> {
  return authFetch<SessionResponse>("/get-session");
}

export function signOut(): Promise<unknown> {
  return authFetch("/sign-out", { method: "POST" });
}
