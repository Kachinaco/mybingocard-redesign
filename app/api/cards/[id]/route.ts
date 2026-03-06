import { sanitizeCells, sanitizeText } from "@/lib/sanitize";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById, updateCard } from "@/lib/db/cards";
import { getUserAccessState } from "@/lib/access";

async function ensureBillingReady(email?: string | null) {
  if (!email) {
    return null;
  }

  const { billingSetupRequired } = await getUserAccessState(email);
  if (!billingSetupRequired) {
    return null;
  }

  return NextResponse.json(
    { error: "Billing setup required", trialRequired: true },
    { status: 402 }
  );
}

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

    const billingResponse = await ensureBillingReady(session.user.email);
    if (billingResponse) {
      return billingResponse;
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

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const billingResponse = await ensureBillingReady(session.user.email);
    if (billingResponse) {
      return billingResponse;
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

    if (!Array.isArray(cells) || cells.length !== size * size) {
      return NextResponse.json(
        { error: `Invalid cells array - must have ${size * size} cells` },
        { status: 400 }
      );
    }

    // Sanitize user inputs to prevent XSS
    const sanitizedTitle = sanitizeText(title.trim(), 100);
    const sanitizedDescription = sanitizeText(description?.trim() || "", 500);
    const sanitizedCells = sanitizeCells(cells);
    // Update the card
    const updatedCard = await updateCard(id, {
      title: sanitizedTitle,
      description: sanitizedDescription,
      size,
      cells: sanitizedCells,
      freeSpace: !!freeSpace,
      isPublic: !!isPublic,
      style: style || {},
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
