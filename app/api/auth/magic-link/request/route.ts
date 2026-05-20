import { NextResponse } from "next/server";
import crypto from "node:crypto";
import clientPromise from "@/lib/mongodb";
import { sendMagicLinkEmail } from "@/lib/email";
import { trackActivity } from "@/lib/activity";
import { notifyMagicLink } from "@/lib/discord";
import { sanitizePostVerificationCallback } from "@/lib/auth/verify-email-redirect";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const REQUEST_LIMIT = 5;
const requestHits = new Map<string, number[]>();

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRequestLimit(key: string): boolean {
  const now = Date.now();
  const cutoff = now - REQUEST_WINDOW_MS;
  const recent = (requestHits.get(key) || []).filter((timestamp) => timestamp > cutoff);
  if (recent.length >= REQUEST_LIMIT) {
    requestHits.set(key, recent);
    return false;
  }
  recent.push(now);
  requestHits.set(key, recent);
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const callbackUrl = sanitizePostVerificationCallback(
      typeof body.callbackUrl === "string" ? body.callbackUrl : "/dashboard"
    );

    if (!EMAIL_REGEX.test(email) || email.endsWith("@guest.mybingocard.com")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const rateKey = `${getClientIp(request)}:${email}`;
    if (!checkRequestLimit(rateKey)) {
      return NextResponse.json({ error: "Too many magic link requests. Please try again later." }, { status: 429 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
    const client = await clientPromise;
    const db = client.db("mybingocard");

    await db.collection("magic_link_tokens").insertOne({
      email,
      tokenHash,
      callbackUrl,
      expiresAt,
      createdAt: new Date(),
    });
    await db.collection("magic_link_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    const url = `${appUrl}/magic-link?token=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    await sendMagicLinkEmail(email, url);

    trackActivity({
      event: "magic_link_requested",
      source: "auth",
      email,
      metadata: { provider: "magic-link" },
    }).catch(console.error);
    notifyMagicLink(email).catch(console.error);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Magic link request error:", error);
    return NextResponse.json({ error: "Failed to send magic link" }, { status: 500 });
  }
}
