import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
import { auth } from "@/auth";
import { getUserById } from "@/lib/db/users";

export const runtime = "nodejs";

let analyticsClientPromise: Promise<MongoClient> | null = null;

function cleanString(value: unknown, max = 500): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeEmail(value: unknown): string {
  const email = cleanString(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

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

function validAnonymousId(value: unknown): string {
  const anonymousId = cleanString(value, 128);
  if (!/^anon_[a-zA-Z0-9_.:-]{4,120}$/.test(anonymousId)) return "";
  return anonymousId;
}

function validSessionId(value: unknown): string {
  const sessionId = cleanString(value, 128);
  if (!sessionId || !/^[a-zA-Z0-9_.:-]{4,128}$/.test(sessionId)) return "";
  return sessionId;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = normalizeEmail(session.user.email);
    if (!email || email.endsWith("@guest.mybingocard.com")) {
      return NextResponse.json({ ok: true, skipped: "guest_or_invalid_email" });
    }

    const body = await request.json().catch(() => ({}));
    const anonymousId = validAnonymousId(body?.anonymousId);
    if (!anonymousId) {
      return NextResponse.json({ error: "Invalid anonymousId" }, { status: 400 });
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const name = cleanString(user.name || session.user.name || email.split("@")[0], 160);
    const analyticsClient = await getAnalyticsClient();
    const analyticsDb = analyticsClient.db();

    await analyticsDb.collection("visitor_profiles").updateOne(
      { anonymousId },
      {
        $setOnInsert: {
          anonymousId,
          firstSeenAt: now,
        },
        $set: {
          domain: "mybingocard.com",
          client: "mybingocard",
          name,
          email,
          sessionId: validSessionId(body?.sessionId),
          lastSeenAt: now,
          lastIdentifiedAt: now,
          lastMatchedAt: now,
          lastPathname: cleanString(body?.currentUrl, 2000),
          lastReferrer: cleanString(body?.referrer, 2000),
          source: "mybingocard_login",
          matchSource: "mybingocard.users.authenticated_session",
          matchConfidence: 100,
          matchedRecords: [
            {
              collection: "mybingocard.users",
              id: user._id.toString(),
              client: "mybingocard",
              status: user.planType || "",
              source: "mybingocard.com",
              createdAt: user.createdAt,
              matchedOn: "authenticated_session",
              confidence: 100,
            },
          ],
          myBingoCardUserId: user._id.toString(),
          legacyAnonymousId: cleanString(body?.legacyAnonymousId, 128),
          landingUrl: cleanString(body?.landingUrl, 2000),
        },
        $addToSet: {
          sources: "mybingocard_login",
        },
        $inc: {
          identifyCount: 1,
          internalMatchCount: 1,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, anonymousId });
  } catch (error) {
    console.error("MyBingoCard analytics identify error:", error);
    return NextResponse.json({ error: "Failed to identify visitor" }, { status: 500 });
  }
}
