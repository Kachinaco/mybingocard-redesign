import { getSqliteStore } from "@/lib/db/sqlite";

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
  getSqliteStore().updateOne(
    "live_game_waitlist",
    { email: input.email },
    {
      $set: {
        email: input.email,
        name: input.name || "",
        userId: input.userId || "",
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

export async function getLiveGameWaitlist(): Promise<LiveGameWaitlistEntry[]> {
  return getSqliteStore().findMany<LiveGameWaitlistEntry>(
    "live_game_waitlist",
    {},
    { sort: { createdAt: -1 } }
  );
}
