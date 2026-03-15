import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById } from "@/lib/db/cards";
import { createGameRoom } from "@/lib/db/games";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await request.json();
    if (!cardId) {
      return NextResponse.json({ error: "Card ID required" }, { status: 400 });
    }

    const card = await getCardById(cardId);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    if (card.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "You can only create games from your own cards" }, { status: 403 });
    }

    const wordList = card.cells.filter(c => c.trim());
    if (wordList.length < (card.freeSpace ? card.size * card.size - 1 : card.size * card.size)) {
      return NextResponse.json({ error: "Card needs more filled cells to create a game" }, { status: 400 });
    }

    const room = await createGameRoom(
      session.user.id,
      cardId,
      card.title,
      wordList,
      card.size,
      card.freeSpace,
      card.style || {}
    );

    await trackActivity({
      event: "game_created",
      source: "server",
      userId: session.user.id,
      email: session.user.email || null,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        cardId,
        roomCode: room.roomCode,
        title: room.title,
        size: room.size,
      },
    });

    return NextResponse.json({
      roomCode: room.roomCode,
      room: {
        _id: room._id,
        roomCode: room.roomCode,
        title: room.title,
        size: room.size,
        status: room.status,
        playerCount: 0,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create game error:", error);
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 });
  }
}
