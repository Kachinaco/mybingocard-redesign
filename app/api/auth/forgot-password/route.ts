import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/users";
import { createPasswordResetToken } from "@/lib/db/password-resets";
import { sendPasswordResetEmail } from "@/lib/email";

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();

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

    return NextResponse.json({
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
