import { getSqliteStore } from "@/lib/db/sqlite";

export interface CancellationSurvey {
  email: string;
  userId?: string | null;
  reason: string;
  details: string;
  createdAt: Date;
}

export async function createCancellationSurvey(survey: CancellationSurvey): Promise<void> {
  getSqliteStore().insertOne("cancellation_surveys", survey);
}
