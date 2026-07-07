import clientPromise from "@/lib/mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

export interface LiveGameWaitlistEntry {
  email: string;
  name: string;
  userId: string;
  createdAt?: Date;
}

export async function upsertLiveGameWaitlistEntry(input: {
  email: string;
  name?: string | null;
  userId?: string | null;
  now?: Date;
}): Promise<void> {
  const now = input.now || new Date();
  const update = {
    $set: {
      email: input.email,
      name: input.name || "",
      userId: input.userId || "",
    },
    $setOnInsert: {
      createdAt: now,
    },
  };

  if (useSqliteDb()) {
    getSqliteStore().updateOne(
      "live_game_waitlist",
      { email: input.email },
      update,
      { upsert: true }
    );
    return;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db.collection<LiveGameWaitlistEntry>("live_game_waitlist").updateOne(
    { email: input.email },
    update,
    { upsert: true }
  );
}

export async function getLiveGameWaitlist(): Promise<LiveGameWaitlistEntry[]> {
  if (useSqliteDb()) {
    return getSqliteStore().findMany<LiveGameWaitlistEntry>(
      "live_game_waitlist",
      {},
      { sort: { createdAt: -1 } }
    );
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db
    .collection<LiveGameWaitlistEntry>("live_game_waitlist")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
}
