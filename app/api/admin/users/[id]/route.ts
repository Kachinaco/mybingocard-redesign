import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          password: 0,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's cards
    const cards = await db
      .collection("cards")
      .find({ userId: id })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      user,
      cards,
    });
  } catch (error) {
    console.error("Admin user detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user details" },
      { status: 500 }
    );
  }
}
