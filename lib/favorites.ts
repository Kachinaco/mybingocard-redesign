import type { ObjectId } from "mongodb";
import { getSqliteStore, useSqliteDb } from "./db/sqlite";

export interface Favorite {
  _id?: ObjectId;
  userId: string;
  cardId: string;
  createdAt: Date;
}

async function getCollection() {
  const { default: clientPromise } = await import("./mongodb");
  const client = await clientPromise;
  return client.db().collection<Favorite>("favorites");
}

export async function toggleFavorite(userId: string, cardId: string): Promise<boolean> {
  if (useSqliteDb()) {
    const store = getSqliteStore();
    const existing = store.findOne<Favorite>("favorites", { userId, cardId });
    if (existing) {
      store.deleteOne("favorites", { userId, cardId });
      return false; // removed
    }
    store.insertOne("favorites", { userId, cardId, createdAt: new Date() });
    return true; // added
  }

  const col = await getCollection();
  const existing = await col.findOne({ userId, cardId });
  if (existing) {
    await col.deleteOne({ _id: existing._id });
    return false; // removed
  }
  await col.insertOne({ userId, cardId, createdAt: new Date() });
  return true; // added
}

export async function isFavorited(userId: string, cardId: string): Promise<boolean> {
  if (useSqliteDb()) {
    const doc = getSqliteStore().findOne<Favorite>("favorites", { userId, cardId });
    return !!doc;
  }

  const col = await getCollection();
  const doc = await col.findOne({ userId, cardId });
  return !!doc;
}

export async function getUserFavorites(userId: string, limit = 20) {
  if (useSqliteDb()) {
    return getSqliteStore().findMany<Favorite>(
      "favorites",
      { userId },
      { sort: { createdAt: -1 }, limit }
    );
  }

  const col = await getCollection();
  return col
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
