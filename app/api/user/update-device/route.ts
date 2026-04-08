import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseUserAgent } from "@/lib/parse-user-agent";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

    const client = await clientPromise;
    const db = client.db("mybingocard");

    // Only set fields that are not already present (don't overwrite credentials signup data)
    const setOnInsert: Record<string, string> = {};
    if (signupDevice) setOnInsert.signupDevice = signupDevice;
    if (signupLanguage) setOnInsert.signupLanguage = signupLanguage;

    // Build a conditional update: only set each field if it doesn't exist yet
    const updatePipeline = [
      {
        $set: Object.fromEntries(
          Object.entries(setOnInsert).map(([key, value]) => [
            key,
            { $cond: [{ $ifNull: [`$${key}`, false] }, `$${key}`, value] },
          ])
        ),
      },
    ];

    await db.collection("users").updateOne(
      { _id: new ObjectId(session.user.id) },
      updatePipeline
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update device info error:", error);
    return NextResponse.json({ error: "Failed to update device info" }, { status: 500 });
  }
}
