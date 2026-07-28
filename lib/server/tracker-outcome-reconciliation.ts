import type { SqliteDocumentStore } from "@/lib/sqlite-document-store";
import type { User } from "@/lib/db/users";
import type { BatchPurchase } from "@/lib/db/batchPurchases";
import type { AppleIapTransactionRecord } from "@/lib/db/apple-iap";
import {
  TRACKER_OUTCOME_OUTBOX_COLLECTION,
  buildTrackerOutcomeBody,
  enqueueTrackerOutcome,
  type TrackerOutcomeBody,
  type TrackerOutcomeOutboxRecord,
} from "@/lib/db/tracker-outcomes";
import {
  buildApplePaymentOutcome,
  buildAppleRefundOutcome,
  buildStripePaymentOutcome,
  buildVerifiedAccountOutcome,
} from "@/lib/server/tracker-outcome-events";

type ActivityRecord = {
  event?: string;
  userId?: string | null;
  createdAt?: Date;
};

type Candidate = {
  body: TrackerOutcomeBody;
  source: "account" | "stripe" | "apple";
};

export interface TrackerOutcomeReconciliationSummary {
  mode: "audit" | "apply";
  scanned: {
    accounts: number;
    stripeBatchPurchases: number;
    appleTransactions: number;
  };
  candidates: number;
  existing: number;
  missing: number;
  inserted: number;
  conflicts: number;
  skipped: Record<string, number>;
  byType: Record<string, number>;
  byCurrency: Record<string, number>;
}

function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] || 0) + 1;
}

function canonicalBody(body: TrackerOutcomeBody): string {
  return JSON.stringify(buildTrackerOutcomeBody(body));
}

function collectCandidates(
  store: SqliteDocumentStore,
  skipped: Record<string, number>
): { candidates: Candidate[]; scanned: TrackerOutcomeReconciliationSummary["scanned"]; conflicts: number } {
  const candidates = new Map<string, Candidate>();
  let conflicts = 0;

  const add = (candidate: Candidate) => {
    const body = buildTrackerOutcomeBody(candidate.body);
    const existing = candidates.get(body.eventId);
    if (existing) {
      if (canonicalBody(existing.body) !== JSON.stringify(body)) conflicts += 1;
      return;
    }
    candidates.set(body.eventId, { ...candidate, body });
  };

  const activities = store.findMany<ActivityRecord>("activity_events", {
    event: "email_verification_completed",
  });
  const credentialVerificationUserIds = new Set(
    activities
      .map((activity) => activity.userId)
      .filter((userId): userId is string => typeof userId === "string" && userId.length > 0)
  );
  const users = store.findMany<User>("users");
  for (const user of users) {
    const userId = user._id?.toString?.() || "";
    if (!userId || !validDate(user.emailVerified)) {
      increment(skipped, "account_missing_verified_state");
      continue;
    }
    if (["admin", "test", "guest"].includes(user.customerType || "")) {
      increment(skipped, "account_excluded_customer_type");
      continue;
    }
    const trustedProvider = ["google", "apple", "magic_link"].includes(user.signupMethod || "");
    const verifiedCredentials = user.signupMethod === "credentials"
      && credentialVerificationUserIds.has(userId);
    if (!trustedProvider && !verifiedCredentials) {
      increment(skipped, "account_missing_exact_verification_evidence");
      continue;
    }
    add({
      source: "account",
      body: buildVerifiedAccountOutcome({ userId, verifiedAt: user.emailVerified }),
    });
  }

  const batchPurchases = store.findMany<BatchPurchase>("batch_purchases", {
    purchaseProvider: "stripe",
  });
  for (const purchase of batchPurchases) {
    if (
      !purchase.stripeSessionId
      || !validDate(purchase.purchasedAt)
      || !Number.isSafeInteger(purchase.amount)
      || purchase.amount <= 0
      || !/^[a-zA-Z]{3}$/.test(purchase.currency || "")
    ) {
      increment(skipped, "stripe_batch_missing_authoritative_fields");
      continue;
    }
    if (!["paid", "generated", "refunded"].includes(purchase.status)) {
      increment(skipped, "stripe_batch_not_paid");
      continue;
    }
    add({
      source: "stripe",
      body: buildStripePaymentOutcome({
        paymentId: purchase.stripeSessionId,
        occurredAt: purchase.purchasedAt,
        product: "stripe_batch_pack",
        amountMinor: purchase.amount,
        currency: purchase.currency,
      }),
    });
  }

  const appleTransactions = store.findMany<AppleIapTransactionRecord>("apple_iap_transactions");
  for (const transaction of appleTransactions) {
    const transactionId = transaction.transactionId || "";
    const purchaseDate = transaction.purchaseDate;
    const product = transaction.purchaseType === "batch_pack"
      ? "apple_batch_pack" as const
      : transaction.purchaseType === "premium"
        ? "apple_premium" as const
        : null;

    if (!transactionId || !product || !validDate(purchaseDate)) {
      increment(skipped, "apple_missing_verified_transaction_fields");
      continue;
    }

    const paymentSupported = transaction.purchaseType === "batch_pack"
      ? ["paid", "revoked"].includes(transaction.status || "")
      : ["active", "lifetime"].includes(transaction.status || "");
    if (paymentSupported) {
      add({
        source: "apple",
        body: buildApplePaymentOutcome({ transactionId, occurredAt: purchaseDate, product }),
      });
    } else {
      increment(skipped, "apple_payment_state_not_authoritative");
    }

    if (transaction.status === "revoked" && validDate(transaction.revocationDate)) {
      add({
        source: "apple",
        body: buildAppleRefundOutcome({
          transactionId,
          refundedAt: transaction.revocationDate,
        }),
      });
    }
  }

  return {
    candidates: [...candidates.values()],
    conflicts,
    scanned: {
      accounts: users.length,
      stripeBatchPurchases: batchPurchases.length,
      appleTransactions: appleTransactions.length,
    },
  };
}

