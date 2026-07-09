import { ObjectId } from "bson";
import { getSqliteStore } from "@/lib/db/sqlite";

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
  return getSqliteStore().findMany<SupportTicket>(
    "support_tickets",
    {},
    { sort: { receivedAt: -1 }, limit: boundedLimit }
  );
}

export async function getSupportTicketById(ticketId: string): Promise<SupportTicket | null> {
  return getSqliteStore().findOne<SupportTicket>("support_tickets", {
    _id: new ObjectId(ticketId),
  });
}

export async function updateSupportTicketStatus(
  ticketId: string,
  status: "open" | "resolved"
): Promise<boolean> {
  const result = getSqliteStore().updateOne<SupportTicket>(
    "support_tickets",
    { _id: new ObjectId(ticketId) },
    { $set: { status, updatedAt: new Date() } }
  );
  return result.matchedCount > 0;
}

export async function appendSupportTicketReply(
  ticketId: string,
  reply: SupportTicketReply
): Promise<boolean> {
  const result = getSqliteStore().updateOne<SupportTicket>(
    "support_tickets",
    { _id: new ObjectId(ticketId) },
    {
      $push: { replies: reply },
      $set: { updatedAt: new Date() },
    }
  );
  return result.matchedCount > 0;
}
