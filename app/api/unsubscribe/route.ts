import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");

    await db.collection("email_preferences").updateOne(
      { email: email.toLowerCase().trim() },
      {
        $set: {
          email: email.toLowerCase().trim(),
          unsubscribedAt: new Date(),
          marketingEmails: false,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
