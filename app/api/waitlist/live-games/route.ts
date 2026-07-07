import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getLiveGameWaitlist,
  upsertLiveGameWaitlistEntry,
} from "@/lib/db/live-game-waitlist";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await upsertLiveGameWaitlistEntry({
      email: session.user.email,
      name: session.user.name,
      userId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    const adminEmails = ["coryanalla@gmail.com", "rank@townranker.com"];
    if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const list = await getLiveGameWaitlist();
    return NextResponse.json({ count: list.length, list });
  } catch (error) {
    console.error("Waitlist GET error:", error);
    return NextResponse.json({ error: "Failed to fetch waitlist" }, { status: 500 });
  }
}
