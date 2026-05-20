import { sanitizeCells, sanitizeText } from "@/lib/sanitize";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById, updateCard } from "@/lib/db/cards";
import { getUserById } from "@/lib/db/users";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import {
  getBingoGridShape,
  normalizeBingoVariant,
  validateClassicCells,
} from "@/lib/classic-bingo";

export async function GET(
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

    // Check if user owns the card or if it's public
    if (card.userId.toString() !== session.user.id && !card.isPublic) {
      return NextResponse.json(
        { error: "You don't have access to this card" },
        { status: 403 }
      );
    }

    return NextResponse.json({ card });
  } catch (error) {
    console.error("Get card error:", error);
    return NextResponse.json(
      { error: "Failed to fetch card" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);

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

    // Check if user owns the card
    if (card.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to edit this card" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, size, cells, freeSpace, isPublic, style } = body;
    const bingoVariant = normalizeBingoVariant(body.bingoVariant);
    const gridShape = getBingoGridShape({
      size,
      rows: body.rows,
      columns: body.columns,
      bingoVariant,
    });

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Card title is required" },
        { status: 400 }
      );
    }

    if (![3, 4, 5].includes(size)) {
      return NextResponse.json(
        { error: "Invalid grid size - must be 3, 4, or 5" },
        { status: 400 }
      );
    }

    if (!Array.isArray(cells) || cells.length !== gridShape.rows * gridShape.columns) {
      return NextResponse.json(
        { error: `Invalid cells array - must have ${gridShape.rows * gridShape.columns} cells` },
        { status: 400 }
      );
    }

    // Sanitize user inputs to prevent XSS
    const sanitizedTitle = sanitizeText(title.trim(), 100);
    const sanitizedDescription = sanitizeText(description?.trim() || "", 500);
    const sanitizedCells = sanitizeCells(cells);
    if (!validateClassicCells(bingoVariant, sanitizedCells)) {
      return NextResponse.json(
        { error: "Classic bingo cards must use the correct number ranges and layout." },
        { status: 400 }
      );
    }
    // Sharing is a premium feature — force isPublic to false for free users
    const cardOwner = await getUserById(session.user.id);
    const ownerPlan = cardOwner?.planType || "FREE";
    const finalIsPublic = ownerPlan === "FREE" ? false : !!isPublic;

    // Update the card
    const updatedCard = await updateCard(id, {
      title: sanitizedTitle,
      description: sanitizedDescription,
      size,
      rows: gridShape.rows,
      columns: gridShape.columns,
      bingoVariant,
      cells: sanitizedCells,
      freeSpace: bingoVariant === "classic90" ? false : !!freeSpace,
      isPublic: finalIsPublic,
      style: style || {},
    });

    await trackActivity({
      event: "card_updated",
      source: "server",
      userId: session.user.id,
      email: session.user.email || null,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        cardId: id,
        title: sanitizedTitle,
        size,
        rows: gridShape.rows,
        columns: gridShape.columns,
        bingoVariant,
        isPublic: !!isPublic,
      },
    });

    return NextResponse.json({
      success: true,
      card: updatedCard
    });
  } catch (error) {
    console.error("Update card error:", error);
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 }
    );
  }
}
