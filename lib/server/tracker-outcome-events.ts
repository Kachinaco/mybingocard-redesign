import {
  enqueueTrackerOutcome,
  type TrackerOutcomeBody,
} from "@/lib/db/tracker-outcomes";

export interface VerifiedAccountOutcomeInput {
  userId: string;
  verifiedAt: Date;
}

export function buildVerifiedAccountOutcome(
  input: VerifiedAccountOutcomeInput
): TrackerOutcomeBody {
  return {
    schemaVersion: 1,
    eventId: `account_completed:${input.userId}`,
    type: "signup_completed",
    occurredAt: input.verifiedAt.toISOString(),
    entity: {
      type: "account",
      id: input.userId,
    },
    properties: {
      source: "account_verified",
      status: "completed",
    },
  };
}

export function enqueueVerifiedAccountOutcome(
  input: VerifiedAccountOutcomeInput
) {
  return enqueueTrackerOutcome(
    buildVerifiedAccountOutcome(input),
    input.verifiedAt
  );
}

type PaymentProduct =
  | "stripe_subscription"
  | "stripe_lifetime"
  | "stripe_batch_pack"
  | "stripe_invite_pack"
  | "stripe_share_links"
  | "apple_premium"
  | "apple_batch_pack";

function buildPaymentOutcome(input: {
  eventId: string;
  entityType: "stripe_payment" | "apple_transaction";
  entityId: string;
  occurredAt: Date;
  product: PaymentProduct;
  source: "stripe_webhook" | "apple_store";
  amountMinor?: number;
  currency?: string;
}): TrackerOutcomeBody {
  return {
    schemaVersion: 1,
    eventId: input.eventId,
    type: "payment_completed",
    occurredAt: input.occurredAt.toISOString(),
    entity: {
      type: input.entityType,
      id: input.entityId,
    },
    properties: {
      product: input.product,
      source: input.source,
      status: "paid",
    },
    ...(input.amountMinor && input.currency
      ? {
          revenue: {
            amountMinor: input.amountMinor,
            currency: input.currency,
          },
        }
      : {}),
  };
}

function enqueuePaymentOutcome(
  input: Parameters<typeof buildPaymentOutcome>[0]
) {
  return enqueueTrackerOutcome(
    buildPaymentOutcome(input),
    input.occurredAt
  );
}

export interface StripePaymentOutcomeInput {
  paymentId: string;
  occurredAt: Date;
  product: Extract<PaymentProduct, `stripe_${string}`>;
  amountMinor: number;
  currency: string;
}

export function buildStripePaymentOutcome(
  input: StripePaymentOutcomeInput
): TrackerOutcomeBody {
  return buildPaymentOutcome({
    eventId: `stripe_payment:${input.paymentId}`,
    entityType: "stripe_payment",
    entityId: input.paymentId,
    occurredAt: input.occurredAt,
    product: input.product,
    source: "stripe_webhook",
    amountMinor: input.amountMinor,
    currency: input.currency,
  });
}

export function enqueueStripePaymentOutcome(
  input: StripePaymentOutcomeInput
) {
  return enqueueTrackerOutcome(
    buildStripePaymentOutcome(input),
    input.occurredAt
  );
}

export function calculateIncrementalStripeRefundAmount(
  cumulativeAmount: unknown,
  previousCumulativeAmount: unknown
): number | null {
  if (
    !Number.isSafeInteger(cumulativeAmount)
    || Number(cumulativeAmount) <= 0
    || !Number.isSafeInteger(previousCumulativeAmount)
    || Number(previousCumulativeAmount) < 0
    || Number(previousCumulativeAmount) >= Number(cumulativeAmount)
  ) {
    return null;
  }
  return Number(cumulativeAmount) - Number(previousCumulativeAmount);
}

export function enqueueStripeRefundOutcome(input: {
  eventId: string;
  chargeId: string;
  occurredAt: Date;
  amountMinor: number;
  currency: string;
}) {
  return enqueueTrackerOutcome({
    schemaVersion: 1,
    eventId: `stripe:${input.eventId}`,
    type: "payment_refunded",
    occurredAt: input.occurredAt.toISOString(),
    entity: { type: "stripe_charge", id: input.chargeId },
    properties: {
      source: "stripe_webhook",
      status: "refunded",
    },
    revenue: {
      amountMinor: input.amountMinor,
      currency: input.currency,
    },
  }, input.occurredAt);
}

export function enqueueStripeDisputeOutcome(input: {
  eventId: string;
  disputeId: string;
  occurredAt: Date;
  amountMinor: number;
  currency: string;
  recovered: boolean;
}) {
  return enqueueTrackerOutcome({
    schemaVersion: 1,
    eventId: `stripe:${input.eventId}`,
    type: input.recovered
      ? "payment_dispute_recovered"
      : "payment_disputed",
    occurredAt: input.occurredAt.toISOString(),
    entity: { type: "stripe_dispute", id: input.disputeId },
    properties: {
      source: "stripe_webhook",
      status: input.recovered ? "won" : "opened",
    },
    revenue: {
      amountMinor: input.amountMinor,
      currency: input.currency,
    },
  }, input.occurredAt);
}

export interface ApplePaymentOutcomeInput {
  transactionId: string;
  occurredAt: Date;
  product: Extract<PaymentProduct, `apple_${string}`>;
}

export function buildApplePaymentOutcome(
  input: ApplePaymentOutcomeInput
): TrackerOutcomeBody {
  return buildPaymentOutcome({
    eventId: `apple:${input.transactionId}`,
    entityType: "apple_transaction",
    entityId: `apple_tx:${input.transactionId}`,
    occurredAt: input.occurredAt,
    product: input.product,
    source: "apple_store",
  });
}

export function enqueueApplePaymentOutcome(
  input: ApplePaymentOutcomeInput
) {
  return enqueueTrackerOutcome(
    buildApplePaymentOutcome(input),
    input.occurredAt
  );
}

export interface AppleRefundOutcomeInput {
  transactionId: string;
  refundedAt: Date;
}

export function buildAppleRefundOutcome(
  input: AppleRefundOutcomeInput
): TrackerOutcomeBody {
  return {
    schemaVersion: 1,
    eventId: `apple_refund:${input.transactionId}`,
    type: "payment_refunded",
    occurredAt: input.refundedAt.toISOString(),
    entity: {
      type: "apple_transaction",
      id: `apple_tx:${input.transactionId}`,
    },
    properties: {
      source: "apple_store",
      status: "refunded",
    },
  };
}

export function enqueueAppleRefundOutcome(
  input: AppleRefundOutcomeInput
) {
  return enqueueTrackerOutcome(
    buildAppleRefundOutcome(input),
    input.refundedAt
  );
}

export function tryEnqueueVerifiedAccountOutcome(
  input: VerifiedAccountOutcomeInput,
  enqueue = enqueueVerifiedAccountOutcome
): boolean {
  try {
    enqueue(input);
    return true;
  } catch {
    console.error(
      "Verified account outcome enqueue failed; reconciliation will retry it."
    );
    return false;
  }
}
