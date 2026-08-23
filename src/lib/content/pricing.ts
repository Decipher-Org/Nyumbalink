/**
 * Pricing copy for the landing page.
 *
 * ## Why this is still static after M4 and M5
 *
 * The in-app figures are not: every amount a signed-in user sees comes from the API
 * — `GET /subscriptions/tenant` carries `price`, and a landlord's amount is quoted
 * per property before any prompt goes out. That is not negotiable, because the
 * server prices each charge itself and a client-computed figure could differ from
 * what the handset is asked for.
 *
 * This page is different: it is pre-auth marketing on the first paint of the site,
 * where a fetch buys a spinner in exchange for a number that changes about never.
 *
 * **The cost of that choice is a coupling, so it is written down here:** the two
 * literals below mirror `PRICE_TENANT_DAILY_ACCESS` and `PRICE_LANDLORD_UNIT` in the
 * backend's `.env`, and changing either there means changing it here. Nothing
 * enforces it.
 *
 * **In development they will disagree on purpose.** The backend runs `PRICE_*=1`
 * while payments are being tested, so the app quotes KSh 1 where this page says 200.
 * That is the testing configuration showing through, not a bug to chase.
 */

export type TenantPass = {
  /** KES for one pass. Mirrors `PRICE_TENANT_DAILY_ACCESS`. */
  price: number;
  unit: string;
  window: string;
  blurb: string;
  perks: string[];
};

export type LandlordPricing = {
  /** KES per rentable unit, per term. Mirrors `PRICE_LANDLORD_UNIT`. */
  unitPrice: number;
  termDays: number;
  /**
   * The worked example on the card. A per-unit price is meaningless without one —
   * "KSh 40 per unit" reads as the whole bill until you see it multiplied out.
   */
  example: { units: number };
};

/**
 * The pass unlocks **browsing**, not contact details.
 *
 * Worth being exact about, because the wording it replaced ("unlock landlord contact
 * details") described a product we do not sell and set up the wrong expectation
 * entirely: `requireTenantAccess` gates the listings themselves, so without a pass
 * there is no catalogue to browse, not merely hidden phone numbers.
 *
 * The perks deliberately match the list on `routes/tenant/AccessRequired.tsx` — the
 * paywall and the advert should promise the same three things in the same words.
 */
export const TENANT_PASS: TenantPass = {
  price: 200,
  unit: "day",
  window: "Full access for 24 hours",
  blurb: "One payment opens every listing on NyumbaLink for a day.",
  perks: [
    "Every listing, unlimited searches",
    "Landlord phone numbers and direct chat",
    "Nothing to cancel — it just ends",
  ],
};

/**
 * No tiers, no property caps.
 *
 * The three tiers this replaced (Basic 800 / Standard 1500 / Premium 2500, capped at
 * 5 / 20 / unlimited properties) were not merely the wrong numbers — they were the
 * wrong shape. A landlord buys a term **per property**, priced by that property's
 * unit count, so someone with four blocks holds four independent subscriptions and
 * can be paid up on three of them. No single tier can express that.
 */
export const LANDLORD_PRICING: LandlordPricing = {
  unitPrice: 40,
  termDays: 30,
  example: { units: 3 },
};

export const PAYMENT_NOTE = "All payments are securely processed via M-Pesa.";

/** Rent and fees are integer KES on the backend — no decimals anywhere. */
export function formatKes(amount: number): string {
  return new Intl.NumberFormat("en-KE").format(amount);
}
