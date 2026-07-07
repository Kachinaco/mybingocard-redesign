import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

export interface SupportTicketReply {
  from: string | null;
  message: string;
  sentAt: Date;
}

export interface SupportTicket {
  _id: ObjectId;
  email: string;
  subject?: string;
  body?: string;
  preview?: string;
  status?: "open" | "resolved";
  isReply?: boolean;
  messageId?: string;
  receivedAt?: Date;
  updatedAt?: Date;
  replies?: SupportTicketReply[];
}

export async function getRecentSupportTickets(limit = 100): Promise<SupportTicket[]> {
  const boundedLimit = Math.max(1, Math.min(500, limit));

  if (useSqliteDb()) {
    return getSqliteStore().findMany<SupportTicket>(
      "support_tickets",
      {},
      { sort: { receivedAt: -1 }, limit: boundedLimit }
    );
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db
    .collection<SupportTicket>("support_tickets")
    .find({})
    .sort({ receivedAt: -1 })
    .limit(boundedLimit)
    .toArray();
}

export async function getSupportTicketById(ticketId: string): Promise<SupportTicket | null> {
  const objectId = new ObjectId(ticketId);

  if (useSqliteDb()) {
    return getSqliteStore().findOne<SupportTicket>("support_tickets", { _id: objectId });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection<SupportTicket>("support_tickets").findOne({ _id: objectId });
}

export async function updateSupportTicketStatus(
  ticketId: string,
  status: "open" | "resolved"
): Promise<boolean> {
  const objectId = new ObjectId(ticketId);
  const update = { $set: { status, updatedAt: new Date() } };

  if (useSqliteDb()) {
    const result = getSqliteStore().updateOne<SupportTicket>(
      "support_tickets",
      { _id: objectId },
      update
    );
    return result.matchedCount > 0;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const result = await db
    .collection<SupportTicket>("support_tickets")
    .updateOne({ _id: objectId }, update);

  return result.matchedCount > 0;
}

export async function appendSupportTicketReply(
  ticketId: string,
  reply: SupportTicketReply
): Promise<boolean> {
  const objectId = new ObjectId(ticketId);
  const update = {
    $push: { replies: reply },
    $set: { updatedAt: new Date() },
  };

  if (useSqliteDb()) {
    const result = getSqliteStore().updateOne<SupportTicket>(
      "support_tickets",
      { _id: objectId },
      update
    );
    return result.matchedCount > 0;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const result = await db
    .collection<SupportTicket>("support_tickets")
    .updateOne({ _id: objectId }, update as any);

  return result.matchedCount > 0;
}
