import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGameState, saveGameState, deleteGameState } from "@/lib/db/game-state";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: cardId } = await params;
    const state = await getGameState(cardId, session.user.id);

    if (!state) {
      return NextResponse.json({ state: null });
    }

    return NextResponse.json({
      state: {
        markedCells: state.markedCells,
        hasBingo: state.hasBingo,
      },
    });
  } catch (error) {
    console.error("Failed to load game state:", error);
    return NextResponse.json({ error: "Failed to load game state" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: cardId } = await params;
    const body = await request.json();
    const { markedCells, hasBingo } = body;

    if (!Array.isArray(markedCells) || typeof hasBingo !== "boolean") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    await saveGameState(cardId, session.user.id, markedCells, hasBingo);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save game state:", error);
    return NextResponse.json({ error: "Failed to save game state" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: cardId } = await params;
    await deleteGameState(cardId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete game state:", error);
    return NextResponse.json({ error: "Failed to delete game state" }, { status: 500 });
  }
}
