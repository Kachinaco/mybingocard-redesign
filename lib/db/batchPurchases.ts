import { ObjectId } from "bson";
import type { BatchCount } from "@/lib/batchPacks";
import { getSqliteStore } from "@/lib/db/sqlite";

export type BatchPurchaseStatus = "paid" | "processing" | "generated" | "refunded" | "canceled";

export interface BatchPurchase {
  _id: ObjectId;
  userId: string;
  email: string;
  batchCount: BatchCount;
  amount: number;
  currency: string;
  purchaseProvider?: "stripe" | "apple";
  stripeSessionId?: string;
  stripePaymentIntentId?: string | null;
  appleTransactionId?: string | null;
  appleOriginalTransactionId?: string | null;
  appleProductId?: string | null;
  appleEnvironment?: string | null;
  status: BatchPurchaseStatus;
  generatedCardIds: string[];
  purchasedAt: Date;
  generatedAt?: Date | null;
  updatedAt: Date;
  statusBeforeRevocation?: BatchPurchaseStatus | null;
}

export async function upsertBatchPurchaseFromCheckout(data: {
  userId: string;
  email: string;
  batchCount: BatchCount;
  amount: number;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string | null;
}) {
  const now = new Date();
    return getSqliteStore().findOneAndUpdate<BatchPurchase>(
      "batch_purchases",
      { stripeSessionId: data.stripeSessionId },
      {
        $setOnInsert: {
          ...data,
          purchaseProvider: "stripe",
          status: "paid",
          generatedCardIds: [],
          purchasedAt: now,
          generatedAt: null,
        },
        $set: {
          updatedAt: now,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );
  }

export async function upsertBatchPurchaseFromAppleTransaction(data: {
  userId: string;
  email: string;
  batchCount: BatchCount;
  amount: number;
  currency: string;
  appleTransactionId: string;
  appleOriginalTransactionId?: string | null;
  appleProductId: string;
  appleEnvironment?: string | null;
}) {
  const now = new Date();
    const existing = getSqliteStore().findOne<BatchPurchase>("batch_purchases", {
      appleTransactionId: data.appleTransactionId,
    });
    if (existing && existing.userId !== data.userId) {
      throw new Error("Apple transaction is already associated with another account.");
    }
    return getSqliteStore().findOneAndUpdate<BatchPurchase>(
      "batch_purchases",
      { appleTransactionId: data.appleTransactionId },
      {
        $setOnInsert: {
          ...data,
          purchaseProvider: "apple",
          stripeSessionId: `apple:${data.appleTransactionId}`,
          stripePaymentIntentId: null,
          status: "paid",
          generatedCardIds: [],
          purchasedAt: now,
          generatedAt: null,
        },
        $set: {
          email: data.email,
          appleOriginalTransactionId: data.appleOriginalTransactionId || null,
          appleEnvironment: data.appleEnvironment || null,
          updatedAt: now,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );
  }

export async function markAppleBatchPurchaseRevoked(data: {
  userId: string;
  appleTransactionId: string;
  revokedAt: Date;
}) {
  const existing = getSqliteStore().findOne<BatchPurchase>("batch_purchases", {
    userId: data.userId,
    appleTransactionId: data.appleTransactionId,
  });
  return getSqliteStore().findOneAndUpdate<BatchPurchase>(
    "batch_purchases",
    {
      userId: data.userId,
      appleTransactionId: data.appleTransactionId,
    },
    {
      $set: {
        status: "refunded",
        statusBeforeRevocation: existing?.status === "refunded"
          ? existing.statusBeforeRevocation || "paid"
          : existing?.status || "paid",
        updatedAt: data.revokedAt,
      },
    },
    { returnDocument: "after" },
  );
}

export async function restoreAppleBatchPurchase(data: {
  userId: string;
  appleTransactionId: string;
  restoredAt: Date;
}) {
  const existing = getSqliteStore().findOne<BatchPurchase>("batch_purchases", {
    userId: data.userId,
    appleTransactionId: data.appleTransactionId,
  });
  if (!existing) return null;
  return getSqliteStore().findOneAndUpdate<BatchPurchase>(
    "batch_purchases",
    { _id: existing._id },
    {
      $set: {
        status: existing.statusBeforeRevocation || "paid",
        statusBeforeRevocation: null,
        updatedAt: data.restoredAt,
      },
    },
    { returnDocument: "after" },
  );
}

export async function getBatchPurchaseById(purchaseId: string): Promise<BatchPurchase | null> {
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(purchaseId);
  } catch {
    return null;
  }
    return getSqliteStore().findOne<BatchPurchase>("batch_purchases", { _id: objectId });
  }

export async function getAvailableBatchPurchases(userId: string) {
    return getSqliteStore().findMany<BatchPurchase>(
      "batch_purchases",
      {
        userId,
        status: "paid",
      },
      { sort: { purchasedAt: 1 } }
    );
  }

export async function claimBatchPurchase(userId: string, batchCount: BatchCount) {
    const store = getSqliteStore();
    const purchase = store.findMany<BatchPurchase>(
      "batch_purchases",
      {
        userId,
        batchCount,
        status: "paid",
      },
      { sort: { purchasedAt: 1 }, limit: 1 }
    )[0];
    if (!purchase) return null;

    return store.findOneAndUpdate<BatchPurchase>(
      "batch_purchases",
      { _id: purchase._id },
      {
        $set: {
          status: "processing",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
  }

export async function markBatchPurchaseGenerated(
  purchaseId: string,
  generatedCardIds: string[]
) {
    return getSqliteStore().findOneAndUpdate<BatchPurchase>(
      "batch_purchases",
      { _id: new ObjectId(purchaseId) },
      {
        $set: {
          status: "generated",
          generatedCardIds,
          generatedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
      }
    );
  }

export async function releaseBatchPurchase(purchaseId: string) {
    return getSqliteStore().findOneAndUpdate<BatchPurchase>(
      "batch_purchases",
      {
        _id: new ObjectId(purchaseId),
        status: "processing",
      },
      {
        $set: {
          status: "paid",
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
      }
    );
  }

export async function findGeneratedBatchPurchaseForCards(
  userId: string,
  cardIds: string[]
) {
    return getSqliteStore().findOne<BatchPurchase>("batch_purchases", {
      userId,
      status: "generated",
      generatedCardIds: { $all: cardIds },
    });
  }

export async function getGeneratedBatchIdMapForCards(
  userId: string,
  cardIds: string[]
): Promise<Record<string, string>> {
  if (cardIds.length === 0) return {};
    const purchases = getSqliteStore().findMany<BatchPurchase>("batch_purchases", {
      userId,
      status: "generated",
      generatedCardIds: { $in: cardIds },
    });

    const batchIdByCardId: Record<string, string> = {};
    for (const purchase of purchases) {
      const batchId = purchase._id.toString();
      for (const cardId of purchase.generatedCardIds || []) {
        if (!batchIdByCardId[cardId]) {
          batchIdByCardId[cardId] = batchId;
        }
      }
    }

    return batchIdByCardId;
  }
