import clientPromise from "@/lib/mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

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

let webhookEventsIndexEnsured = false;

async function getWebhookEventsCollection() {
  const client = await clientPromise;
  const collection = client
    .db("mybingocard")
    .collection<StripeWebhookEventRecord>("webhook_events");

  if (!webhookEventsIndexEnsured) {
    try {
      await collection.createIndex({ eventId: 1 }, { unique: true });
    } catch (error) {
      console.error("webhook_events index creation failed:", error);
    }
    webhookEventsIndexEnsured = true;
  }

  return collection;
}

export async function claimStripeWebhookEvent(data: {
  eventId: string;
  type: string;
  processedAt?: Date;
}): Promise<boolean> {
  const processedAt = data.processedAt || new Date();

  if (useSqliteDb()) {
    const store = getSqliteStore();
    if (store.findOne("webhook_events", { eventId: data.eventId })) {
      return false;
    }

    store.insertOne("webhook_events", {
      _id: data.eventId,
      eventId: data.eventId,
      type: data.type,
      processedAt,
    });
    return true;
  }

  const collection = await getWebhookEventsCollection();
  try {
    await collection.insertOne({
      eventId: data.eventId,
      type: data.type,
      processedAt,
    });
    return true;
  } catch (error: any) {
    if (error?.code === 11000) {
      return false;
    }
    throw error;
  }
}

export async function insertWebhookPartialFailure(
  failure: WebhookPartialFailureRecord
): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().insertOne("webhook_partial_failures", failure);
    return;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db.collection<WebhookPartialFailureRecord>("webhook_partial_failures").insertOne(failure);
}
