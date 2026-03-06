import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById, updateCard, generateShareLink } from "@/lib/db/cards";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const card = await getCardById(id);

    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    if (card.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to share this card" },
        { status: 403 }
      );
    }

    // If card already has a share link, return it
    if (card.shareLink) {
      return NextResponse.json({ shareLink: card.shareLink });
    }

    // Generate new share link
    const shareLink = generateShareLink();
    await updateCard(id, { shareLink, isPublic: true });

    return NextResponse.json({ shareLink });
  } catch (error) {
    console.error("Generate share link error:", error);
    return NextResponse.json(
      { error: "Failed to generate share link" },
      { status: 500 }
    );
  }
}
