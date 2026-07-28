import { createHash } from "node:crypto";
import { ObjectId } from "bson";
import { getSqliteStore } from "@/lib/db/sqlite";

export type AppleIapNotificationStatus =
  | "processing"
  | "completed"
  | "failed"
  | "pending_owner";

type AppleIapNotificationRecord = {
  _id: ObjectId;
  notificationUUID: string;
  status: AppleIapNotificationStatus;
  attempts: number;
};

function notificationObjectId(notificationUUID: string): ObjectId {
  const digest = createHash("sha256").update(`notification:${notificationUUID}`).digest("hex");
  return new ObjectId(digest.slice(0, 24));
}

export async function beginAppleIapNotification(input: {
  notificationUUID: string;
  notificationType?: string | null;
  subtype?: string | null;
  signedDate?: Date | null;
  environment?: string | null;
  signedPayload: string;
}): Promise<"process" | "duplicate"> {
  const store = getSqliteStore();
  const existing = store.findOne<AppleIapNotificationRecord>("apple_iap_notifications", {
    notificationUUID: input.notificationUUID,
  });
  if (existing?.status === "completed") return "duplicate";

  const now = new Date();
  store.findOneAndUpdate(
    "apple_iap_notifications",
    { _id: existing?._id || notificationObjectId(input.notificationUUID) },
    {
      $setOnInsert: {
        notificationUUID: input.notificationUUID,
        createdAt: now,
        attempts: 0,
      },
      $set: {
        notificationType: input.notificationType || null,
        subtype: input.subtype || null,
        signedDate: input.signedDate || null,
        environment: input.environment || null,
        signedPayload: input.signedPayload,
        status: "processing",
        lastError: null,
        updatedAt: now,
      },
      $inc: { attempts: 1 },
    },
    { upsert: true, returnDocument: "after" },
  );
  return "process";
}

export async function finishAppleIapNotification(input: {
  notificationUUID: string;
  status: Exclude<AppleIapNotificationStatus, "processing">;
  userId?: string | null;
  transactionId?: string | null;
  originalTransactionId?: string | null;
  appAccountToken?: string | null;
  error?: string | null;
}): Promise<void> {
  getSqliteStore().updateOne(
    "apple_iap_notifications",
    { notificationUUID: input.notificationUUID },
    {
      $set: {
        status: input.status,
        userId: input.userId || null,
        transactionId: input.transactionId || null,
        originalTransactionId: input.originalTransactionId || null,
        appAccountToken: input.appAccountToken || null,
        lastError: input.error || null,
        updatedAt: new Date(),
      },
    },
  );
}
