import { getSqliteStore } from "@/lib/db/sqlite";

export interface StripeWebhookEventRecord {
  _id?: string;
  eventId: string;
  type: string;
  processedAt: Date;
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

export async function claimStripeWebhookEvent(data: {
  eventId: string;
  type: string;
  processedAt?: Date;
}): Promise<boolean> {
  const store = getSqliteStore();
  if (store.findOne("webhook_events", { eventId: data.eventId })) {
    return false;
  }

  store.insertOne("webhook_events", {
    _id: data.eventId,
    eventId: data.eventId,
    type: data.type,
    processedAt: data.processedAt || new Date(),
  });
  return true;
}

export async function insertWebhookPartialFailure(
  failure: WebhookPartialFailureRecord
): Promise<void> {
  getSqliteStore().insertOne("webhook_partial_failures", failure);
}
