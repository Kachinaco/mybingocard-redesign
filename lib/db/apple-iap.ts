import { ObjectId } from "bson";
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
  now?: Date;
  batchCount?: BatchCount;
  batchPurchaseId?: string | null;
};

export type ApplePremiumEntitlementInput = {
  userId: ObjectId | string;
  subscriptionStatus: "active" | "trialing" | "lifetime";
  purchaseDate: Date;
  expiresDate: Date | null;
  isLifetime: boolean;
  productId: string;
  transactionId: string | null;
  originalTransactionId: string | null;
  environment: string | null;
  now?: Date;
};

export async function upsertAppleIapTransaction(input: AppleIapTransactionInput): Promise<void> {
  const now = input.now || new Date();
  const set: Record<string, unknown> = {
    userId: input.userId,
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

  if (typeof input.batchCount !== "undefined") set.batchCount = input.batchCount;
  if (typeof input.batchPurchaseId !== "undefined") set.batchPurchaseId = input.batchPurchaseId;

  getSqliteStore().updateOne(
    "apple_iap_transactions",
    { transactionId: input.transactionId },
    {
      $set: set,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
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
