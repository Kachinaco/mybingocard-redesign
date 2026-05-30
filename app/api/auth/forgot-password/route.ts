import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/users";
import { createPasswordResetToken } from "@/lib/db/password-resets";
import { sendPasswordResetEmail } from "@/lib/email";
import { trackActivity } from "@/lib/activity";
import { trackApiError } from "@/lib/api-error-tracking";
import { readJsonObject } from "@/lib/request-json";

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const email = String(body.data.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await getUserByEmail(email);

    if (user) {
      const token = await createPasswordResetToken(user.email);
      const resetUrl = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      sendPasswordResetEmail(user.email, user.name || "there", resetUrl).catch((error) => {
        console.error("Failed to send password reset email:", error);
      });
    }

    trackActivity({
      event: "password_reset_requested",
      source: "server",
      email: email,
      pathname: "/api/auth/forgot-password",
      metadata: { user_found: !!user },
    }).catch(() => {});

    return NextResponse.json({
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    await trackApiError(error, {
      route: "/api/auth/forgot-password",
      method: "POST",
      statusCode: 500,
    });
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
