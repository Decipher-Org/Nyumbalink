/**
 * The account itself (`/api/v1/users`), as distinct from the role profile.
 *
 * A `User` holds name, email and phone; a `LandlordProfile`/`TenantProfile` holds
 * everything role-specific. They are separate records behind separate endpoints,
 * so "change my name" and "change my business name" are different requests.
 *
 * ## This router returns its own user shape
 *
 * `toPublicUser` in `src/routes/users.js` renames three fields relative to the
 * `AuthUser` that Better Auth returns — `phone`, `isVerified`, `phoneVerified`
 * against `phoneNumber`, `emailVerified`, `phoneNumberVerified`. Rather than
 * quietly map one onto the other, `PublicUser` is typed as what the endpoint
 * actually sends, and screens that need the app-wide shape refresh the session
 * instead.
 *
 * ## Two of these calls end the session
 *
 * Both are documented at their call sites and neither is avoidable client-side:
 *
 *  - `changeMyPassword` is `auth.api.changePassword({ revokeOtherSessions: true })`,
 *    which deletes **every** session for the user — the current one included —
 *    and mints a replacement. The replacement token is returned to the backend
 *    and dropped there, so the browser never receives it.
 *  - `deactivateMyAccount` flips `status` to `DEACTIVATED` and revokes sessions.
 *
 * Either way the stored bearer token is dead the moment the call succeeds, and
 * the only correct response is to sign the user out locally.
 */

import { apiFetch } from "./client";
import type { Role, UserStatus } from "./types";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isVerified: boolean;
  phoneVerified: boolean;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export function getMyAccount(): Promise<{ user: PublicUser }> {
  return apiFetch<{ user: PublicUser }>("/users/me");
}

export type AccountUpdateInput = {
  /** Must be non-empty once trimmed; there is no way to clear a name. */
  name?: string;
  /**
   * `null` clears it. Never send `""` — the column is `@@unique`, and Postgres
   * treats two empty strings as a collision while allowing many NULLs, so a blank
   * would eventually fail as `PHONE_ALREADY_IN_USE` for an unrelated account.
   *
   * Any change resets `phoneNumberVerified` to false. Nothing re-verifies it:
   * `sendSMSOTP` is a stub that only logs.
   */
  phone?: string | null;
};

/** `409 PHONE_ALREADY_IN_USE` when another account holds that number. */
export function updateMyAccount(input: AccountUpdateInput): Promise<{ user: PublicUser }> {
  return apiFetch<{ user: PublicUser }>("/users/me", { method: "PATCH", body: input });
}

/**
 * Changes the password and, as a side effect, **ends every session including this
 * one**. See the module note. Callers must sign out locally on success.
 *
 * `401 CURRENT_PASSWORD_INCORRECT` when the current password is wrong.
 */
export function changeMyPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<unknown> {
  return apiFetch("/users/me/password", { method: "PATCH", body: input });
}

/**
 * Deactivation, not deletion: the row survives with `status: DEACTIVATED`, which
 * `databaseHooks.session.create.before` then refuses to sign in. Reversing it is
 * an admin action, so this needs a confirmation step in the UI.
 */
export function deactivateMyAccount(): Promise<unknown> {
  return apiFetch("/users/me", { method: "DELETE" });
}

/** Better Auth's own bounds, from `ctx.context.password.config`. */
export const PASSWORD_LIMITS = { min: 8, max: 128 } as const;
