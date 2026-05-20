import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { notifyClientErrorCaptured, notifyClientErrorSpike } from "@/lib/discord";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { symbolicateStack } from "@/lib/source-map-resolver";

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter: max 10 errors per IP per minute
// ---------------------------------------------------------------------------
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const ALERT_WINDOW_MS = 10 * 60_000;
const ALERT_COOLDOWN_MS = 30 * 60_000;
const CAPTURE_ALERT_COOLDOWN_MS = 15 * 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

// Periodically prune expired buckets so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (now >= bucket.resetAt) {
      rateBuckets.delete(ip);
    }
  }
}, 5 * 60_000); // every 5 minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

/** Strip email-like patterns and long non-stack numeric sequences from stack traces */
function sanitizeStack(raw: string, maxLen = 2000): string {
  let s = raw.slice(0, maxLen);
  // Remove email-like patterns
  s = s.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]");
  // Remove long digit sequences (phone, CC, SSN, etc.) without destroying JS stack :line:column coordinates.
  s = s.replace(/(?<!:)\b\d{6,}\b(?!:)/g, "[DIGITS]");
  return s;
}

function clampString(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  return value.slice(0, maxLen);
}

function safeArray(value: unknown, maxItems: number): unknown[] {
  return Array.isArray(value) ? value.slice(-maxItems) : [];
}

function sanitizeDiagnosticValue(value: unknown, depth = 0, key = ""): unknown {
  if (key && /(password|passcode|secret|token|authorization|cookie|csrf|card|cvc|cvv|ssn|email|phone)/i.test(key)) {
    return "[redacted]";
  }
  if (value === null || value === undefined) return value;
  if (depth > 4) return undefined;
  if (Array.isArray(value)) {
    return value
      .slice(-20)
      .map((item) => sanitizeDiagnosticValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  switch (typeof value) {
    case "string":
      return value.slice(0, 1000);
    case "number":
    case "boolean":
      return value;
    case "object": {
      const result: Record<string, unknown> = {};
      for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
        const sanitized = sanitizeDiagnosticValue(childValue, depth + 1, childKey);
        if (sanitized !== undefined) result[childKey] = sanitized;
      }
      return result;
    }
    default:
      return String(value).slice(0, 1000);
  }
}

function normalizeFingerprintPart(value: unknown): string {
  return String(value || "")
    .replace(/[a-f0-9]{16,}/gi, "[hex]")
    .replace(/\b\d{4,}\b/g, "[num]")
    .slice(0, 300);
}

function firstStackFrame(stack: string | null) {
  if (!stack) return "";
  return stack
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.includes("ErrorCapture")) || "";
}

function buildServerFingerprint(doc: {
  type: string;
  message: string;
  source: string | null;
  stack: string | null;
}) {
  const basis = [
    doc.type,
    normalizeFingerprintPart(doc.message),
    normalizeFingerprintPart(doc.source),
    normalizeFingerprintPart(firstStackFrame(doc.stack)),
  ].join("|");
  return `client_${crypto.createHash("sha256").update(basis).digest("hex").slice(0, 16)}`;
}

