/**
 * Subscription calls (`/api/v1/subscriptions`).
 *
 * ## What a subscription is here
 *
 * Two unrelated things share the word. A **tenant** buys a browsing pass — one
 * per person, 24 hours, and without it the catalogue returns `403`. A **landlord**
 * buys a term per *property*, priced at 40 KES per rentable unit for 30 days.
 * Someone with four blocks has four subscriptions and can be paid up on three.
 *
 * ## Quote before you push
 *
 * Every landlord amount is `sum(totalUnits) × unitPrice`, computed server-side.
 * The client's job is to *show* that figure before initiating, never to compute
 * it: an unexpected prompt is a cancelled push, and ten successive cancellations
 * block that phone number for 24 hours account-wide. Hence `quoteLandlordTerm`
 * and `quoteUnitTopup` existing separately from the buy calls.
 *
 * ## Buying is a payment
 *
 * The `POST`s here are thin wrappers over `initiatePayment` — they return the
 * same `202 {payment, reused}` as `/payments/initiate` and settle through the
 * same callback. So the outcome is polled with `use-stk-payment`, exactly as any
 * other payment would be, and there is only one settlement path to reason about.
 */

import { apiFetch } from "./client";
import type {
  LandlordSubscriptionDetail,
  LandlordSubscriptionRow,
  PaymentInitiation,
  SubscriptionQuote,
  TenantAccess,
} from "./types";

/**
 * `phoneNumber` is optional everywhere: omitted, the backend charges the number
 * verified on the account, and answers `400 VALIDATION_ERROR` when there is
 * none. Kenyan local format (`0722334455`) is normalised server-side.
 */
type Payer = { phoneNumber?: string };

// ------------------------------------------------------------------ tenant

/**
 * Whether the caller may browse, and until when.
 *
 * Answers for landlords and admins too, as `{active: true, exempt: true,
 * expiresAt: null}` — they are never gated, and a client that rendered "your pass
 * expired" at a landlord would be showing them a bill they do not owe. Check
 * `exempt` before rendering anything about a pass.
 */
export function getTenantAccess(signal?: AbortSignal): Promise<TenantAccess> {
  return apiFetch<TenantAccess>("/subscriptions/tenant", { signal });
}

/**
 * Buy a browsing pass. `202`, then poll.
 *
 * Buying while one is still live **stacks**: the new term starts when the current
 * one ends rather than replacing it, so nobody loses paid time by renewing early.
 *
 * A landlord or admin is refused with `400 SUBSCRIPTION_NOT_REQUIRED` rather than
 * charged — they already browse freely, and taking their money for a pass that
 * changes nothing would be selling them air.
 */
export function buyTenantPass(payer: Payer = {}): Promise<PaymentInitiation> {
  return apiFetch<PaymentInitiation>("/subscriptions/tenant", {
    method: "POST",
    body: payer,
  });
}

// ---------------------------------------------------------------- landlord

/**
 * Every property the caller owns and what each has paid for, in **one** request.
 *
 * Deliberately not one call per property: this is the landlord's dashboard read,
 * and the backend answers it with a single query precisely so a portfolio does
 * not cost N round trips to a pooled database in another region.
 */
export async function listLandlordSubscriptions(
  signal?: AbortSignal,
): Promise<LandlordSubscriptionRow[]> {
  const data = await apiFetch<LandlordSubscriptionRow[]>("/subscriptions/landlord", { signal });
  return data ?? [];
}

/**
 * One property in full, including its last ten grants (purchases, renewals,
 * top-ups). A property the caller does not own answers `404` rather than `403`:
 * a 403 would confirm the id exists, and this view leaks a unit count and a
 * renewal date on top of that.
 */
export function getLandlordSubscription(
  propertyId: string,
  signal?: AbortSignal,
): Promise<LandlordSubscriptionDetail> {
  return apiFetch<LandlordSubscriptionDetail>("/subscriptions/landlord", {
    query: { propertyId },
    signal,
  });
}

/** What a fresh 30-day term for this property would cost, at its current unit count. */
export function quoteLandlordTerm(
  propertyId: string,
  signal?: AbortSignal,
): Promise<SubscriptionQuote> {
  return apiFetch<SubscriptionQuote>("/subscriptions/landlord/quote", {
    query: { propertyId },
    signal,
  });
}

/**
 * What adding `additionalUnits` of capacity mid-term would cost.
 *
 * Priced at the rate the term was bought on rather than today's, and charged in
 * full rather than pro-rated for the days remaining — a top-up extends a deal
 * already struck.
 */
export function quoteUnitTopup(
  propertyId: string,
  additionalUnits: number,
  signal?: AbortSignal,
): Promise<SubscriptionQuote> {
  return apiFetch<SubscriptionQuote>("/subscriptions/landlord/quote", {
    query: { propertyId, additionalUnits },
    signal,
  });
}

/**
 * Buy or renew a term for one property. `202`, then poll.
 *
 * Unlike a tenant pass this **restarts** the term from settlement rather than
 * stacking, and sets `paidUnits` to whatever the property lists at that moment.
 */
export function buyLandlordTerm(
  propertyId: string,
  payer: Payer = {},
): Promise<PaymentInitiation> {
  return apiFetch<PaymentInitiation>("/subscriptions/landlord", {
    method: "POST",
    body: { propertyId, ...payer },
  });
}

/** Buy capacity mid-term. Increments `paidUnits`; the expiry date is untouched. */
export function buyUnitTopup(
  propertyId: string,
  additionalUnits: number,
  payer: Payer = {},
): Promise<PaymentInitiation> {
  return apiFetch<PaymentInitiation>("/subscriptions/landlord/topup", {
    method: "POST",
    body: { propertyId, additionalUnits, ...payer },
  });
}
