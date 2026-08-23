/**
 * Payment calls (`/api/v1/payments`).
 *
 * Two facts shape everything here:
 *
 *  1. **The client never names an amount.** `POST /payments/initiate` accepts a
 *     `purpose` and prices it server-side — from `config.pricing` for the flat
 *     purposes, or from a per-property unit quote for the subscription ones. A
 *     client-supplied `amount` is discarded rather than rejected, so sending one
 *     would be silently pointless. Nothing here has an `amount` parameter.
 *  2. **Initiation is asynchronous.** A `202` means an STK prompt is on its way
 *     to a handset. The payment sits at `QUEUED` until PayHero's callback settles
 *     it, so the outcome is discovered by re-reading `GET /payments/:id` — see
 *     `lib/hooks/use-stk-payment.ts`, which is where that loop belongs.
 *
 * Initiation itself is not exported from here. Every purpose the app actually
 * offers is a subscription, and those go through the wrappers in
 * `lib/api/subscriptions.ts` — one payment path, not two.
 *
 * ## These three endpoints wrap their payload; most of the API does not
 *
 * `GET /properties` answers `data: [...]` and `GET /subscriptions/landlord` does
 * too, so the habit elsewhere in this folder is to hand `apiFetchPaged` the payload
 * type directly. The payment routes are the exception — they answer
 * `data: {payments}`, `data: {payment}` and `data: {payment, applied}` — so each
 * function here names the wrapper type and reads the key out.
 *
 * Worth spelling out because getting it wrong is invisible rather than loud: a
 * `{payment}` object cast to `Payment` has an `undefined` status, which
 * `isTerminalPayment` reads as "not settled yet". `use-stk-payment` would then poll
 * a *successful* payment for the full two minutes and report "still processing" —
 * the one outcome its own header calls the worst available.
 */

import { apiFetch, apiFetchPaged, type ApiPagination } from "./client";
import type { Payment, PaymentPurpose, PaymentStatus } from "./types";

export type PaymentListParams = {
  status?: PaymentStatus;
  purpose?: PaymentPurpose;
  page?: number;
  /** Defaults to 20 server-side, capped at 100. */
  limit?: number;
};

/**
 * The caller's own payments, newest first. Scoped to the token holder on the
 * server — there is no `userId` param, and a landlord cannot read another's history.
 */
export async function listPayments(
  params: PaymentListParams = {},
  signal?: AbortSignal,
): Promise<{ items: Payment[]; pagination?: ApiPagination }> {
  const { data, pagination } = await apiFetchPaged<{ payments: Payment[] }>("/payments", {
    query: params,
    signal,
  });
  return { items: data?.payments ?? [], pagination };
}

/** One payment. The poll target while an STK prompt is outstanding. */
export async function getPayment(id: string, signal?: AbortSignal): Promise<Payment> {
  const data = await apiFetch<{ payment: Payment }>(`/payments/${id}`, { signal });
  return data.payment;
}

/**
 * Ask PayHero what actually happened to a payment, and settle it if it has moved.
 *
 * This exists because **M-Pesa callbacks are routinely lost**, and the state that
 * follows a lost one is the worst the system holds: money deducted from a handset
 * against a payment still sitting at `PENDING`, so the pass or the units it paid for
 * were never granted. Reconciling reads the gateway directly and runs the same
 * settlement path the webhook would have, which is why the backend calls it safe to
 * repeat — an already-terminal payment simply reports itself.
 *
 * `applied: false` is not a failure. It means nothing had changed at the gateway
 * either, so the honest reading is "still awaiting confirmation" — and the envelope's
 * `message` says which of the several reasons applies (never reached the provider,
 * unknown to the provider yet, already settled). That message is returned rather than
 * dropped, because a caller inventing its own wording would flatten those apart cases
 * into one.
 */
export async function reconcilePayment(
  id: string,
  signal?: AbortSignal,
): Promise<{ payment: Payment; applied: boolean; message?: string }> {
  const { data, message } = await apiFetchPaged<{ payment: Payment; applied: boolean }>(
    `/payments/${id}/reconcile`,
    { method: "POST", signal },
  );
  return { payment: data.payment, applied: data.applied, message };
}
