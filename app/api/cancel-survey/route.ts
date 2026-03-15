import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reason, details } = await request.json();

  const validReasons = ["too_expensive", "not_using", "missing_feature", "other"];
  if (!reason || !validReasons.includes(reason)) {
    return NextResponse.json(
      { error: "Invalid reason. Must be one of: too_expensive, not_using, missing_feature, other" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  await db.collection("cancellation_surveys").insertOne({
    email: session.user.email,
    userId: session.user.id,
    reason,
    details: details || "",
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true });
}