function pathnameFromPageUrl(pageUrl: string | null) {
  if (!pageUrl) return null;
  try {
    const url = new URL(pageUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return pageUrl.startsWith("/") ? pageUrl.slice(0, 1000) : null;
  }
}

function getSeverity(doc: { type: string; pageUrl: string | null; source: string | null; message: string }) {
  const pathname = pathnameFromPageUrl(doc.pageUrl) || "";
  const source = doc.source || "";
  const isCriticalPath = /^\/(create|game|templates|pricing|cards|checkout|api\/stripe)(\/|\?|$)/i.test(pathname);
  const isPaymentResource = /js\.stripe\.com/i.test(source) || /stripe/i.test(doc.message);
  const isCheckoutLoadFailure = /checkout could not load|failed to load stripe\.js|stripe could not load/i.test(doc.message);
  if (isCriticalPath || (isPaymentResource && isCheckoutLoadFailure)) return "high" as const;
  if (doc.type === "resource_load_failed") return "low" as const;
  return "medium" as const;
}

function isCrawlerUserAgent(userAgent: string | null): boolean {
  return /bot|crawler|spider|slurp|duckduckbot|bingpreview|yandexrenderresourcesbot/i.test(userAgent || "");
}

async function maybeAlertForFingerprint(
  db: Db,
  doc: {
    fingerprint: string;
    type: string;
    message: string;
    source: string | null;
    pageUrl: string | null;
    buildId: string | null;
    severity: "low" | "medium" | "high";
    breadcrumbs: Array<{ type?: string; message?: string; timestamp?: string }>;
  },
  totalCount: number
) {
  const now = new Date();
  const recentSince = new Date(Date.now() - ALERT_WINDOW_MS);
  const [recent] = await db.collection("error_events").aggregate([
    { $match: { fingerprint: doc.fingerprint, createdAt: { $gte: recentSince } } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        sessions: { $addToSet: "$sessionId" },
      },
    },
    {
      $project: {
        _id: 0,
        count: 1,
        sessionCount: {
          $size: {
            $filter: {
              input: "$sessions",
              as: "sessionId",
              cond: { $and: [{ $ne: ["$$sessionId", null] }, { $ne: ["$$sessionId", ""] }] },
            },
          },
        },
      },
    },
  ]).toArray();

  const recentCount = recent?.count || 0;
  const recentSessions = recent?.sessionCount || 0;
  const shouldAlert =
    doc.severity === "high"
      ? recentCount >= 3 || recentSessions >= 2
      : doc.severity === "medium"
        ? (recentCount >= 3 && recentSessions >= 2) || recentSessions >= 3
        : recentCount >= 8 && recentSessions >= 3;

  if (!shouldAlert) return;

  const cooldownBefore = new Date(Date.now() - ALERT_COOLDOWN_MS);
  const claimed = await db.collection<{ _id: string }>("error_fingerprints").findOneAndUpdate(
    {
      _id: doc.fingerprint,
      $or: [
        { lastAlertedAt: { $exists: false } },
        { lastAlertedAt: { $lt: cooldownBefore } },
      ],
    },
    {
      $set: {
        lastAlertedAt: now,
        lastAlertRecentCount: recentCount,
        lastAlertRecentSessions: recentSessions,
      },
    },
    { returnDocument: "after" }
  );

  if (!claimed) return;

  notifyClientErrorSpike({
    fingerprint: doc.fingerprint,
    type: doc.type,
    message: doc.message,
    pageUrl: doc.pageUrl,
    source: doc.source,
    buildId: doc.buildId,
    recentCount,
    recentSessions,
    totalCount,
    severity: doc.severity,
    breadcrumbs: doc.breadcrumbs,
  }).catch(() => {});
}

