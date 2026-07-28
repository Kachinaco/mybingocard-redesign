import {
  NotificationTypeV2,
  Status,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import { getBatchPack, isBatchCount } from "@/lib/batchPacks";
import {
  APPLE_BATCH_PRODUCT_IDS,
  APPLE_LIFETIME_PRODUCT_ID,
  isApplePremiumProduct,
} from "@/lib/apple-iap-products";
import {
  verifyAndDecodeAppleRenewalInfo,
  verifyAndDecodeAppleTransaction,
} from "@/lib/apple-app-store-verifier";
import {
  markAppleBatchPurchaseRevoked,
  restoreAppleBatchPurchase,
  upsertBatchPurchaseFromAppleTransaction,
} from "@/lib/db/batchPurchases";
import {
  applyApplePremiumEntitlement,
  claimAppleIapTransactionOwnership,
  findAppleIapTransactionOwner,
  isAppleIapLineageStateStale,
  recordAppleIapLineageState,
  revokeApplePremiumEntitlement,
  upsertAppleIapTransaction,
} from "@/lib/db/apple-iap";
import {
  createSubscription,
  getSubscriptionByUserId,
  PLAN_LIMITS,
  updateSubscription,
} from "@/lib/db/subscriptions";
import {
  getUserByAppleAppAccountToken,
  getUserByAppleTransactionIdentity,
  getUserById,
  updateUser,
  type User,
} from "@/lib/db/users";

export class AppleNotificationOwnerPendingError extends Error {}
export class AppleNotificationOwnerConflictError extends Error {}

type AppliedAppleNotification = {
  userId: string | null;
  transactionId: string | null;
  originalTransactionId: string | null;
  appAccountToken: string | null;
  state: string;
  productId?: string;
  purchaseDate?: Date;
  refundedAt?: Date | null;
};

function dateFromMs(value?: number): Date | null {
  return Number.isFinite(value) ? new Date(Number(value)) : null;
}

async function resolveNotificationUser(input: {
  transaction: JWSTransactionDecodedPayload;
  renewal: JWSRenewalInfoDecodedPayload | null;
}): Promise<{ user: User; appAccountToken: string | null }> {
  const { transaction, renewal } = input;
  const transactionToken = transaction.appAccountToken || null;
  const renewalToken = renewal?.appAccountToken || null;
  if (transactionToken && renewalToken && transactionToken !== renewalToken) {
    throw new AppleNotificationOwnerConflictError("Apple transaction and renewal tokens disagree.");
  }
  const appAccountToken = transactionToken || renewalToken;
  const tokenUser = appAccountToken
    ? await getUserByAppleAppAccountToken(appAccountToken)
    : null;
  if (appAccountToken && !tokenUser) {
    throw new AppleNotificationOwnerPendingError("Apple account token is not linked locally yet.");
  }

  const ledgerOwner = await findAppleIapTransactionOwner({
    transactionId: transaction.transactionId,
    originalTransactionId: transaction.originalTransactionId || renewal?.originalTransactionId,
  });
  const ledgerUser = ledgerOwner?.userId ? await getUserById(ledgerOwner.userId) : null;
  const legacyUser = await getUserByAppleTransactionIdentity({
    transactionId: transaction.transactionId,
    originalTransactionId: transaction.originalTransactionId || renewal?.originalTransactionId,
  });

  const candidates = [tokenUser, ledgerUser, legacyUser].filter((user): user is User => Boolean(user));
  const uniqueUserIds = new Set(candidates.map((user) => user._id.toString()));
  if (uniqueUserIds.size > 1) {
    throw new AppleNotificationOwnerConflictError("Apple notification resolves to conflicting users.");
  }
  const user = candidates[0];
  if (!user) {
    throw new AppleNotificationOwnerPendingError("Apple notification owner is not linked locally yet.");
  }
  return { user, appAccountToken };
}

async function updateSubscriptionAccess(input: {
  userId: string;
  status: "active" | "trialing" | "past_due";
  purchaseDate: Date;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  const existing = await getSubscriptionByUserId(input.userId);
  if (!existing) {
    await createSubscription({ userId: input.userId, plan: "unlimited" });
  }
  await updateSubscription(input.userId, {
    plan: "unlimited",
    status: input.status,
    limits: PLAN_LIMITS.unlimited,
    currentPeriodStart: input.purchaseDate,
    currentPeriodEnd: input.periodEnd || undefined,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
  });
}

async function removeSubscriptionAccess(input: {
  userId: string;
  endedAt: Date;
}): Promise<void> {
  const existing = await getSubscriptionByUserId(input.userId);
  if (!existing) return;
  await updateSubscription(input.userId, {
    plan: "free",
    status: "canceled",
    limits: PLAN_LIMITS.free,
    currentPeriodEnd: input.endedAt,
    cancelAtPeriodEnd: false,
  });
}

export async function applyVerifiedAppleNotification(
  notification: ResponseBodyV2DecodedPayload,
): Promise<AppliedAppleNotification> {
  const notificationType = String(notification.notificationType || "");
  if (notificationType === NotificationTypeV2.TEST && !notification.data?.signedTransactionInfo) {
    return {
      userId: null,
      transactionId: null,
      originalTransactionId: null,
      appAccountToken: null,
      state: "test",
    };
  }

  const data = notification.data;
  if (!data?.signedTransactionInfo) {
    return {
      userId: null,
      transactionId: null,
      originalTransactionId: null,
      appAccountToken: null,
      state: "ignored_no_transaction",
    };
  }

  const transaction = await verifyAndDecodeAppleTransaction(data.signedTransactionInfo);
  const renewal = data.signedRenewalInfo
    ? await verifyAndDecodeAppleRenewalInfo(data.signedRenewalInfo)
    : null;
  if (
    transaction.environment !== data.environment
    || (renewal?.environment && renewal.environment !== data.environment)
  ) {
    throw new Error("Apple notification environments do not match.");
  }

  const transactionId = transaction.transactionId || "";
  const originalTransactionId = transaction.originalTransactionId
    || renewal?.originalTransactionId
    || transactionId;
  const productId = transaction.productId || renewal?.productId || "";
  if (!transactionId || !originalTransactionId) {
    throw new Error("Apple notification is missing transaction identity.");
  }
  const batchCount = APPLE_BATCH_PRODUCT_IDS[productId];
  if (!isApplePremiumProduct(productId) && !isBatchCount(batchCount)) {
    return {
      userId: null,
      transactionId,
      originalTransactionId,
      appAccountToken: transaction.appAccountToken || renewal?.appAccountToken || null,
      state: "ignored_unknown_product",
    };
  }

  const { user, appAccountToken } = await resolveNotificationUser({ transaction, renewal });
  const userId = user._id.toString();
  const ownsTransaction = await claimAppleIapTransactionOwnership({
    transactionId,
    originalTransactionId,
    userId,
    email: user.email,
    appAccountToken,
  });
  if (!ownsTransaction) {
    throw new AppleNotificationOwnerConflictError("Apple transaction is owned by another user.");
  }

  const signedDate = dateFromMs(Math.max(
    notification.signedDate || 0,
    transaction.signedDate || 0,
    renewal?.signedDate || 0,
  )) || new Date();
  if (await isAppleIapLineageStateStale({ originalTransactionId, signedDate })) {
    return { userId, transactionId, originalTransactionId, appAccountToken, state: "ignored_stale" };
  }

  const purchaseDate = dateFromMs(transaction.purchaseDate);
  if (!purchaseDate) {
    throw new Error("Apple notification transaction is missing purchaseDate.");
  }
  const expiresDate = dateFromMs(transaction.expiresDate);
  const gracePeriodEnd = dateFromMs(renewal?.gracePeriodExpiresDate);
  if (
    typeof data.status !== "undefined"
    && ![
      Status.ACTIVE,
      Status.EXPIRED,
      Status.BILLING_RETRY,
      Status.BILLING_GRACE_PERIOD,
      Status.REVOKED,
    ].includes(Number(data.status) as Status)
  ) {
    throw new Error("Apple notification has an unknown subscription status.");
  }
  const refundReversed = notificationType === NotificationTypeV2.REFUND_REVERSED;
  const isRevoked = !refundReversed && (
    notificationType === NotificationTypeV2.REFUND
    || notificationType === NotificationTypeV2.REVOKE
    || data.status === Status.REVOKED
    || Boolean(transaction.revocationDate)
  );

  let state: string;
  if (isBatchCount(batchCount)) {
    const batchPack = getBatchPack(batchCount);
    if (!batchPack) throw new Error("Apple batch product is not configured.");
    if (isRevoked) {
      const revokedAt = dateFromMs(transaction.revocationDate) || signedDate;
      await markAppleBatchPurchaseRevoked({
        userId,
        appleTransactionId: transactionId,
        revokedAt,
      });
      await upsertAppleIapTransaction({
        transactionId,
        userId,
        email: user.email,
        productId,
        purchaseType: "batch_pack",
        batchCount,
        originalTransactionId,
        environment: String(transaction.environment || data.environment || ""),
        purchaseDate,
        expiresDate: null,
        status: "revoked",
        revocationDate: revokedAt,
        revocationReason: Number.isFinite(transaction.revocationReason)
          ? Number(transaction.revocationReason)
          : null,
        appAccountToken,
        signedDate,
      });
      state = "revoked";
    } else {
      const purchase = await upsertBatchPurchaseFromAppleTransaction({
        userId,
        email: user.email,
        batchCount,
        amount: batchPack.amount,
        currency: batchPack.currency,
        appleTransactionId: transactionId,
        appleOriginalTransactionId: originalTransactionId,
        appleProductId: productId,
        appleEnvironment: String(transaction.environment || data.environment || ""),
      });
      if (refundReversed) {
        await restoreAppleBatchPurchase({
          userId,
          appleTransactionId: transactionId,
          restoredAt: signedDate,
        });
      }
      await upsertAppleIapTransaction({
        transactionId,
        userId,
        email: user.email,
        productId,
        purchaseType: "batch_pack",
        batchCount,
        batchPurchaseId: purchase?._id?.toString?.() || null,
        originalTransactionId,
        environment: String(transaction.environment || data.environment || ""),
        purchaseDate,
        expiresDate: null,
        status: "paid",
        revocationDate: refundReversed ? null : undefined,
        revocationReason: refundReversed ? null : undefined,
        appAccountToken,
        signedDate,
        allowRevocationReversal: refundReversed,
      });
      state = refundReversed ? "refund_reversed" : "paid";
    }
  } else {
    const isLifetime = productId === APPLE_LIFETIME_PRODUCT_ID;
    const isGrace = data.status === Status.BILLING_GRACE_PERIOD
      && gracePeriodEnd !== null
      && gracePeriodEnd.getTime() > signedDate.getTime();
    const isExpired = !isLifetime && (
      data.status === Status.EXPIRED
      || data.status === Status.BILLING_RETRY
      || notificationType === NotificationTypeV2.EXPIRED
      || notificationType === NotificationTypeV2.GRACE_PERIOD_EXPIRED
      || (!isGrace && expiresDate !== null && expiresDate.getTime() <= signedDate.getTime())
    );

    if (isRevoked || isExpired) {
      const endedAt = isRevoked
        ? dateFromMs(transaction.revocationDate) || signedDate
        : expiresDate || signedDate;
      const entitlementRemoved = await revokeApplePremiumEntitlement({
        userId: user._id,
        transactionId,
        originalTransactionId,
        revokedAt: endedAt,
      });
      if (entitlementRemoved) await removeSubscriptionAccess({ userId, endedAt });
      state = isRevoked ? "revoked" : "expired";
      await upsertAppleIapTransaction({
        transactionId,
        userId,
        email: user.email,
        productId,
        purchaseType: "premium",
        originalTransactionId,
        environment: String(transaction.environment || data.environment || ""),
        purchaseDate,
        expiresDate,
        status: state,
        revocationDate: isRevoked ? endedAt : null,
        revocationReason: isRevoked && Number.isFinite(transaction.revocationReason)
          ? Number(transaction.revocationReason)
          : null,
        appAccountToken,
        signedDate,
      });
    } else {
      const periodEnd = isLifetime ? null : isGrace ? gracePeriodEnd : expiresDate;
      const currentEnd = user.currentPeriodEnd ? new Date(user.currentPeriodEnd) : null;
      const isOlderDifferentLineage = Boolean(
        user.purchaseProvider === "apple"
        && user.appleOriginalTransactionId
        && user.appleOriginalTransactionId !== originalTransactionId
        && (user.subscriptionStatus === "lifetime"
          || (currentEnd && periodEnd && currentEnd.getTime() > periodEnd.getTime()))
      );
      if (isOlderDifferentLineage) {
        state = "ignored_older_lineage";
      } else {
        const subscriptionStatus = isLifetime
          ? "lifetime" as const
          : isGrace
            ? "past_due" as const
            : transaction.offerType === 1
              ? "trialing" as const
              : "active" as const;
        const cancelAtPeriodEnd = renewal?.autoRenewStatus === 0;
        await applyApplePremiumEntitlement({
          userId: user._id,
          subscriptionStatus,
          purchaseDate,
          expiresDate: periodEnd,
          isLifetime,
          productId,
          transactionId,
          originalTransactionId,
          environment: String(transaction.environment || data.environment || ""),
          now: signedDate,
        });
        await updateUser(userId, { cancelAtPeriodEnd });
        await updateSubscriptionAccess({
          userId,
          status: subscriptionStatus === "lifetime" ? "active" : subscriptionStatus,
          purchaseDate,
          periodEnd,
          cancelAtPeriodEnd,
        });
        await upsertAppleIapTransaction({
          transactionId,
          userId,
          email: user.email,
          productId,
          purchaseType: "premium",
          originalTransactionId,
          environment: String(transaction.environment || data.environment || ""),
          purchaseDate,
          expiresDate: periodEnd,
          status: subscriptionStatus,
          revocationDate: refundReversed ? null : undefined,
          revocationReason: refundReversed ? null : undefined,
          appAccountToken,
          signedDate,
          allowRevocationReversal: refundReversed,
        });
        state = refundReversed ? "refund_reversed" : subscriptionStatus;
      }
    }
  }

  await recordAppleIapLineageState({
    originalTransactionId,
    userId,
    signedDate,
    transactionId,
    status: state,
    notificationType,
    notificationUUID: notification.notificationUUID || null,
  });
  return {
    userId,
    transactionId,
    originalTransactionId,
    appAccountToken,
    state,
    productId,
    purchaseDate,
    refundedAt: isRevoked
      ? dateFromMs(transaction.revocationDate) || signedDate
      : null,
  };
}
