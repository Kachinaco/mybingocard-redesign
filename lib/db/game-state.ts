import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";

export interface GameState {
  _id: ObjectId;
  cardId: string;
  userId: string;
  markedCells: number[];
  hasBingo: boolean;
  updatedAt: Date;
}

export async function getGameState(cardId: string, userId: string): Promise<GameState | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection<GameState>("gameStates").findOne({ cardId, userId });
}

export async function saveGameState(
  cardId: string,
  userId: string,
  markedCells: number[],
  hasBingo: boolean
): Promise<void> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db.collection<GameState>("gameStates").updateOne(
    { cardId, userId },
    {
      $set: {
        cardId,
        userId,
        markedCells,
        hasBingo,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function deleteGameState(cardId: string, userId: string): Promise<void> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db.collection<GameState>("gameStates").deleteOne({ cardId, userId });
}
