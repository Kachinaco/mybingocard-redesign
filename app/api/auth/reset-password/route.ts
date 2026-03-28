import { NextResponse } from "next/server";
import { getEmailForValidResetToken, markResetTokenUsed } from "@/lib/db/password-resets";
import { updateUserPassword } from "@/lib/db/users";
import { trackActivity } from "@/lib/activity";
import { trackApiError } from "@/lib/api-error-tracking";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const email = await getEmailForValidResetToken(token);
    if (!email) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const updated = await updateUserPassword(email, password);
    if (!updated) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await markResetTokenUsed(token);

    trackActivity({
      event: "password_reset_completed",
      source: "server",
      email: email,
      pathname: "/api/auth/reset-password",
    }).catch(() => {});

    return NextResponse.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    await trackApiError(error, {
      route: "/api/auth/reset-password",
      method: "POST",
      statusCode: 500,
    });
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
