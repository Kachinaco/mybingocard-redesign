import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrCreateAppleAppAccountToken, getUserByEmail } from "@/lib/db/users";
import {
  createSubscription,
  getSubscriptionByUserId,
  PLAN_LIMITS,
  updateSubscription,
} from "@/lib/db/subscriptions";
import { getBatchPack, isBatchCount } from "@/lib/batchPacks";
import {
  markAppleBatchPurchaseRevoked,
  upsertBatchPurchaseFromAppleTransaction,
} from "@/lib/db/batchPurchases";
import {
  applyApplePremiumEntitlement,
  claimAppleIapTransactionOwnership,
  getAppleIapTransaction,
  revokeApplePremiumEntitlement,
  upsertAppleIapTransaction,
} from "@/lib/db/apple-iap";
import {
  APPLE_BUNDLE_ID,
  verifyAndDecodeAppleTransaction,
} from "@/lib/apple-app-store-verifier";
import {
  APPLE_BATCH_PRODUCT_IDS,
  APPLE_LIFETIME_PRODUCT_ID,
  APPLE_MONTHLY_PRODUCT_ID,
  isApplePremiumProduct,
} from "@/lib/apple-iap-products";
import {
  enqueueApplePaymentOutcome,
  enqueueAppleRefundOutcome,
} from "@/lib/server/tracker-outcome-events";

export const runtime = "nodejs";

type AppleTransactionPayload = {
  bundleId?: string;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  purchaseDate?: number;
  expiresDate?: number;
  offerType?: number;
  revocationDate?: number;
  revocationReason?: number;
  environment?: string;
  type?: string;
  appAccountToken?: string;
};

