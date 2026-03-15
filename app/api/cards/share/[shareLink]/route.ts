import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;
    const client = await clientPromise;
    const db = client.db("mybingocard");
    const card = await db.collection("cards").findOne({ shareLink });

    if (!card || !card.isPublic) {
      return NextResponse.json(
        { error: "Card not found or not shared" },
        { status: 404 }
      );
    }

    // Check expiry
    if (card.shareExpiresAt && new Date(card.shareExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 }
      );
    }

    // If password protected, only return title
    if (card.sharePassword) {
      return NextResponse.json({
        requiresPassword: true,
        card: { title: card.title },
      });
    }

    // Increment views for non-password-protected cards
    await db.collection("cards").updateOne(
      { _id: card._id },
      { $inc: { views: 1 } }
    );

    return NextResponse.json({ card });
  } catch (error) {
    console.error("Get shared card error:", error);
    return NextResponse.json(
      { error: "Failed to fetch card" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;
    const { password } = await request.json();

    const client = await clientPromise;
    const db = client.db("mybingocard");
    const card = await db.collection("cards").findOne({ shareLink });

    if (!card || !card.isPublic) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    // Check expiry
    if (card.shareExpiresAt && new Date(card.shareExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 }
      );
    }

    // If no password set, return the card directly
    if (!card.sharePassword) {
      return NextResponse.json({ card });
    }

    const valid = await bcrypt.compare(password, card.sharePassword);

    if (!valid) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    // Increment views on successful password verification
    await db.collection("cards").updateOne(
      { _id: card._id },
      { $inc: { views: 1 } }
    );

    return NextResponse.json({ card });
  } catch (error) {
    console.error("Verify share password error:", error);
    return NextResponse.json(
      { error: "Failed to verify password" },
      { status: 500 }
    );
  }
}
