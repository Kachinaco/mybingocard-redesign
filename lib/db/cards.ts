import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";

export interface BingoCard {
  _id: ObjectId;
  userId: string; // User's _id as string
  title: string;
  description?: string;
  size: 3 | 4 | 5; // Grid size (3x3, 4x4, 5x5)
  cells: string[]; // Array of cell values
  freeSpace: boolean; // Whether center is a free space
  style: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: string;
    fontFamily?: string;
  };
  templateId?: ObjectId; // If created from template
  isPublic: boolean;
  shareLink?: string; // Unique share link
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function createCard(data: Omit<BingoCard, "_id" | "createdAt" | "updatedAt" | "views">): Promise<BingoCard> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const card: Partial<BingoCard> = {
    ...data,
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection<BingoCard>("cards").insertOne(card as BingoCard);

  return {
    ...card,
    _id: result.insertedId,
  } as BingoCard;
}

export async function getUserCards(userId: string): Promise<BingoCard[]> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const cards = await db
    .collection<BingoCard>("cards")
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();

  return cards;
}

export async function getCardById(cardId: string): Promise<BingoCard | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const card = await db.collection<BingoCard>("cards").findOne({
    _id: new ObjectId(cardId),
  });

  return card;
}

export async function getCardByShareLink(shareLink: string): Promise<BingoCard | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const card = await db.collection<BingoCard>("cards").findOne({ shareLink });

  if (card) {
    // Increment view count
    await db.collection<BingoCard>("cards").updateOne(
      { _id: card._id },
      { $inc: { views: 1 } }
    );
  }

  return card;
}

export async function updateCard(
  cardId: string,
  data: Partial<BingoCard>
): Promise<BingoCard | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<BingoCard>("cards").findOneAndUpdate(
    { _id: new ObjectId(cardId) },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function deleteCard(cardId: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<BingoCard>("cards").deleteOne({
    _id: new ObjectId(cardId),
  });

  return result.deletedCount > 0;
}

// Generate a unique share link
export function generateShareLink(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function markCardAsPremium(cardId: string, userId: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection("cards").updateOne(
    { _id: new ObjectId(cardId), userId },
    {
      $set: {
        isPremium: true,
        premiumPurchasedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return result.matchedCount > 0;
}
