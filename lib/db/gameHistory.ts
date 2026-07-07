import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

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
  if (useSqliteDb()) {
    const result = getSqliteStore().insertOne("gameHistory", {
      ...data,
      completedAt: new Date(),
    } as GameHistory);
    return String(result.insertedId);
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const result = await db.collection("gameHistory").insertOne({
    ...data,
    completedAt: new Date(),
  });
  return result.insertedId.toString();
}

export async function getGameHistory(userId: string, limit = 20, offset = 0): Promise<{ games: GameHistory[]; total: number }> {
  if (useSqliteDb()) {
    const store = getSqliteStore();
    const total = store.count("gameHistory", { userId });
    const games = store.findMany<GameHistory>(
      "gameHistory",
      { userId },
      { sort: { completedAt: -1 }, skip: offset, limit }
    );

    return { games, total };
  }

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
  if (useSqliteDb()) {
    const latestRows = getSqliteStore().findMany<GameHistory>(
      "gameHistory",
      { userId },
      { sort: { completedAt: -1 } }
    );
    const seenCardIds = new Set<string>();
    const recent: GameHistory[] = [];

    for (const row of latestRows) {
      if (seenCardIds.has(row.cardId)) continue;
      seenCardIds.add(row.cardId);
      recent.push(row);
      if (recent.length >= limit) break;
    }

    return recent;
  }

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
  if (useSqliteDb()) {
    const rows = getSqliteStore().findMany<GameHistory>("gameHistory", { userId });
    const wins = rows.filter((row) => row.result === "won");
    const totalTime = rows.reduce((sum, row) => sum + (row.timePlayedMs || 0), 0);

    return {
      totalGames: rows.length,
      wins: wins.length,
      winRate: rows.length > 0 ? Math.round((wins.length / rows.length) * 100) : 0,
      avgTimeMs: rows.length > 0 ? totalTime / rows.length : 0,
      fastestWinMs: wins.length > 0 ? Math.min(...wins.map((row) => row.timePlayedMs)) : null,
    };
  }

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
  if (useSqliteDb()) {
    return getSqliteStore().count("gameHistory", { userId });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection("gameHistory").countDocuments({ userId });
}

export async function getWinCount(userId: string): Promise<number> {
  if (useSqliteDb()) {
    return getSqliteStore().count("gameHistory", { userId, result: "won" });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection("gameHistory").countDocuments({ userId, result: "won" });
}
