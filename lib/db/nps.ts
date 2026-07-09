import { getSqliteStore } from "@/lib/db/sqlite";

export interface NpsResponse {
  userId?: string | null;
  email: string;
  score: number;
  comment: string;
  createdAt: Date;
}

export async function createNpsResponse(response: NpsResponse): Promise<void> {
  getSqliteStore().insertOne("nps_responses", response);
}
