import { sanitizeCells, sanitizeText } from "@/lib/sanitize";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCard, getUserCards, updateCard, deleteCard, getCardById } from "@/lib/db/cards";
import { canCreateCard } from "@/lib/db/subscriptions";
import { generateShareLink } from "@/lib/db/cards";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const cards = await getUserCards(session.user.id);

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Get cards error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user can create more cards
    const canCreate = await canCreateCard(session.user.id);
    if (!canCreate) {
      return NextResponse.json(
        { error: "Card limit reached. Please upgrade your plan." },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.size || !data.cells) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate grid size
    if (![3, 4, 5].includes(data.size)) {
      return NextResponse.json(
        { error: "Invalid grid size" },
        { status: 400 }
      );
    }

    // Validate cells array length
    const expectedCells = data.size * data.size;
    if (data.cells.length !== expectedCells) {
      return NextResponse.json(
        { error: `Expected ${expectedCells} cells for ${data.size}x${data.size} grid` },
        { status: 400 }
      );
    }

    // Sanitize user inputs to prevent XSS
    data.title = sanitizeText(data.title, 100);
    data.description = sanitizeText(data.description || '', 500);
    data.cells = sanitizeCells(data.cells);

    // Generate share link if card is public
    const shareLink = data.isPublic ? generateShareLink() : undefined;

    const card = await createCard({
      userId: session.user.id,
      title: data.title,
      description: data.description,
      size: data.size,
      cells: data.cells,
      freeSpace: data.freeSpace ?? true,
      style: data.style ?? {},
      templateId: data.templateId,
      isPublic: data.isPublic ?? false,
      shareLink,
    });

    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    console.error("Create card error:", error);
    return NextResponse.json(
      { error: "Failed to create card" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await request.json();

    if (!data.cardId) {
      return NextResponse.json(
        { error: "Card ID required" },
        { status: 400 }
      );
    }

    // Verify card ownership
    const existingCard = await getCardById(data.cardId);
    if (!existingCard) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }
    if (existingCard.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const card = await updateCard(data.cardId, data);

    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ card });
  } catch (error) {
    console.error("Update card error:", error);
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get("cardId");

    if (!cardId) {
      return NextResponse.json(
        { error: "Card ID required" },
        { status: 400 }
      );
    }

    // Verify card ownership
    const existingCard = await getCardById(cardId);
    if (!existingCard) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }
    if (existingCard.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const success = await deleteCard(cardId);

    if (!success) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete card error:", error);
    return NextResponse.json(
      { error: "Failed to delete card" },
      { status: 500 }
    );
  }
}
