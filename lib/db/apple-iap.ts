import { ObjectId } from "bson";
import { createHash } from "node:crypto";
import { getSqliteStore } from "@/lib/db/sqlite";
import type { BatchCount } from "@/lib/batchPacks";

type AppleIapPurchaseType = "batch_pack" | "premium";

export type AppleIapTransactionInput = {
  transactionId: string;
  userId: string;
  email: string;
  productId: string;
  purchaseType: AppleIapPurchaseType;
  originalTransactionId: string | null;
  environment: string | null;
  purchaseDate: Date;
  expiresDate: Date | null;
  status: string;
  revocationDate?: Date | null;
  revocationReason?: number | null;
  appAccountToken?: string | null;
  signedDate?: Date | null;
  allowRevocationReversal?: boolean;
  now?: Date;
  batchCount?: BatchCount;
  batchPurchaseId?: string | null;
};

export type AppleIapTransactionRecord = {
  _id: ObjectId;
  transactionId: string;
  originalTransactionId?: string | null;
  userId: string;
  email: string;
  productId?: string;
  purchaseType?: AppleIapPurchaseType;
  status?: string;
  purchaseDate?: Date;
  expiresDate?: Date | null;
  revocationDate?: Date | null;
  revocationReason?: number | null;
  appAccountToken?: string | null;
  signedDate?: Date | null;
};

export type ApplePremiumEntitlementInput = {
  userId: ObjectId | string;
  subscriptionStatus: "active" | "trialing" | "past_due" | "lifetime";
  purchaseDate: Date;
  expiresDate: Date | null;
  isLifetime: boolean;
  productId: string;
  transactionId: string | null;
  originalTransactionId: string | null;
  environment: string | null;
  now?: Date;
};

function appleTransactionObjectId(transactionId: string): ObjectId {
  const digest = createHash("sha256").update(transactionId).digest("hex");
  return new ObjectId(digest.slice(0, 24));
}

function recordBelongsToUser(record: { userId?: unknown } | null, userId: string): boolean {
  return !record || String(record.userId || "") === userId;
}

