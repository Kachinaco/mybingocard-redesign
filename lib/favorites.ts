import { getSqliteStore } from "./db/sqlite";

export interface Favorite {
  _id?: unknown;
  userId: string;
  cardId: string;
  createdAt: Date;
}

export async function toggleFavorite(userId: string, cardId: string): Promise<boolean> {
  const store = getSqliteStore();
  const existing = store.findOne<Favorite>("favorites", { userId, cardId });
  if (existing) {
    store.deleteOne("favorites", { userId, cardId });
    return false; // removed
  }
  store.insertOne("favorites", { userId, cardId, createdAt: new Date() });
  return true; // added
}

export async function isFavorited(userId: string, cardId: string): Promise<boolean> {
  const doc = getSqliteStore().findOne<Favorite>("favorites", { userId, cardId });
  return !!doc;
}

export async function getUserFavorites(userId: string, limit = 20) {
  return getSqliteStore().findMany<Favorite>("favorites", { userId }, { sort: { createdAt: -1 }, limit });
}
