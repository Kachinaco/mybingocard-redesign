import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseUserAgent } from "@/lib/parse-user-agent";
import { updateMissingUserSignupContext } from "@/lib/db/users";

/**
 * POST /api/user/update-device
 * Called by UtmFlusher after OAuth/magic-link signup to backfill
 * signupDevice and signupLanguage (not available during the auth event).
 * Only writes if the fields are not already set (idempotent).
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userAgent, language } = await request.json();

    const signupDevice = userAgent ? parseUserAgent(userAgent) : undefined;
    const signupLanguage = typeof language === "string" ? language : undefined;

    if (!signupDevice && !signupLanguage) {
      return NextResponse.json({ ok: true });
    }

    await updateMissingUserSignupContext(session.user.id, {
      signupDevice,
      signupLanguage,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update device info error:", error);
    return NextResponse.json({ error: "Failed to update device info" }, { status: 500 });
  }
}
