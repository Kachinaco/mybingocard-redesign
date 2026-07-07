import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/users";
import { sendEmailVerificationEmail } from "@/lib/email";
import { trackActivity } from "@/lib/activity";
import { sanitizePostVerificationCallback } from "@/lib/auth/verify-email-redirect";
import { readJsonObject } from "@/lib/request-json";
import { countEmailVerificationTokens, createEmailVerificationToken, deleteEmailVerificationTokensByUserId } from "@/lib/db/auth-data";

// Rate limit: max 3 resends per email per hour
const RESEND_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_RESENDS = 3;

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const { email, callbackUrl } = body.data;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Always return success to avoid leaking whether an email exists
    const successResponse = NextResponse.json({
      message: "If an account with that email exists and is unverified, we've sent a new verification link.",
    });

    const user = await getUserByEmail(email);

    // Silently succeed if user doesn't exist or is already verified
    if (!user || user.emailVerified) {
      return successResponse;
    }

    // Rate limit resends
    const windowStart = new Date(Date.now() - RESEND_WINDOW_MS);
    const recentResends = await countEmailVerificationTokens({
      email,
      createdAtSince: windowStart,
    });

    if (recentResends >= MAX_RESENDS) {
      // Still return success to avoid leaking info, but don't actually send
      trackActivity({
        event: "resend_verification_rate_limited",
        source: "server",
        email,
        metadata: { recentResends },
      }).catch(() => {});
      return successResponse;
    }

    // Invalidate any existing tokens for this user
    await deleteEmailVerificationTokensByUserId(user._id.toString());

    // Generate new verification token
    const { randomBytes } = await import("crypto");
    const verifyToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await createEmailVerificationToken({
      userId: user._id.toString(),
      email,
      token: verifyToken,
      expires,
      createdAt: new Date(),
    });

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "https://mybingocard.com"
    ).replace(/\/$/, "");

    const nextCallbackUrl = sanitizePostVerificationCallback(callbackUrl);
    const verifyUrl = `${appUrl}/api/auth/verify-email?token=${verifyToken}&callbackUrl=${encodeURIComponent(nextCallbackUrl)}`;

    sendEmailVerificationEmail(email, user.name || "there", verifyUrl).catch(
      console.error
    );

    trackActivity({
      event: "verification_email_resent",
      source: "server",
      userId: user._id.toString(),
      email,
    }).catch(() => {});

    return successResponse;
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
