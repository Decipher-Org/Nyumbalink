/**
 * Pricing copy for the landing page.
 *
 * Payments (M4) and subscriptions (M5) are not built on the backend yet, so
 * these are static. When those land, the plan data moves to the API and only
 * this file changes — components read the shapes below, never literals.
 */

export type TenantPlan = {
  price: number;
  unit: string;
  window: string;
  blurb: string;
  perks: string[];
};

export type LandlordTier = {
  name: string;
  price: number;
  cap: string;
  badge?: string;
};

export const TENANT_PLAN: TenantPlan = {
  price: 20,
  unit: "day",
  window: "Access for 24 hours",
  blurb: "Pay a small daily fee to unlock landlord contact details.",
  perks: ["Unlimited contact unlocks", "Call landlords directly", "Cancel anytime"],
};

export const LANDLORD_TIERS: LandlordTier[] = [
  { name: "Basic", price: 800, cap: "Up to 5 properties" },
  { name: "Standard", price: 1500, cap: "Up to 20 properties", badge: "Most popular" },
  { name: "Premium", price: 2500, cap: "Unlimited properties" },
];

export const LANDLORD_PRICING_BLURB =
  "Affordable subscriptions to list and manage your properties.";

export const PAYMENT_NOTE = "All payments are securely processed via M-Pesa.";

/** Rent and fees are integer KES on the backend — no decimals anywhere. */
export function formatKes(amount: number): string {
  return new Intl.NumberFormat("en-KE").format(amount);
}
