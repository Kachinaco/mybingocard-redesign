import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export interface GameHistory {
  _id: ObjectId;
  userId: string;
  cardId: string;
  cardTitle: string;
  cardSize: number;
  result: "won" | "abandoned";
  timePlayedMs: number;
  markedCells: number[];
  winPattern?: string;
  startedAt: Date;
  completedAt: Date;
}

export interface GameStats {
  totalGames: number;
  wins: number;
  winRate: number;
  avgTimeMs: number;
  fastestWinMs: number | null;
}

export async function recordGame(data: Omit<GameHistory, "_id">): Promise<string> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const result = await db.collection("gameHistory").insertOne({
    ...data,
    completedAt: new Date(),
  });
  return result.insertedId.toString();
}

export async function getGameHistory(userId: string, limit = 20, offset = 0): Promise<{ games: GameHistory[]; total: number }> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const collection = db.collection("gameHistory");

  const [games, total] = await Promise.all([
    collection.find({ userId }).sort({ completedAt: -1 }).skip(offset).limit(limit).toArray(),
    collection.countDocuments({ userId }),
  ]);

  return { games: games as unknown as GameHistory[], total };
}

export async function getRecentlyPlayed(userId: string, limit = 6): Promise<GameHistory[]> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const results = await db.collection("gameHistory").aggregate([
    { $match: { userId } },
    { $sort: { completedAt: -1 } },
    { $group: { _id: "$cardId", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
    { $sort: { completedAt: -1 } },
    { $limit: limit },
  ]).toArray();

  return results as unknown as GameHistory[];
}

export async function getGameStats(userId: string): Promise<GameStats> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const collection = db.collection("gameHistory");

  const [totalGames, wins, avgResult, fastestResult] = await Promise.all([
    collection.countDocuments({ userId }),
    collection.countDocuments({ userId, result: "won" }),
    collection.aggregate([
      { $match: { userId } },
      { $group: { _id: null, avg: { $avg: "$timePlayedMs" } } },
    ]).toArray(),
    collection.aggregate([
      { $match: { userId, result: "won" } },
      { $sort: { timePlayedMs: 1 } },
      { $limit: 1 },
    ]).toArray(),
  ]);

  return {
    totalGames,
    wins,
    winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
    avgTimeMs: avgResult[0]?.avg || 0,
    fastestWinMs: fastestResult[0]?.timePlayedMs || null,
  };
}

export async function getGameCount(userId: string): Promise<number> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection("gameHistory").countDocuments({ userId });
}

export async function getWinCount(userId: string): Promise<number> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection("gameHistory").countDocuments({ userId, result: "won" });
}
