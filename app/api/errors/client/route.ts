import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter: max 10 errors per IP per minute
// ---------------------------------------------------------------------------
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

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

/** Strip email-like patterns and long numeric sequences from stack traces */
function sanitizeStack(raw: string): string {
  let s = raw.slice(0, 2000);
  // Remove email-like patterns
  s = s.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]");
  // Remove long digit sequences (phone, CC, SSN, etc.)
  s = s.replace(/\b\d{6,}\b/g, "[DIGITS]");
  return s;
}

function clampString(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  return value.slice(0, maxLen);
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

    const doc = {
      type: clampString(body.type, 50) || "unknown",
      message: clampString(body.message, 500) || "No message",
      source: clampString(body.source, 500) || null,
      lineno: typeof body.lineno === "number" ? body.lineno : null,
      colno: typeof body.colno === "number" ? body.colno : null,
      stack: body.stack ? sanitizeStack(String(body.stack)) : null,
      pageUrl: clampString(body.pageUrl, 1000) || null,
      userAgent: clampString(body.userAgent, 500) || req.headers.get("user-agent")?.slice(0, 500) || null,
      userId: clampString(body.userId, 100) || null,
      email: clampString(body.email, 200) || null,
      ipAddress: ip,
      createdAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db("mybingocard");
    await db.collection("error_events").insertOne(doc);

    return ok();
  } catch (error) {
    console.error("Client error tracking failed:", error);
    return ok();
  }
}