export async function claimAppleIapTransactionOwnership(input: {
  transactionId: string;
  originalTransactionId?: string | null;
  userId: string;
  email: string;
  appAccountToken?: string | null;
  now?: Date;
}): Promise<boolean> {
  const store = getSqliteStore();
  const now = input.now || new Date();
  const existingTransaction = store.findOne<AppleIapTransactionRecord>(
    "apple_iap_transactions",
    { transactionId: input.transactionId },
  );
  if (!recordBelongsToUser(existingTransaction, input.userId)) return false;
  if (
    existingTransaction?.appAccountToken
    && input.appAccountToken
    && existingTransaction.appAccountToken !== input.appAccountToken
  ) return false;

  if (input.originalTransactionId) {
    const existingOriginal = store.findOne<AppleIapTransactionRecord>(
      "apple_iap_transactions",
      { originalTransactionId: input.originalTransactionId },
    );
    if (!recordBelongsToUser(existingOriginal, input.userId)) return false;
  }

  const existingBatch = store.findOne<{ userId?: string }>("batch_purchases", {
    appleTransactionId: input.transactionId,
  });
  if (!recordBelongsToUser(existingBatch, input.userId)) return false;

  const existingUser = store.findOne<{ _id: ObjectId }>("users", {
    appleTransactionId: input.transactionId,
  }) || (input.originalTransactionId
    ? store.findOne<{ _id: ObjectId }>("users", {
        appleOriginalTransactionId: input.originalTransactionId,
      })
    : null);
  if (existingUser && existingUser._id.toString() !== input.userId) return false;

  if (existingTransaction) return true;

  const ownershipId = appleTransactionObjectId(input.transactionId);
  try {
    store.insertOne("apple_iap_transactions", {
      _id: ownershipId,
      transactionId: input.transactionId,
      originalTransactionId: input.originalTransactionId || null,
      userId: input.userId,
      email: input.email,
      appAccountToken: input.appAccountToken || null,
      status: "processing",
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    // A concurrent request may have inserted the deterministic ownership row.
  }

  const claimed = store.findOne<AppleIapTransactionRecord>("apple_iap_transactions", {
    _id: ownershipId,
  });
  return Boolean(
    claimed &&
    claimed.transactionId === input.transactionId &&
    String(claimed.userId) === input.userId
  );
}

export async function getAppleIapTransaction(
  transactionId: string,
): Promise<AppleIapTransactionRecord | null> {
  return getSqliteStore().findOne<AppleIapTransactionRecord>(
    "apple_iap_transactions",
    { transactionId },
  );
}

export async function findAppleIapTransactionOwner(input: {
  transactionId?: string | null;
  originalTransactionId?: string | null;
}): Promise<AppleIapTransactionRecord | null> {
  const store = getSqliteStore();
  if (input.transactionId) {
    const exact = store.findOne<AppleIapTransactionRecord>("apple_iap_transactions", {
      transactionId: input.transactionId,
    });
    if (exact) return exact;
  }
  if (input.originalTransactionId) {
    return store.findOne<AppleIapTransactionRecord>("apple_iap_transactions", {
      originalTransactionId: input.originalTransactionId,
    });
  }
  return null;
}

export async function upsertAppleIapTransaction(input: AppleIapTransactionInput): Promise<void> {
  const now = input.now || new Date();
  const ownsTransaction = await claimAppleIapTransactionOwnership({
    transactionId: input.transactionId,
    originalTransactionId: input.originalTransactionId,
    userId: input.userId,
    email: input.email,
    appAccountToken: input.appAccountToken,
    now,
  });
  if (!ownsTransaction) {
    throw new Error("Apple transaction is already associated with another account.");
  }

  const store = getSqliteStore();
  const existing = store.findOne<AppleIapTransactionRecord>("apple_iap_transactions", {
    transactionId: input.transactionId,
  });
  if (!existing) throw new Error("Apple transaction ownership could not be persisted.");

  // Revocation/refund is terminal for a transaction. A replayed older JWS must
  // never reactivate Premium or overwrite the durable ledger state.
  if (
    (existing.status === "revoked" || existing.revocationDate)
    && input.status !== "revoked"
    && !input.allowRevocationReversal
  ) {
    return;
  }

  const set: Record<string, unknown> = {
    email: input.email,
    productId: input.productId,
    purchaseType: input.purchaseType,
    originalTransactionId: input.originalTransactionId,
    environment: input.environment,
    purchaseDate: input.purchaseDate,
    expiresDate: input.expiresDate,
    status: input.status,
    updatedAt: now,
  };

  if (typeof input.appAccountToken !== "undefined") set.appAccountToken = input.appAccountToken;
  if (typeof input.signedDate !== "undefined") set.signedDate = input.signedDate;

  if (typeof input.batchCount !== "undefined") set.batchCount = input.batchCount;
  if (typeof input.batchPurchaseId !== "undefined") set.batchPurchaseId = input.batchPurchaseId;
  if (typeof input.revocationDate !== "undefined") set.revocationDate = input.revocationDate;
  if (typeof input.revocationReason !== "undefined") set.revocationReason = input.revocationReason;

  store.updateOne(
    "apple_iap_transactions",
    { _id: existing._id },
    {
      $set: set,
    },
  );
}

type AppleIapLineageRecord = {
  _id: ObjectId;
  originalTransactionId: string;
  userId: string;
  latestSignedDate: Date;
  latestTransactionId: string;
  status: string;
  notificationType?: string | null;
  notificationUUID?: string | null;
};

function appleLineageObjectId(originalTransactionId: string): ObjectId {
  const digest = createHash("sha256").update(`lineage:${originalTransactionId}`).digest("hex");
  return new ObjectId(digest.slice(0, 24));
}

export async function isAppleIapLineageStateStale(input: {
  originalTransactionId: string;
  signedDate: Date;
}): Promise<boolean> {
  const existing = getSqliteStore().findOne<AppleIapLineageRecord>("apple_iap_lineages", {
    originalTransactionId: input.originalTransactionId,
  });
  return Boolean(existing && existing.latestSignedDate.getTime() > input.signedDate.getTime());
}

export async function recordAppleIapLineageState(input: {
  originalTransactionId: string;
  userId: string;
  signedDate: Date;
  transactionId: string;
  status: string;
  notificationType?: string | null;
  notificationUUID?: string | null;
}): Promise<void> {
  const store = getSqliteStore();
  const existing = store.findOne<AppleIapLineageRecord>("apple_iap_lineages", {
    originalTransactionId: input.originalTransactionId,
  });
  if (existing && existing.latestSignedDate.getTime() > input.signedDate.getTime()) return;

  store.findOneAndUpdate<AppleIapLineageRecord>(
    "apple_iap_lineages",
    { _id: existing?._id || appleLineageObjectId(input.originalTransactionId) },
    {
      $setOnInsert: {
        originalTransactionId: input.originalTransactionId,
        createdAt: input.signedDate,
      },
      $set: {
        userId: input.userId,
        latestSignedDate: input.signedDate,
        latestTransactionId: input.transactionId,
        status: input.status,
        notificationType: input.notificationType || null,
        notificationUUID: input.notificationUUID || null,
        updatedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" },
  );
}

export async function applyApplePremiumEntitlement(input: ApplePremiumEntitlementInput): Promise<void> {
  const now = input.now || new Date();
  const userId = input.userId instanceof ObjectId ? input.userId : new ObjectId(input.userId);

  getSqliteStore().updateOne("users", { _id: userId }, {
    $set: {
      planType: "PREMIUM",
      subscriptionStatus: input.subscriptionStatus,
      currentPeriodStart: input.purchaseDate,
      currentPeriodEnd: input.isLifetime ? null : input.expiresDate,
      trialEndsAt: input.subscriptionStatus === "trialing" ? input.expiresDate : null,
      cancelAtPeriodEnd: false,
      purchaseProvider: "apple",
      appleProductId: input.productId,
      appleTransactionId: input.transactionId,
      appleOriginalTransactionId: input.originalTransactionId,
      appleEnvironment: input.environment,
      updatedAt: now,
    },
  });
}

export async function revokeApplePremiumEntitlement(input: {
  userId: ObjectId | string;
  transactionId: string;
  originalTransactionId: string | null;
  revokedAt: Date;
  allowOriginalTransactionMatch?: boolean;
}): Promise<boolean> {
  const store = getSqliteStore();
  const userId = input.userId instanceof ObjectId ? input.userId : new ObjectId(input.userId);
  const user = store.findOne<{
    purchaseProvider?: string;
    appleTransactionId?: string | null;
    appleOriginalTransactionId?: string | null;
  }>("users", { _id: userId });
  if (!user || user.purchaseProvider !== "apple") return false;

  const matchesCurrentApplePurchase =
    user.appleTransactionId === input.transactionId ||
    (input.allowOriginalTransactionMatch !== false &&
      Boolean(input.originalTransactionId) &&
      user.appleOriginalTransactionId === input.originalTransactionId);
  if (!matchesCurrentApplePurchase) return false;

  store.updateOne("users", { _id: userId }, {
    $set: {
      planType: "FREE",
      subscriptionStatus: "canceled",
      currentPeriodEnd: input.revokedAt,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      updatedAt: input.revokedAt,
    },
  });
  return true;
}
