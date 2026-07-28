import { NextResponse } from "next/server";
import { verifyAndDecodeAppleNotification } from "@/lib/apple-app-store-verifier";
import {
  AppleNotificationOwnerConflictError,
  AppleNotificationOwnerPendingError,
  applyVerifiedAppleNotification,
} from "@/lib/apple-iap-notification-service";
import {
  beginAppleIapNotification,
  finishAppleIapNotification,
} from "@/lib/db/apple-iap-notifications";
import { APPLE_BATCH_PRODUCT_IDS } from "@/lib/apple-iap-products";
import {
  enqueueApplePaymentOutcome,
  enqueueAppleRefundOutcome,
} from "@/lib/server/tracker-outcome-events";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let notificationUUID = "";
  try {
    const body = await request.json().catch(() => ({}));
    const signedPayload = typeof body?.signedPayload === "string" ? body.signedPayload : "";
    if (!signedPayload || signedPayload.length > 1_000_000) {
      return NextResponse.json({ error: "signedPayload is required" }, { status: 400 });
    }

    const notification = await verifyAndDecodeAppleNotification(signedPayload);
    notificationUUID = notification.notificationUUID || "";
    if (!notificationUUID) {
      return NextResponse.json({ error: "Apple notification UUID is required" }, { status: 400 });
    }

    const disposition = await beginAppleIapNotification({
      notificationUUID,
      notificationType: String(notification.notificationType || "") || null,
      subtype: String(notification.subtype || "") || null,
      signedDate: Number.isFinite(notification.signedDate)
        ? new Date(Number(notification.signedDate))
        : null,
      environment: String(notification.data?.environment || "") || null,
      signedPayload,
    });
    if (disposition === "duplicate") {
      return NextResponse.json({ success: true, duplicate: true });
    }

    const result = await applyVerifiedAppleNotification(notification);
    if (
      result.transactionId &&
      result.state === "revoked" &&
      result.refundedAt
    ) {
      enqueueAppleRefundOutcome({
        transactionId: result.transactionId,
        refundedAt: result.refundedAt,
      });
    } else if (
      result.transactionId &&
      result.purchaseDate &&
      (result.state === "paid" ||
        result.state === "active" ||
        result.state === "lifetime")
    ) {
      enqueueApplePaymentOutcome({
        transactionId: result.transactionId,
        occurredAt: result.purchaseDate,
        product: result.productId && APPLE_BATCH_PRODUCT_IDS[result.productId]
          ? "apple_batch_pack"
          : "apple_premium",
      });
    }

    await finishAppleIapNotification({
      notificationUUID,
      status: "completed",
      userId: result.userId,
      transactionId: result.transactionId,
      originalTransactionId: result.originalTransactionId,
      appAccountToken: result.appAccountToken,
    });
    return NextResponse.json({ success: true, state: result.state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apple notification failed";
    if (notificationUUID) {
      const pendingOwner = error instanceof AppleNotificationOwnerPendingError;
      await finishAppleIapNotification({
        notificationUUID,
        status: pendingOwner ? "pending_owner" : "failed",
        error: message,
      }).catch(() => {});
      if (pendingOwner) {
        return NextResponse.json({ error: "Apple notification owner is pending" }, { status: 503 });
      }
      if (error instanceof AppleNotificationOwnerConflictError) {
        return NextResponse.json({ error: "Apple notification owner conflict" }, { status: 409 });
      }
    }
    console.error("Apple IAP notification error:", message);
    return NextResponse.json({ error: "Apple notification verification failed" }, { status: 500 });
  }
}
