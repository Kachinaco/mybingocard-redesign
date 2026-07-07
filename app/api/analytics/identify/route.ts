import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertVisitorProfileIdentification } from "@/lib/db/analytics-identify";
import { getUserById } from "@/lib/db/users";

export const runtime = "nodejs";

function cleanString(value: unknown, max = 500): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeEmail(value: unknown): string {
  const email = cleanString(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function validAnonymousId(value: unknown): string {
  const anonymousId = cleanString(value, 128);
  if (!/^anon_[a-zA-Z0-9_.:-]{4,120}$/.test(anonymousId)) return "";
  return anonymousId;
}

function validSessionId(value: unknown): string {
  const sessionId = cleanString(value, 128);
  if (!sessionId || !/^[a-zA-Z0-9_.:-]{4,128}$/.test(sessionId)) return "";
  return sessionId;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = normalizeEmail(session.user.email);
    if (!email || email.endsWith("@guest.mybingocard.com")) {
      return NextResponse.json({ ok: true, skipped: "guest_or_invalid_email" });
    }

    const body = await request.json().catch(() => ({}));
    const anonymousId = validAnonymousId(body?.anonymousId);
    if (!anonymousId) {
      return NextResponse.json({ error: "Invalid anonymousId" }, { status: 400 });
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const name = cleanString(user.name || session.user.name || email.split("@")[0], 160);
    await upsertVisitorProfileIdentification({
      anonymousId,
      domain: "mybingocard.com",
      client: "mybingocard",
      name,
      email,
      sessionId: validSessionId(body?.sessionId),
      lastPathname: cleanString(body?.currentUrl, 2000),
      lastReferrer: cleanString(body?.referrer, 2000),
      matchedRecords: [
        {
          collection: "mybingocard.users",
          id: user._id.toString(),
          client: "mybingocard",
          status: user.planType || "",
          source: "mybingocard.com",
          createdAt: user.createdAt,
          matchedOn: "authenticated_session",
          confidence: 100,
        },
      ],
      myBingoCardUserId: user._id.toString(),
      legacyAnonymousId: cleanString(body?.legacyAnonymousId, 128),
      landingUrl: cleanString(body?.landingUrl, 2000),
      now,
    });

    return NextResponse.json({ ok: true, anonymousId });
  } catch (error) {
    console.error("MyBingoCard analytics identify error:", error);
    return NextResponse.json({ error: "Failed to identify visitor" }, { status: 500 });
  }
}
