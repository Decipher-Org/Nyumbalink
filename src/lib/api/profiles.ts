/**
 * Landlord and tenant profile calls (`/api/v1/landlords`, `/api/v1/tenants`).
 *
 * A profile is separate from the account: registering creates a `User`, and the
 * role-specific profile is a second step. A landlord's profile also carries
 * `verified`, which gates every property write — so the app must read it before
 * offering "Add property".
 */

import { apiFetch } from "./client";
import type { Gender, LandlordProfile, TenantProfile } from "./types";

export type LandlordProfileInput = {
  /** 6–20 letters or digits: a national ID or passport number. Required. */
  nationalId: string;
  /**
   * 2–100 characters. `null` clears it — an empty string is a validation error,
   * not an erasure, because the minimum length applies to whatever is sent.
   */
  businessName?: string | null;
  /** Local formats accepted (0722…, 254722…); normalised to E.164 server-side. */
  mpesaNumber?: string | null;
  /** An existing http(s) URL. Use `uploadProfilePhoto` to upload a file. */
  profilePhoto?: string | null;
};

export function createLandlordProfile(input: LandlordProfileInput): Promise<LandlordProfile> {
  return apiFetch<LandlordProfile>("/landlords/profile", { method: "POST", body: input });
}

export function getMyLandlordProfile(): Promise<LandlordProfile> {
  return apiFetch<LandlordProfile>("/landlords/me");
}

export function updateMyLandlordProfile(
  input: Partial<LandlordProfileInput>,
): Promise<LandlordProfile> {
  return apiFetch<LandlordProfile>("/landlords/me", { method: "PATCH", body: input });
}

export type TenantProfileInput = {
  /**
   * 2–100 characters. Like `businessName`, `null` clears it and `""` is a
   * validation error — the minimum length applies to whatever string is sent.
   */
  occupation?: string | null;
  gender?: Gender | null;
  /** An existing http(s) URL. Use `uploadProfilePhoto` to upload a file. */
  profilePhoto?: string | null;
};

export function createTenantProfile(input: TenantProfileInput): Promise<TenantProfile> {
  return apiFetch<TenantProfile>("/tenants/profile", { method: "POST", body: input });
}

export function getMyTenantProfile(): Promise<TenantProfile> {
  return apiFetch<TenantProfile>("/tenants/me");
}

export function updateMyTenantProfile(input: TenantProfileInput): Promise<TenantProfile> {
  return apiFetch<TenantProfile>("/tenants/me", { method: "PATCH", body: input });
}

/**
 * Photo upload. The endpoint takes the file as a `profilePhoto` part alongside
 * the other fields as text, so a photo change and a field change are one
 * request rather than two.
 */
export function uploadProfilePhoto(
  role: "landlords" | "tenants",
  file: File,
  fields: Record<string, string> = {},
): Promise<LandlordProfile | TenantProfile> {
  const form = new FormData();
  form.append("profilePhoto", file);
  for (const [key, value] of Object.entries(fields)) form.append(key, value);

  return apiFetch<LandlordProfile | TenantProfile>(`/${role}/me`, {
    method: "PATCH",
    body: form,
  });
}
