import type { ObjectId } from "mongodb";
import { getSqliteStore, useSqliteDb } from "./db/sqlite";

export interface GameHistoryEntry {
  _id?: ObjectId;
  userId: string;
  cardId: string;
  cardName: string;
  won: boolean;
  datePlayed: Date;
  duration: number; // seconds
}

async function getCollection() {
  const { default: clientPromise } = await import("./mongodb");
  const client = await clientPromise;
  return client.db().collection<GameHistoryEntry>("gameHistory");
}

export async function saveGameHistory(entry: Omit<GameHistoryEntry, "_id">) {
  if (useSqliteDb()) {
    const result = getSqliteStore().insertOne("gameHistory", {
      ...entry,
      datePlayed: new Date(entry.datePlayed),
    });
    return result.insertedId;
  }

  const col = await getCollection();
  const result = await col.insertOne({ ...entry, datePlayed: new Date(entry.datePlayed) });
  return result.insertedId;
}

export async function getGameHistory(userId: string, limit = 20) {
  if (useSqliteDb()) {
    return getSqliteStore().findMany<GameHistoryEntry>(
      "gameHistory",
      { userId },
      { sort: { datePlayed: -1 }, limit }
    );
  }

  const col = await getCollection();
  return col
    .find({ userId })
    .sort({ datePlayed: -1 })
    .limit(limit)
    .toArray();
}

export async function getGameStats(userId: string) {
  if (useSqliteDb()) {
    const rows = getSqliteStore().findMany<GameHistoryEntry>("gameHistory", { userId });
    const wins = rows.filter((row) => row.won).length;
    return {
      total: rows.length,
      wins,
      winRate: rows.length > 0 ? Math.round((wins / rows.length) * 100) : 0,
    };
  }

  const col = await getCollection();
  const total = await col.countDocuments({ userId });
  const wins = await col.countDocuments({ userId, won: true });
  return { total, wins, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 };
}
