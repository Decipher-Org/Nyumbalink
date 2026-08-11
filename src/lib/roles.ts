/**
 * Account role, matching the backend's `UserRole` enum.
 *
 * ADMIN is deliberately absent: `propertyHubBackend/src/auth/index.js` coerces
 * any non-TENANT/LANDLORD role to TENANT on create, so an admin can never be
 * self-registered. Admin accounts are provisioned separately.
 */
export type SignupRole = "TENANT" | "LANDLORD";

export const SIGNUP_ROLES: readonly SignupRole[] = ["TENANT", "LANDLORD"] as const;

/**
 * Resolves the `?role=` query param to a role, or null when it is missing or
 * unrecognised.
 *
 * Returning null rather than defaulting is the point: the backend silently
 * makes an unspecified signup a TENANT, so a landlord who slipped through a
 * roleless form would be mis-provisioned with no error. A null here routes the
 * visitor to the chooser instead of guessing.
 */
export function parseRoleParam(value: string | null): SignupRole | null {
  if (!value) return null;

  const normalised = value.trim().toUpperCase();
  return SIGNUP_ROLES.includes(normalised as SignupRole)
    ? (normalised as SignupRole)
    : null;
}

export const ROLE_LABELS: Record<SignupRole, string> = {
  TENANT: "Tenant",
  LANDLORD: "Landlord",
};
