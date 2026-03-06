import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

export interface Favorite {
  _id?: ObjectId;
  userId: string;
  cardId: string;
  createdAt: Date;
}

async function getCollection() {
  const client = await clientPromise;
  return client.db().collection<Favorite>("favorites");
}

export async function toggleFavorite(userId: string, cardId: string): Promise<boolean> {
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
  const col = await getCollection();
  const doc = await col.findOne({ userId, cardId });
  return !!doc;
}

export async function getUserFavorites(userId: string, limit = 20) {
  const col = await getCollection();
  return col
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
