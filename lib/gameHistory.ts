import type { ObjectId } from "bson";
import { getSqliteStore } from "./db/sqlite";

export interface GameHistoryEntry {
  _id?: ObjectId;
  userId: string;
  cardId: string;
  cardName: string;
  won: boolean;
  datePlayed: Date;
  duration: number;
}

export async function saveGameHistory(entry: Omit<GameHistoryEntry, "_id">) {
  const result = getSqliteStore().insertOne("gameHistory", {
    ...entry,
    datePlayed: new Date(entry.datePlayed),
  });
  return result.insertedId;
}

export async function getGameHistory(userId: string, limit = 20) {
  return getSqliteStore().findMany<GameHistoryEntry>(
    "gameHistory",
    { userId },
    { sort: { datePlayed: -1 }, limit }
  );
}

export async function getGameStats(userId: string) {
  const rows = getSqliteStore().findMany<GameHistoryEntry>("gameHistory", { userId });
  const wins = rows.filter((row) => row.won).length;
  return {
    total: rows.length,
    wins,
    winRate: rows.length > 0 ? Math.round((wins / rows.length) * 100) : 0,
  };
}
