import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import type { BatchCount } from "@/lib/batchPacks";

export interface BatchPurchase {
  _id: ObjectId;
  userId: string;
  email: string;
  batchCount: BatchCount;
  amount: number;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string | null;
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
  const collection = await getBatchPurchasesCollection();
  const now = new Date();

  const result = await collection.findOneAndUpdate(
    { stripeSessionId: data.stripeSessionId },
    {
      $setOnInsert: {
        ...data,
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

export async function getAvailableBatchPurchases(userId: string) {
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
  const collection = await getBatchPurchasesCollection();

  return collection.findOne({
    userId,
    status: "generated",
    generatedCardIds: { $all: cardIds },
  });
}
