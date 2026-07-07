import clientPromise from "@/lib/mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

export interface ActivityEventRecord {
  event: string;
  source?: string;
  userId?: string | null;
  email?: string | null;
  pathname?: string | null;
  sessionId?: string | null;
  anonymousId?: string | null;
  domain?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

const DB_NAME = "mybingocard";

async function mongoDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export async function countActivityEvents(filter: Record<string, unknown>): Promise<number> {
  if (useSqliteDb()) {
    return getSqliteStore().count("activity_events", filter);
  }

  const db = await mongoDb();
  return db.collection("activity_events").countDocuments(filter);
}

export async function hasActivityEvent(filter: Record<string, unknown>): Promise<boolean> {
  if (useSqliteDb()) {
    return Boolean(getSqliteStore().findOne("activity_events", filter));
  }

  const db = await mongoDb();
  return Boolean(await db.collection("activity_events").findOne(filter));
}

export async function countRecentAiGenerations(input: {
  userId?: string | null;
  anonymousQuotaKey?: string | null;
  since?: Date;
}): Promise<number> {
  const since = input.since || new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (input.userId) {
    return countActivityEvents({
      event: "ai_cells_generated",
      userId: input.userId,
      createdAt: { $gte: since },
    });
  }

  if (input.anonymousQuotaKey) {
    return countActivityEvents({
      event: "ai_cells_generated",
      userId: null,
      "metadata.aiQuotaKey": input.anonymousQuotaKey,
      createdAt: { $gte: since },
    });
  }

  return 0;
}

export async function countPriorUserAiGenerations(userId: string): Promise<number> {
  return countActivityEvents({
    event: "ai_cells_generated",
    userId,
  });
}

export async function hasUserActivityEvent(
  userId: string,
  events: string[]
): Promise<boolean> {
  return hasActivityEvent({
    userId,
    event: { $in: events },
  });
}
