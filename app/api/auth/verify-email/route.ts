import { NextResponse } from "next/server";
import { trackActivity } from "@/lib/activity";
import { trackApiError } from "@/lib/api-error-tracking";
import { buildPostVerificationLoginUrl, buildVerifyEmailErrorUrl, sanitizePostVerificationCallback } from "@/lib/auth/verify-email-redirect";
import { deleteEmailVerificationToken, findEmailVerificationToken } from "@/lib/db/auth-data";
import { markUserEmailVerified } from "@/lib/db/users";
import { tryEnqueueVerifiedAccountOutcome } from "@/lib/server/tracker-outcome-events";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");
  const callbackUrl = sanitizePostVerificationCallback(searchParams.get("callbackUrl"));

  if (!token) {
    return NextResponse.redirect(
      buildVerifyEmailErrorUrl({ appUrl, error: "missing_token", callbackUrl })
    );
  }

  try {
    const record = await findEmailVerificationToken(token);

    if (!record) {
      trackActivity({
        event: "email_verification_failed",
        source: "server",
        pathname: "/api/auth/verify-email",
        metadata: { reason: "invalid_token" },
      }).catch(() => {});
      return NextResponse.redirect(
        buildVerifyEmailErrorUrl({ appUrl, error: "invalid_token", callbackUrl })
      );
    }

    if (new Date(record.expires) < new Date()) {
      await deleteEmailVerificationToken(token);
      trackActivity({
        event: "email_verification_failed",
        source: "server",
        email: record.email || null,
        pathname: "/api/auth/verify-email",
        metadata: { reason: "expired_token" },
      }).catch(() => {});
      return NextResponse.redirect(
        buildVerifyEmailErrorUrl({
          appUrl,
          error: "expired_token",
          email: record.email,
          callbackUrl,
        })
      );
    }

    // Mark user as verified before recording the authoritative outcome.
    const verifiedUser = await markUserEmailVerified(record.userId);
    tryEnqueueVerifiedAccountOutcome({
      userId: record.userId,
      verifiedAt: verifiedUser.emailVerified!,
    });

    // Delete the used token
    await deleteEmailVerificationToken(token);

    trackActivity({
      event: "email_verification_completed",
      source: "server",
      userId: record.userId,
      email: record.email || null,
      pathname: "/api/auth/verify-email",
    }).catch(() => {});

    return NextResponse.redirect(
      buildPostVerificationLoginUrl({
        appUrl,
        email: record.email,
        callbackUrl,
      })
    );
  } catch (err) {
    console.error("Email verification error:", err);
    await trackApiError(err, {
      route: "/api/auth/verify-email",
      method: "GET",
      statusCode: 500,
    });
    return NextResponse.redirect(
      buildVerifyEmailErrorUrl({ appUrl, error: "server_error", callbackUrl })
    );
  }
}
