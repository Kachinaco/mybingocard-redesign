import { ObjectId } from "bson";
import { getSqliteStore } from "@/lib/db/sqlite";

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
  const result = getSqliteStore().insertOne("gameHistory", {
    ...data,
    completedAt: new Date(),
  } as GameHistory);
  return String(result.insertedId);
}

export async function getGameHistory(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ games: GameHistory[]; total: number }> {
  const store = getSqliteStore();
  const total = store.count("gameHistory", { userId });
  const games = store.findMany<GameHistory>(
    "gameHistory",
    { userId },
    { sort: { completedAt: -1 }, skip: offset, limit }
  );

  return { games, total };
}

export async function getRecentlyPlayed(userId: string, limit = 6): Promise<GameHistory[]> {
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

export async function getGameStats(userId: string): Promise<GameStats> {
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

export async function getGameCount(userId: string): Promise<number> {
  return getSqliteStore().count("gameHistory", { userId });
}

export async function getWinCount(userId: string): Promise<number> {
  return getSqliteStore().count("gameHistory", { userId, result: "won" });
}
