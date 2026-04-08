import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");
    await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { lastSeen: new Date() } }
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
