import { ObjectId } from "bson";
import { getSqliteStore } from "@/lib/db/sqlite";

export interface GameState {
  _id: ObjectId;
  cardId: string;
  userId: string;
  markedCells: number[];
  hasBingo: boolean;
  updatedAt: Date;
}

export async function getGameState(cardId: string, userId: string): Promise<GameState | null> {
  return getSqliteStore().findOne<GameState>("gameStates", { cardId, userId });
}

export async function saveGameState(
  cardId: string,
  userId: string,
  markedCells: number[],
  hasBingo: boolean
): Promise<void> {
  getSqliteStore().updateOne<GameState>(
    "gameStates",
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
  getSqliteStore().deleteOne("gameStates", { cardId, userId });
}
