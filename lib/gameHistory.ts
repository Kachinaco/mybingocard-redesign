import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

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
  const client = await clientPromise;
  return client.db().collection<GameHistoryEntry>("gameHistory");
}

export async function saveGameHistory(entry: Omit<GameHistoryEntry, "_id">) {
  const col = await getCollection();
  const result = await col.insertOne({ ...entry, datePlayed: new Date(entry.datePlayed) });
  return result.insertedId;
}

export async function getGameHistory(userId: string, limit = 20) {
  const col = await getCollection();
  return col
    .find({ userId })
    .sort({ datePlayed: -1 })
    .limit(limit)
    .toArray();
}

export async function getGameStats(userId: string) {
  const col = await getCollection();
  const total = await col.countDocuments({ userId });
  const wins = await col.countDocuments({ userId, won: true });
  return { total, wins, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 };
}
