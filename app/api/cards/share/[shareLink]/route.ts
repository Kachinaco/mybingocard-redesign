import { NextResponse } from "next/server";
import { getCardByShareLink } from "@/lib/db/cards";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;
    const card = await getCardByShareLink(shareLink);

    if (!card) {
      return NextResponse.json(
        { error: "Card not found or not shared" },
        { status: 404 }
      );
    }

    // Only return public cards
    if (!card.isPublic) {
      return NextResponse.json(
        { error: "This card is not publicly shared" },
        { status: 403 }
      );
    }

    return NextResponse.json({ card });
  } catch (error) {
    console.error("Get shared card error:", error);
    return NextResponse.json(
      { error: "Failed to fetch card" },
      { status: 500 }
    );
  }
}
