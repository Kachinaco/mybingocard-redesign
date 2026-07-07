import clientPromise from "@/lib/mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

export interface NpsResponse {
  userId?: string | null;
  email: string;
  score: number;
  comment: string;
  createdAt: Date;
}

export async function createNpsResponse(response: NpsResponse): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().insertOne("nps_responses", response);
    return;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db.collection<NpsResponse>("nps_responses").insertOne(response);
}
