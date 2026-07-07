import { createHash } from "crypto";
import clientPromise from "@/lib/mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";
import type { SqliteFilter } from "@/lib/sqlite-document-store";

type SignupLimitReason = "ip_short_window" | "ip_hourly" | "ip_user_agent" | "user_agent_global";

export type SignupAbuseLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: SignupLimitReason;
      count: number;
      limit: number;
      retryAfterSeconds: number;
    };

type SignupAbusePolicy = {
  shortWindowMs: number;
  shortWindowMax: number;
  hourlyWindowMs: number;
  hourlyMax: number;
  ipUserAgentWindowMs: number;
  ipUserAgentMax: number;
  globalUserAgentWindowMs: number;
  globalUserAgentMax: number;
};

const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const ONE_DAY_SECONDS = 24 * 60 * 60;

let signupAttemptIndexesReady: Promise<void> | null = null;

type SignupAttemptDocument = {
  ipAddress: string | null;
  email: string | null;
  userAgentHash: string | null;
  allowed: boolean;
  reason: SignupLimitReason | null;
  createdAt: Date;
};

function positiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function getSignupAbusePolicy(): SignupAbusePolicy {
  return {
    shortWindowMs: positiveIntFromEnv("MBC_SIGNUP_RATE_SHORT_WINDOW_MS", 10 * ONE_MINUTE_MS),
    shortWindowMax: positiveIntFromEnv("MBC_SIGNUP_RATE_SHORT_MAX", 3),
    hourlyWindowMs: positiveIntFromEnv("MBC_SIGNUP_RATE_HOURLY_WINDOW_MS", ONE_HOUR_MS),
    hourlyMax: positiveIntFromEnv("MBC_SIGNUP_RATE_HOURLY_MAX", 8),
    ipUserAgentWindowMs: positiveIntFromEnv("MBC_SIGNUP_RATE_IP_UA_WINDOW_MS", ONE_HOUR_MS),
    ipUserAgentMax: positiveIntFromEnv("MBC_SIGNUP_RATE_IP_UA_MAX", 4),
    globalUserAgentWindowMs: positiveIntFromEnv("MBC_SIGNUP_RATE_UA_GLOBAL_WINDOW_MS", ONE_HOUR_MS),
    globalUserAgentMax: positiveIntFromEnv("MBC_SIGNUP_RATE_UA_GLOBAL_MAX", 25),
  };
}

function cleanString(value: string | null | undefined, maxLength: number): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeEmail(value: string | null | undefined): string | null {
  return cleanString(value, 320)?.toLowerCase() || null;
}

export function hashSignupUserAgent(userAgent: string | null | undefined): string | null {
  const normalized = cleanString(userAgent, 500);
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

function retryAfterSeconds(windowMs: number): number {
  return Math.max(60, Math.ceil(windowMs / 1000));
}

function cutoff(now: Date, windowMs: number): Date {
  return new Date(now.getTime() - windowMs);
}

async function ensureSignupAttemptIndexes(): Promise<void> {
  if (useSqliteDb()) return;

  if (!signupAttemptIndexesReady) {
    const client = await clientPromise;
    const db = client.db("mybingocard");
    const collection = db.collection("signup_attempts");
    signupAttemptIndexesReady = Promise.all([
      collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2 * ONE_DAY_SECONDS, name: "signup_attempts_ttl" }),
      collection.createIndex({ ipAddress: 1, createdAt: -1 }, { name: "signup_attempts_ip_created" }),
      collection.createIndex({ ipAddress: 1, userAgentHash: 1, createdAt: -1 }, { name: "signup_attempts_ip_ua_created" }),
      collection.createIndex({ userAgentHash: 1, createdAt: -1 }, { name: "signup_attempts_ua_created" }),
    ]).then(() => undefined);
  }

  await signupAttemptIndexesReady;
}

async function countSignupAttempts(filter: SqliteFilter): Promise<number> {
  if (useSqliteDb()) {
    return getSqliteStore().count("signup_attempts", filter);
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection("signup_attempts").countDocuments(filter);
}

async function recordSignupAttempt(document: SignupAttemptDocument): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().insertOne("signup_attempts", document);
    return;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db.collection("signup_attempts").insertOne(document);
}

export async function checkSignupAbuseLimit(input: {
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  now?: Date;
}): Promise<SignupAbuseLimitResult> {
  const now = input.now || new Date();
  const policy = getSignupAbusePolicy();
  const ipAddress = cleanString(input.ipAddress, 100);
  const email = normalizeEmail(input.email);
  const userAgentHash = hashSignupUserAgent(input.userAgent);

  await ensureSignupAttemptIndexes();

  let blocked: Exclude<SignupAbuseLimitResult, { allowed: true }> | null = null;

  if (ipAddress) {
    const [shortCount, hourlyCount, ipUserAgentCount] = await Promise.all([
      countSignupAttempts({ ipAddress, createdAt: { $gte: cutoff(now, policy.shortWindowMs) } }),
      countSignupAttempts({ ipAddress, createdAt: { $gte: cutoff(now, policy.hourlyWindowMs) } }),
      userAgentHash
        ? countSignupAttempts({
            ipAddress,
            userAgentHash,
            createdAt: { $gte: cutoff(now, policy.ipUserAgentWindowMs) },
          })
        : Promise.resolve(0),
    ]);

    if (shortCount >= policy.shortWindowMax) {
      blocked = {
        allowed: false,
        reason: "ip_short_window",
        count: shortCount,
        limit: policy.shortWindowMax,
        retryAfterSeconds: retryAfterSeconds(policy.shortWindowMs),
      };
    } else if (hourlyCount >= policy.hourlyMax) {
      blocked = {
        allowed: false,
        reason: "ip_hourly",
        count: hourlyCount,
        limit: policy.hourlyMax,
        retryAfterSeconds: retryAfterSeconds(policy.hourlyWindowMs),
      };
    } else if (userAgentHash && ipUserAgentCount >= policy.ipUserAgentMax) {
      blocked = {
        allowed: false,
        reason: "ip_user_agent",
        count: ipUserAgentCount,
        limit: policy.ipUserAgentMax,
        retryAfterSeconds: retryAfterSeconds(policy.ipUserAgentWindowMs),
      };
    }
  }

  if (!blocked && userAgentHash) {
    const globalUserAgentCount = await countSignupAttempts({
      userAgentHash,
      createdAt: { $gte: cutoff(now, policy.globalUserAgentWindowMs) },
    });

    if (globalUserAgentCount >= policy.globalUserAgentMax) {
      blocked = {
        allowed: false,
        reason: "user_agent_global",
        count: globalUserAgentCount,
        limit: policy.globalUserAgentMax,
        retryAfterSeconds: retryAfterSeconds(policy.globalUserAgentWindowMs),
      };
    }
  }

  await recordSignupAttempt({
    ipAddress,
    email,
    userAgentHash,
    allowed: !blocked,
    reason: blocked?.reason || null,
    createdAt: now,
  });

  return blocked || { allowed: true };
}
