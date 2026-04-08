import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("mybingocard");

    await db.collection("live_game_waitlist").updateOne(
      { email: session.user.email },
      {
        $set: { email: session.user.email, name: session.user.name || "", userId: session.user.id || "" },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

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
    const client = await clientPromise;
    const db = client.db("mybingocard");
    const list = await db.collection("live_game_waitlist").find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ count: list.length, list });
  } catch (error) {
    console.error("Waitlist GET error:", error);
    return NextResponse.json({ error: "Failed to fetch waitlist" }, { status: 500 });
  }
}
