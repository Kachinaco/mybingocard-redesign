import { getSqliteStore } from "@/lib/db/sqlite";

export interface StripeWebhookEventRecord {
  _id?: string;
  eventId: string;
  type: string;
  status?: "processing" | "completed" | "failed";
  attempts?: number;
  claimedAt?: Date;
  processedAt?: Date;
  failedAt?: Date;
  lastError?: string;
}

export interface WebhookPartialFailureRecord {
  type: string;
  stripeSessionId: string;
  ownerUserId: string;
  ownerEmail: string;
  batchId: string;
  requestedCount: number;
  successfulCount: number;
  failedCount: number;
  failedLinks: Array<{
    cardId: string;
    recipientEmail?: string;
    error: string;
  }>;
  createdAt: Date;
}

export type StripeWebhookClaimResult = "claimed" | "completed" | "processing";

export async function claimStripeWebhookEvent(data: {
  eventId: string;
  type: string;
  processedAt?: Date;
}): Promise<StripeWebhookClaimResult> {
  const store = getSqliteStore();
  const now = new Date();
  const staleBefore = now.getTime() - 10 * 60 * 1000;
  const existing = store.findOne<StripeWebhookEventRecord>("webhook_events", { eventId: data.eventId });

  // Legacy rows predate explicit state and represent completed events.
  if (existing && (!existing.status || existing.status === "completed")) return "completed";
  if (
    existing?.status === "processing" &&
    existing.claimedAt instanceof Date &&
    existing.claimedAt.getTime() >= staleBefore
  ) {
    return "processing";
  }

  if (existing) {
    store.updateOne("webhook_events", { eventId: data.eventId }, {
      $set: {
        status: "processing",
        claimedAt: now,
        lastError: null,
      },
      $inc: { attempts: 1 },
      $unset: { failedAt: "" },
    });
    return "claimed";
  }

  try {
    store.insertOne("webhook_events", {
      _id: data.eventId,
      eventId: data.eventId,
      type: data.type,
      status: "processing",
      attempts: 1,
      claimedAt: now,
    });
    return "claimed";
  } catch (error) {
    // The event id is the SQLite primary key, so a concurrent insert means a
    // different worker won the claim. Unexpected storage errors still surface.
    if (store.findOne("webhook_events", { eventId: data.eventId })) return "processing";
    throw error;
  }
}

export async function completeStripeWebhookEvent(eventId: string): Promise<void> {
  const completedAt = new Date();
  getSqliteStore().updateOne("webhook_events", { eventId }, {
    $set: {
      status: "completed",
      processedAt: completedAt,
      completedAt,
      lastError: null,
    },
    $unset: { failedAt: "" },
  });
}

export async function failStripeWebhookEvent(eventId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error || "Unknown webhook failure");
  getSqliteStore().updateOne("webhook_events", { eventId }, {
    $set: {
      status: "failed",
      failedAt: new Date(),
      lastError: message.slice(0, 1000),
    },
  });
}

export async function insertWebhookPartialFailure(
  failure: WebhookPartialFailureRecord
): Promise<void> {
  getSqliteStore().insertOne("webhook_partial_failures", failure);
}
