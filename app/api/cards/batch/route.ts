import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCard, generateShareLink } from "@/lib/db/cards";
import { canCreateCard } from "@/lib/db/subscriptions";
import { getUserByEmail } from "@/lib/db/users";
import { PLANS } from "@/lib/stripe/config";

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

function generateShuffledCards(
  cells: string[],
  size: number,
  freeSpace: boolean,
  count: number
): string[][] {
  const results: string[][] = [];
  const totalCells = size * size;
  const freeSpaceIndex = freeSpace ? Math.floor(totalCells / 2) : -1;

  // Filter out free space placeholder if present
  const availableCells = cells.filter(c => c.trim() !== "" && c.toUpperCase() !== "FREE");

  for (let i = 0; i < count; i++) {
    const shuffled = shuffleArray(availableCells);
    const cardCells: string[] = [];

    let cellIdx = 0;
    for (let j = 0; j < totalCells; j++) {
      if (j === freeSpaceIndex) {
        cardCells.push("FREE");
      } else {
        cardCells.push(shuffled[cellIdx % shuffled.length]!);
        cellIdx++;
      }
    }
    results.push(cardCells);
  }

  return results;
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Check plan - batch generation requires BUSINESS plan
    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const plan = PLANS[user.planType as keyof typeof PLANS];
    if (!(plan.limits as any).canBulkGenerate) {
      return NextResponse.json(
        { error: "Batch card generation requires a Business plan. Please upgrade." },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { title, description, size, cells, freeSpace, style, count } = data;

    // Validate
    if (!title || !size || !cells || !count) {
      return NextResponse.json(
        { error: "Missing required fields: title, size, cells, count" },
        { status: 400 }
      );
    }

    if (![3, 4, 5].includes(size)) {
      return NextResponse.json(
        { error: "Invalid grid size" },
        { status: 400 }
      );
    }

    const validCounts = [10, 25, 50, 100];
    if (!validCounts.includes(count)) {
      return NextResponse.json(
        { error: "Count must be 10, 25, 50, or 100" },
        { status: 400 }
      );
    }

    const totalCells = size * size;
    const nonFreeCells = freeSpace ? totalCells - 1 : totalCells;

    // Need at least enough unique cells to fill a card
    const uniqueCells = cells.filter((c: string) => c.trim() !== "" && c.toUpperCase() !== "FREE");
    if (uniqueCells.length < nonFreeCells) {
      return NextResponse.json(
        { error: `Need at least ${nonFreeCells} unique items to generate cards for a ${size}x${size} grid` },
        { status: 400 }
      );
    }

    // Generate shuffled card arrangements
    const shuffledCards = generateShuffledCards(cells, size, freeSpace, count);

    // Create all cards in DB
    const createdCards = [];
    for (const cardCells of shuffledCards) {
      const shareLink = generateShareLink();
      const card = await createCard({
        userId: session.user.id,
        title: `${title} #${createdCards.length + 1}`,
        description: description || `Batch card ${createdCards.length + 1} of ${count}`,
        size,
        cells: cardCells,
        freeSpace,
        style: style || {},
        isPublic: true,
        shareLink,
      });
      createdCards.push(card);
    }

    return NextResponse.json({
      success: true,
      count: createdCards.length,
      cards: createdCards,
    }, { status: 201 });
  } catch (error) {
    console.error("Batch create error:", error);
    return NextResponse.json(
      { error: "Failed to generate batch cards" },
      { status: 500 }
    );
  }
}
