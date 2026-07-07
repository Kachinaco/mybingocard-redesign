import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { sendMagicLinkEmail } from "@/lib/email";
import { trackActivity } from "@/lib/activity";
import { notifyMagicLink } from "@/lib/discord";
import { sanitizePostVerificationCallback } from "@/lib/auth/verify-email-redirect";
import { readJsonObject } from "@/lib/request-json";
import { createMagicLinkToken } from "@/lib/db/auth-data";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const email = typeof body.data.email === "string" ? body.data.email.trim().toLowerCase() : "";
    const callbackUrl = sanitizePostVerificationCallback(
      typeof body.data.callbackUrl === "string" ? body.data.callbackUrl : "/dashboard"
    );

    if (!EMAIL_REGEX.test(email) || email.endsWith("@guest.mybingocard.com")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

    await createMagicLinkToken({
      email,
      tokenHash,
      callbackUrl,
      expiresAt,
      createdAt: new Date(),
    });

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
