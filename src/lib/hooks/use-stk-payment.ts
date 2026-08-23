/**
 * The 202-then-poll dance every M-Pesa checkout in this app repeats.
 *
 * `POST /subscriptions/*` answers `202` with a payment at `QUEUED`, which means
 * PayHero has been asked to put an STK prompt on a handset. Nothing is decided
 * yet: the customer has to see the prompt, enter a PIN, and let the callback land
 * before the payment reaches `SUCCESS`, `FAILED` or `CANCELLED`. There is no
 * socket and no react-query here, so the only way to learn the outcome is to
 * re-read `GET /payments/:id` until it stops being provisional.
 *
 * That loop lives here rather than in each screen because getting it wrong is
 * easy in ways that cost real money to diagnose — and because a tenant pass, a
 * landlord term and a unit top-up are the same flow with different copy.
 *
 * ## A timeout is not a failure
 *
 * This is the design decision that matters most. When polling gives up, the
 * prompt may still be sitting unanswered on the handset, and it can settle
 * afterwards — the callback does not care whether anyone is still watching. So
 * `timeout` is a distinct phase from `failed`, and a screen must render it as "we
 * stopped watching, check your history" rather than "payment failed". Telling
 * someone their payment failed and then taking their money is the worst outcome
 * available here.
 *
 * ## Why `reused` is surfaced
 *
 * The backend collapses a repeated initiate onto the payment already in flight
 * instead of pushing a second prompt. A caller that ignored `reused` would say
 * "check your phone" about a prompt it never sent, which reads as broken when the
 * first one has already been dismissed.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { getPayment } from "@/lib/api/payments";
import { isTerminalPayment, RESULT_CODE, type Payment, type PaymentInitiation } from "@/lib/api/types";

/** How often to re-read the payment. */
const POLL_INTERVAL_MS = 2_000;

/**
 * How long to keep watching. Daraja's own prompt expires at about 60s; this
 * allows for that plus the callback round trip and a slow settle, and then stops
 * rather than polling a pooled database forever.
 */
const POLL_CEILING_MS = 120_000;

export type StkPhase =
  | "idle"
  /** The initiate request is in flight — no prompt has been sent yet. */
  | "starting"
  /** `202` received; the prompt is on the handset and we are watching. */
  | "polling"
  | "success"
  | "failed"
  /** We stopped watching. The payment may still settle. */
  | "timeout";

export type StkResult = {
  phase: StkPhase;
  /** The latest known state of the payment, from the `202` and then each poll. */
  payment: Payment | null;
  /** True when the backend reused an in-flight payment instead of pushing again. */
  reused: boolean;
  /** Set only when the *initiate* failed — a refused payment is `phase: "failed"`. */
  error: unknown;
  /** Ready-to-render explanation of a `failed` payment. Null otherwise. */
  failureMessage: string | null;
  busy: boolean;
  start: (initiate: () => Promise<PaymentInitiation>) => Promise<void>;
  reset: () => void;
};

/**
 * Turn a settled-unhappy payment into something worth reading.
 *
 * Branches on `resultCode`, not on `resultDesc`: the backend's DTO comment says
 * outright that the strings are not stable enough to match on, while the codes
 * are Daraja's and do not move.
 */
function explainFailure(payment: Payment): string {
  switch (payment.resultCode) {
    case RESULT_CODE.CANCELLED_BY_USER:
      return "The M-Pesa prompt was cancelled. Nothing was charged — try again when you're ready.";
    case RESULT_CODE.INSUFFICIENT_FUNDS:
      return "There wasn't enough in the M-Pesa account to complete this. Top up and try again.";
    case RESULT_CODE.TIMEOUT:
      return "The prompt expired before it was answered. Nothing was charged — try again.";
    case RESULT_CODE.WRONG_PIN:
      return "That M-Pesa PIN wasn't accepted. Nothing was charged — try again.";
    default:
      // `resultDesc` is the gateway's own words and `failureReason` is ours; either
      // beats inventing an apology, and both are absent often enough to need a floor.
      return (
        payment.failureReason ??
        payment.resultDesc ??
        "The payment didn't go through. Nothing was charged."
      );
  }
}

export function useStkPayment(): StkResult {
  const [phase, setPhase] = useState<StkPhase>("idle");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [reused, setReused] = useState(false);
  const [error, setError] = useState<unknown>(null);

  /**
   * One controller per run, aborted on unmount and on `reset`. Without it a poll
   * outlives the dialog that started it and writes state into a dead component —
   * and keeps hitting the API while it does.
   */
  const runRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => runRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    runRef.current?.abort();
    runRef.current = null;
    setPhase("idle");
    setPayment(null);
    setReused(false);
    setError(null);
  }, []);

  const start = useCallback(async (initiate: () => Promise<PaymentInitiation>) => {
    // A second tap while one is running would leave two pollers writing to the
    // same state. The first run wins; the button should be disabled anyway.
    if (runRef.current) return;

    const controller = new AbortController();
    runRef.current = controller;

    setPhase("starting");
    setPayment(null);
    setReused(false);
    setError(null);

    let current: Payment;
    try {
      const initiation = await initiate();
      if (controller.signal.aborted) return;

      current = initiation.payment;
      setPayment(current);
      setReused(initiation.reused);
    } catch (err) {
      if (controller.signal.aborted) return;
      runRef.current = null;
      setError(err);
      setPhase("failed");
      return;
    }

    // The 202 is normally `QUEUED`, but a reused payment can already be settled —
    // checking first means we don't poll something that has finished.
    if (isTerminalPayment(current.status)) {
      runRef.current = null;
      setPhase(current.status === "SUCCESS" ? "success" : "failed");
      return;
    }

    setPhase("polling");

    const deadline = Date.now() + POLL_CEILING_MS;

    while (!controller.signal.aborted && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      if (controller.signal.aborted) return;

      try {
        const next = await getPayment(current.id, controller.signal);
        if (controller.signal.aborted) return;

        current = next;
        setPayment(next);

        if (isTerminalPayment(next.status)) {
          runRef.current = null;
          setPhase(next.status === "SUCCESS" ? "success" : "failed");
          return;
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        // A dropped poll is not a dropped payment. Network blips and the 1-17s
        // latencies this backend sees would otherwise abandon a payment that is
        // about to succeed, so keep polling until the deadline and let the
        // timeout phase — which does not claim failure — be the honest outcome.
        if (err instanceof ApiError && err.isNetworkError) continue;
        if (err instanceof ApiError && err.status >= 500) continue;
        runRef.current = null;
        setError(err);
        setPhase("failed");
        return;
      }
    }

    if (controller.signal.aborted) return;
    runRef.current = null;
    setPhase("timeout");
  }, []);

  return {
    phase,
    payment,
    reused,
    error,
    failureMessage:
      phase === "failed" && payment
        ? explainFailure(payment)
        : phase === "failed" && error instanceof ApiError
          ? error.message
          : null,
    busy: phase === "starting" || phase === "polling",
    start,
    reset,
  };
}
