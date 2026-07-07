import clientPromise from "@/lib/mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

export interface CancellationSurvey {
  email: string;
  userId?: string | null;
  reason: string;
  details: string;
  createdAt: Date;
}

export async function createCancellationSurvey(survey: CancellationSurvey): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().insertOne("cancellation_surveys", survey);
    return;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db.collection<CancellationSurvey>("cancellation_surveys").insertOne(survey);
}