async function maybeNotifyClientErrorCaptured(
  db: Db,
  doc: {
    fingerprint: string;
    type: string;
    message: string;
    source: string | null;
    pageUrl: string | null;
    buildId: string | null;
    sessionId: string | null;
    anonymousId: string | null;
    severity: "low" | "medium" | "high";
    breadcrumbs: Array<{ type?: string; message?: string; timestamp?: string }>;
  },
  totalCount: number
) {
  const shouldNotify = doc.severity === "high" || (doc.severity === "medium" && totalCount === 1);
  if (!shouldNotify) return;

  const cooldownBefore = new Date(Date.now() - CAPTURE_ALERT_COOLDOWN_MS);
  const claimed = await db.collection<{ _id: string }>("error_fingerprints").findOneAndUpdate(
    {
      _id: doc.fingerprint,
      $or: [
        { lastCapturedNotificationAt: { $exists: false } },
        { lastCapturedNotificationAt: { $lt: cooldownBefore } },
      ],
    },
    {
      $set: {
        lastCapturedNotificationAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (!claimed) return;

  notifyClientErrorCaptured({
    fingerprint: doc.fingerprint,
    type: doc.type,
    message: doc.message,
    pageUrl: doc.pageUrl,
    source: doc.source,
    buildId: doc.buildId,
    sessionId: doc.sessionId,
    anonymousId: doc.anonymousId,
    severity: doc.severity,
    breadcrumbs: doc.breadcrumbs,
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// POST /api/errors/client
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Always return 200 so we never break the client
  const ok = () => NextResponse.json({ ok: true });

  try {
    const ip = getIp(req);
    if (isRateLimited(ip)) return ok();

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return ok();
    }

    const reqCtx = getRequestActivityContext(req);
    const rawStack = body.stack ? String(body.stack).slice(0, 4000) : null;
    const symbolicated = symbolicateStack(rawStack);
    const sanitizedStack = rawStack ? sanitizeStack(rawStack) : null;
    const sanitizedSymbolicatedStack = symbolicated.stack ? sanitizeStack(symbolicated.stack, 6000) : null;
    const doc = {
      type: clampString(body.type, 50) || "unknown",
      message: clampString(body.message, 500) || "No message",
      source: clampString(body.source, 500) || null,
      lineno: typeof body.lineno === "number" ? body.lineno : null,
      colno: typeof body.colno === "number" ? body.colno : null,
      stack: sanitizedStack,
      symbolicatedStack: sanitizedSymbolicatedStack,
      sourceMappedFrames: symbolicated.frames,
      pageUrl: clampString(body.pageUrl, 1000) || null,
      pathname: pathnameFromPageUrl(clampString(body.pageUrl, 1000)),
      userAgent: clampString(body.userAgent, 500) || req.headers.get("user-agent")?.slice(0, 500) || null,
      userId: clampString(body.userId, 100) || null,
      email: clampString(body.email, 200) || null,
      sessionId: clampString(body.sessionId, 100) || null,
      anonymousId: clampString(body.anonymousId, 100) || null,
      buildId: clampString(body.buildId, 120) || null,
      release: clampString(body.release, 120) || null,
      breadcrumbs: sanitizeDiagnosticValue(safeArray(body.breadcrumbs, 20)) as unknown[],
      clientContext: sanitizeDiagnosticValue(body.clientContext || {}) as Record<string, unknown>,
      ipAddress: ip,
      domain: reqCtx.domain,
      createdAt: new Date(),
    };
    const fingerprint =
      clampString(body.fingerprint, 120) ||
      buildServerFingerprint(doc);
    const severity = getSeverity(doc);
    const storedDoc = { ...doc, fingerprint, severity };

    if (doc.type === "resource_load_failed" && isCrawlerUserAgent(doc.userAgent)) {
      return ok();
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");
    await db.collection("error_events").insertOne(storedDoc);

    const groupUpdate = await db.collection<{ _id: string; totalCount?: number; status?: string }>("error_fingerprints").findOneAndUpdate(
      { _id: fingerprint },
      {
        $setOnInsert: {
          firstSeenAt: doc.createdAt,
          status: "open",
        },
        $set: {
          type: doc.type,
          message: doc.message,
          source: doc.source,
          latestStack: doc.stack,
          latestSymbolicatedStack: doc.symbolicatedStack,
          latestSourceMappedFrames: doc.sourceMappedFrames,
          latestPageUrl: doc.pageUrl,
          latestPathname: doc.pathname,
          latestUserAgent: doc.userAgent,
          latestBuildId: doc.buildId,
          latestRelease: doc.release,
          latestBreadcrumbs: doc.breadcrumbs,
          severity,
          lastSeenAt: doc.createdAt,
          updatedAt: doc.createdAt,
        },
        $inc: { totalCount: 1 },
        $addToSet: {
          pageUrls: doc.pageUrl,
          pathnames: doc.pathname,
          buildIds: doc.buildId,
          userIds: doc.userId,
          anonymousIds: doc.anonymousId,
          sessionIds: doc.sessionId,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    const totalCount = groupUpdate?.totalCount || 1;
    if (groupUpdate?.status === "fixed") {
      await db.collection("error_fingerprints").updateOne(
        { _id: fingerprint, status: "fixed" } as any,
        {
          $set: {
            status: "open",
            regressedAt: doc.createdAt,
            updatedAt: doc.createdAt,
          },
          $push: {
            statusHistory: {
              status: "open",
              updatedAt: doc.createdAt,
              updatedBy: "error-monitor",
              reason: "fixed fingerprint recurred",
            },
          },
        } as any
      );
    }

    trackActivity({
      event: "client_error_captured",
      source: "client",
      userId: doc.userId,
      email: doc.email,
      pathname: doc.pathname,
      sessionId: doc.sessionId,
      anonymousId: doc.anonymousId,
      domain: reqCtx.domain,
      ipAddress: ip,
      userAgent: doc.userAgent,
      metadata: {
        fingerprint,
        severity,
        type: doc.type,
        message: doc.message,
        buildId: doc.buildId,
        source: doc.source,
      },
    }).catch(() => {});

    await maybeNotifyClientErrorCaptured(db, {
      fingerprint,
      type: doc.type,
      message: doc.message,
      pageUrl: doc.pageUrl,
      source: doc.source,
      buildId: doc.buildId,
      sessionId: doc.sessionId,
      anonymousId: doc.anonymousId,
      severity,
      breadcrumbs: doc.breadcrumbs as Array<{ type?: string; message?: string; timestamp?: string }>,
    }, totalCount);

    await maybeAlertForFingerprint(db, {
      fingerprint,
      type: doc.type,
      message: doc.message,
      source: doc.source,
      pageUrl: doc.pageUrl,
      buildId: doc.buildId,
      severity,
      breadcrumbs: doc.breadcrumbs as Array<{ type?: string; message?: string; timestamp?: string }>,
    }, totalCount);

    return ok();
  } catch (error) {
    console.error("Client error tracking failed:", error);
    return ok();
  }
}