function dateFromMs(value?: number): Date | null {
  if (!Number.isFinite(value)) return null;
  return new Date(Number(value));
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const signedTransactionInfo =
      typeof body?.signedTransactionInfo === "string" ? body.signedTransactionInfo : "";
    if (!signedTransactionInfo) {
      return NextResponse.json({ error: "signedTransactionInfo is required" }, { status: 400 });
    }

    const transaction: AppleTransactionPayload = await verifyAndDecodeAppleTransaction(signedTransactionInfo);
    if (transaction.bundleId !== APPLE_BUNDLE_ID) {
      return NextResponse.json({ error: "Apple transaction bundle does not match this app" }, { status: 400 });
    }

    const productId = transaction.productId || "";
    const transactionId = transaction.transactionId || "";
    if (!transactionId) {
      return NextResponse.json({ error: "Apple transaction is missing transactionId" }, { status: 400 });
    }
    const batchCount = APPLE_BATCH_PRODUCT_IDS[productId];
    const isPremiumProduct = isApplePremiumProduct(productId);
    if (!isPremiumProduct && !isBatchCount(batchCount)) {
      return NextResponse.json({ error: "Apple product is not a MyBingoCard product" }, { status: 400 });
    }

    const now = new Date();
    const purchaseDate = dateFromMs(transaction.purchaseDate);
    if (!purchaseDate) {
      return NextResponse.json(
        { error: "Apple transaction is missing purchaseDate" },
        { status: 400 },
      );
    }
    const expiresDate = dateFromMs(transaction.expiresDate);
    const revocationDate = dateFromMs(transaction.revocationDate);
    const isLifetime = productId === APPLE_LIFETIME_PRODUCT_ID;
    const isExpiredSubscription =
      isPremiumProduct && !isLifetime && expiresDate !== null && expiresDate.getTime() <= now.getTime();

    const subscriptionStatus = isLifetime
      ? "lifetime"
      : transaction.offerType === 1
        ? "trialing"
        : "active";

    const user = await getUserByEmail(session.user.email);
    if (!user?._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = user._id.toString();
    const appAccountToken = transaction.appAccountToken || null;
    if (appAccountToken) {
      const expectedAppAccountToken = await getOrCreateAppleAppAccountToken(userId);
      if (appAccountToken !== expectedAppAccountToken) {
        return NextResponse.json(
          { error: "This Apple purchase belongs to a different MyBingoCard account." },
          { status: 409 },
        );
      }
    }
    const ownsTransaction = await claimAppleIapTransactionOwnership({
      transactionId,
      originalTransactionId: transaction.originalTransactionId || null,
      userId,
      email: session.user.email,
      appAccountToken,
      now,
    });
    if (!ownsTransaction) {
      return NextResponse.json(
        { error: "This Apple purchase is already linked to another MyBingoCard account." },
        { status: 409 },
      );
    }

    const existingAppleTransaction = await getAppleIapTransaction(transactionId);
    if (
      !revocationDate
      && (existingAppleTransaction?.status === "revoked" || existingAppleTransaction?.revocationDate)
    ) {
      return NextResponse.json({
        success: true,
        revoked: true,
        staleTransactionIgnored: true,
        productId,
      });
    }

    if (revocationDate) {
      if (isBatchCount(batchCount)) {
        await markAppleBatchPurchaseRevoked({
          userId,
          appleTransactionId: transactionId,
          revokedAt: revocationDate,
        });
      } else {
        const entitlementRevoked = await revokeApplePremiumEntitlement({
          userId: user._id,
          transactionId,
          originalTransactionId: transaction.originalTransactionId || null,
          revokedAt: revocationDate,
        });
        if (entitlementRevoked) {
          const existingSubscription = await getSubscriptionByUserId(userId);
          if (existingSubscription) {
            await updateSubscription(userId, {
              plan: "free",
              status: "canceled",
              limits: PLAN_LIMITS.free,
              currentPeriodEnd: revocationDate,
              cancelAtPeriodEnd: false,
            });
          }
        }
      }

      await upsertAppleIapTransaction({
        transactionId,
        userId,
        email: session.user.email,
        productId,
        purchaseType: isBatchCount(batchCount) ? "batch_pack" : "premium",
        batchCount: isBatchCount(batchCount) ? batchCount : undefined,
        originalTransactionId: transaction.originalTransactionId || null,
        environment: transaction.environment || null,
        purchaseDate,
        expiresDate,
        status: "revoked",
        revocationDate,
        revocationReason: Number.isFinite(transaction.revocationReason)
          ? Number(transaction.revocationReason)
          : null,
        appAccountToken,
        now,
      });
      enqueueAppleRefundOutcome({
        transactionId,
        refundedAt: revocationDate,
      });

      return NextResponse.json({ success: true, revoked: true, productId });
    }

    if (isExpiredSubscription) {
      const entitlementExpired = await revokeApplePremiumEntitlement({
        userId: user._id,
        transactionId,
        originalTransactionId: transaction.originalTransactionId || null,
        revokedAt: expiresDate!,
        allowOriginalTransactionMatch: false,
      });
      if (entitlementExpired) {
        const existingSubscription = await getSubscriptionByUserId(userId);
        if (existingSubscription) {
          await updateSubscription(userId, {
            plan: "free",
            status: "canceled",
            limits: PLAN_LIMITS.free,
            currentPeriodEnd: expiresDate!,
            cancelAtPeriodEnd: false,
          });
        }
      }
      await upsertAppleIapTransaction({
        transactionId,
        userId,
        email: session.user.email,
        productId,
        purchaseType: "premium",
        originalTransactionId: transaction.originalTransactionId || null,
        environment: transaction.environment || null,
        purchaseDate,
        expiresDate,
        status: "expired",
        appAccountToken,
        now,
      });
      return NextResponse.json({ success: true, expired: true, productId });
    }

    if (isBatchCount(batchCount)) {
      const batchPack = getBatchPack(batchCount);
      if (!batchPack) {
        return NextResponse.json({ error: "Apple batch product is not configured" }, { status: 400 });
      }

      const batchPurchase = await upsertBatchPurchaseFromAppleTransaction({
        userId,
        email: session.user.email,
        batchCount,
        amount: batchPack.amount,
        currency: batchPack.currency,
        appleTransactionId: transactionId,
        appleOriginalTransactionId: transaction.originalTransactionId || transactionId,
        appleProductId: productId,
        appleEnvironment: transaction.environment || null,
      });

      await upsertAppleIapTransaction({
        transactionId,
        userId,
        email: session.user.email,
        productId,
        purchaseType: "batch_pack",
        batchCount,
        batchPurchaseId: batchPurchase?._id?.toString?.() || null,
        originalTransactionId: transaction.originalTransactionId || null,
        environment: transaction.environment || null,
        purchaseDate,
        expiresDate: null,
        status: "paid",
        appAccountToken,
        now,
      });
      enqueueApplePaymentOutcome({
        transactionId,
        occurredAt: purchaseDate,
        product: "apple_batch_pack",
      });

      return NextResponse.json({
        success: true,
        purchaseType: "batch_pack",
        productId,
        batchCount,
        batchPurchaseId: batchPurchase?._id?.toString?.() || null,
      });
    }

    await applyApplePremiumEntitlement({
      userId: user._id,
      subscriptionStatus,
      purchaseDate,
      expiresDate,
      isLifetime,
      productId,
      transactionId,
      originalTransactionId: transaction.originalTransactionId || transactionId,
      environment: transaction.environment || null,
      now,
    });

    const existingSubscription = await getSubscriptionByUserId(userId);
    const subscriptionUpdate = {
      plan: "unlimited" as const,
      status: subscriptionStatus === "trialing" ? "trialing" as const : "active" as const,
      stripeCustomerId: undefined,
      stripeSubscriptionId: undefined,
      stripePriceId: undefined,
      limits: PLAN_LIMITS.unlimited,
      currentPeriodStart: purchaseDate,
      currentPeriodEnd: isLifetime ? undefined : expiresDate || undefined,
      cancelAtPeriodEnd: false,
    };

    if (existingSubscription) {
      await updateSubscription(userId, subscriptionUpdate);
    } else {
      await createSubscription({
        userId,
        plan: "unlimited",
      });
      await updateSubscription(userId, subscriptionUpdate);
    }

    await upsertAppleIapTransaction({
      transactionId,
      userId,
      email: session.user.email,
      productId,
      purchaseType: "premium",
      originalTransactionId: transaction.originalTransactionId || null,
      environment: transaction.environment || null,
      purchaseDate,
      expiresDate,
      status: subscriptionStatus,
      appAccountToken,
      now,
    });
    if (subscriptionStatus !== "trialing") {
      enqueueApplePaymentOutcome({
        transactionId,
        occurredAt: purchaseDate,
        product: "apple_premium",
      });
    }

    return NextResponse.json({
      success: true,
      planType: "PREMIUM",
      subscriptionStatus,
      productId,
      currentPeriodEnd: isLifetime ? null : expiresDate,
    });
  } catch (error) {
    console.error("Apple IAP transaction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify Apple purchase" },
      { status: 500 }
    );
  }
}
