import { getSqliteStore } from "@/lib/db/sqlite";

type MatchedRecord = {
  collection: string;
  id: string;
  client: string;
  status: string;
  source: string;
  createdAt?: Date;
  matchedOn: string;
  confidence: number;
};

export type VisitorProfileIdentifyRecord = {
  anonymousId: string;
  domain: string;
  client: string;
  name: string;
  email: string;
  sessionId: string;
  lastPathname: string;
  lastReferrer: string;
  matchedRecords: MatchedRecord[];
  myBingoCardUserId: string;
  legacyAnonymousId: string;
  landingUrl: string;
  now?: Date;
};

export async function upsertVisitorProfileIdentification(record: VisitorProfileIdentifyRecord): Promise<void> {
  const now = record.now || new Date();
  const update = {
    $setOnInsert: {
      anonymousId: record.anonymousId,
      firstSeenAt: now,
    },
    $set: {
      domain: record.domain,
      client: record.client,
      name: record.name,
      email: record.email,
      sessionId: record.sessionId,
      lastSeenAt: now,
      lastIdentifiedAt: now,
      lastMatchedAt: now,
      lastPathname: record.lastPathname,
      lastReferrer: record.lastReferrer,
      source: "mybingocard_login",
      matchSource: "mybingocard.users.authenticated_session",
      matchConfidence: 100,
      matchedRecords: record.matchedRecords,
      myBingoCardUserId: record.myBingoCardUserId,
      legacyAnonymousId: record.legacyAnonymousId,
      landingUrl: record.landingUrl,
    },
    $addToSet: {
      sources: "mybingocard_login",
    },
    $inc: {
      identifyCount: 1,
      internalMatchCount: 1,
    },
  };

  getSqliteStore().updateOne("visitor_profiles", { anonymousId: record.anonymousId }, update, { upsert: true });
}
