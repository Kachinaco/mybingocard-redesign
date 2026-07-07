import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

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

let analyticsClientPromise: Promise<MongoClient> | null = null;

function readEnvFile(filePath: string): Record<string, string> {
  try {
    const env: Record<string, string> = {};
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^['"]|['"]$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

function getAnalyticsMongoUri(): string {
  if (process.env.ANALYTICS_MONGODB_URI) return process.env.ANALYTICS_MONGODB_URI;
  if (process.env.TOWNRANKER_ANALYTICS_MONGODB_URI) return process.env.TOWNRANKER_ANALYTICS_MONGODB_URI;
  const analyticsEnv = readEnvFile("/opt/saas/analytics-tracker/.env");
  return analyticsEnv.MONGODB_URI || "mongodb://localhost:27017/analytics";
}

async function getAnalyticsClient(): Promise<MongoClient> {
  if (!analyticsClientPromise) {
    analyticsClientPromise = new MongoClient(getAnalyticsMongoUri(), {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    }).connect();
  }
  return analyticsClientPromise;
}

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

  if (useSqliteDb()) {
    getSqliteStore().updateOne("visitor_profiles", { anonymousId: record.anonymousId }, update, { upsert: true });
    return;
  }

  const analyticsClient = await getAnalyticsClient();
  await analyticsClient.db().collection("visitor_profiles").updateOne(
    { anonymousId: record.anonymousId },
    update,
    { upsert: true }
  );
}
