import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import type { BatchCount } from "@/lib/batchPacks";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

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
  status: "paid" | "processing" | "generated" | "refunded" | "canceled";
  generatedCardIds: string[];
  purchasedAt: Date;
  generatedAt?: Date | null;
  updatedAt: Date;
}

async function getBatchPurchasesCollection() {
  const client = await clientPromise;
  return client.db("mybingocard").collection<BatchPurchase>("batch_purchases");
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

  if (useSqliteDb()) {
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

  const collection = await getBatchPurchasesCollection();
  const result = await collection.findOneAndUpdate(
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

  return result;
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

  if (useSqliteDb()) {
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

  const collection = await getBatchPurchasesCollection();
  const result = await collection.findOneAndUpdate(
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

  return result;
}

export async function getBatchPurchaseById(purchaseId: string): Promise<BatchPurchase | null> {
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(purchaseId);
  } catch {
    return null;
  }

  if (useSqliteDb()) {
    return getSqliteStore().findOne<BatchPurchase>("batch_purchases", { _id: objectId });
  }

  const collection = await getBatchPurchasesCollection();
  return collection.findOne({ _id: objectId });
}

export async function getAvailableBatchPurchases(userId: string) {
  if (useSqliteDb()) {
    return getSqliteStore().findMany<BatchPurchase>(
      "batch_purchases",
      {
        userId,
        status: "paid",
      },
      { sort: { purchasedAt: 1 } }
    );
  }

  const collection = await getBatchPurchasesCollection();

  return collection
    .find({
      userId,
      status: "paid",
    })
    .sort({ purchasedAt: 1 })
    .toArray();
}

export async function claimBatchPurchase(userId: string, batchCount: BatchCount) {
  if (useSqliteDb()) {
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

  const collection = await getBatchPurchasesCollection();

  return collection.findOneAndUpdate(
    {
      userId,
      batchCount,
      status: "paid",
    },
    {
      $set: {
        status: "processing",
        updatedAt: new Date(),
      },
    },
    {
      sort: { purchasedAt: 1 },
      returnDocument: "after",
    }
  );
}

export async function markBatchPurchaseGenerated(
  purchaseId: string,
  generatedCardIds: string[]
) {
  if (useSqliteDb()) {
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

  const collection = await getBatchPurchasesCollection();

  return collection.findOneAndUpdate(
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
  if (useSqliteDb()) {
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

  const collection = await getBatchPurchasesCollection();

  return collection.findOneAndUpdate(
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
  if (useSqliteDb()) {
    return getSqliteStore().findOne<BatchPurchase>("batch_purchases", {
      userId,
      status: "generated",
      generatedCardIds: { $all: cardIds },
    });
  }

  const collection = await getBatchPurchasesCollection();

  return collection.findOne({
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

  if (useSqliteDb()) {
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

  const collection = await getBatchPurchasesCollection();
  const purchases = await collection
    .find({
      userId,
      status: "generated",
      generatedCardIds: { $in: cardIds },
    })
    .project({ generatedCardIds: 1 })
    .toArray();

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