export function reconcileTrackerOutcomes(input: {
  store: SqliteDocumentStore;
  apply?: boolean;
  enqueue?: typeof enqueueTrackerOutcome;
}): TrackerOutcomeReconciliationSummary {
  const apply = input.apply === true;
  const skipped: Record<string, number> = {};
  const collected = collectCandidates(input.store, skipped);
  const existingRows = input.store.findMany<TrackerOutcomeOutboxRecord>(
    TRACKER_OUTCOME_OUTBOX_COLLECTION
  );
  const existingById = new Map(existingRows.map((row) => [row.outcomeId, row]));
  const missing: Candidate[] = [];
  let existing = 0;
  let conflicts = collected.conflicts;
  const byType: Record<string, number> = {};
  const byCurrency: Record<string, number> = {};

  for (const candidate of collected.candidates) {
    increment(byType, candidate.body.type);
    if (candidate.body.revenue?.currency) {
      increment(byCurrency, candidate.body.revenue.currency.toUpperCase());
    }
    const row = existingById.get(candidate.body.eventId);
    if (!row) {
      missing.push(candidate);
      continue;
    }
    if (row.body !== canonicalBody(candidate.body)) {
      conflicts += 1;
      continue;
    }
    existing += 1;
  }

  let inserted = 0;
  if (apply && conflicts === 0) {
    const enqueue = input.enqueue || enqueueTrackerOutcome;
    for (const candidate of missing) {
      if (enqueue(candidate.body, new Date(candidate.body.occurredAt)).inserted) inserted += 1;
    }
  } else if (apply && conflicts > 0) {
    increment(skipped, "apply_blocked_by_conflicts");
  }

  return {
    mode: apply ? "apply" : "audit",
    scanned: collected.scanned,
    candidates: collected.candidates.length,
    existing,
    missing: missing.length,
    inserted,
    conflicts,
    skipped,
    byType,
    byCurrency,
  };
}
