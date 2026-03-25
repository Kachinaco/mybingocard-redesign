import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { callRandomItem, callItem, startGame, getGameRoom } from "@/lib/db/games";
import { trackActivity } from "@/lib/activity";
import { notifyGameStarted } from "@/lib/discord";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomCode } = await params;
    const body = await request.json();
    const { action, item } = body;

    // Start the game
    if (action === "start") {
      const started = await startGame(roomCode, session.user.id);
      if (!started) {
        return NextResponse.json({ error: "Failed to start game" }, { status: 400 });
      }

      const room = await getGameRoom(roomCode);
      trackActivity({
        event: "game_started",
        source: "server",
        userId: session.user.id,
        email: session.user.email || null,
        pathname: `/game/host/${roomCode}`,
        metadata: {
          roomCode,
          playerCount: room?.players?.length || 0,
          wordListSize: room?.wordList?.length || 0,
          gridSize: room?.size || null,
          gameTitle: room?.title || null,
        },
      }).catch(() => {});

      notifyGameStarted(
        session.user.email || "Unknown",
        room?.title || "Untitled",
        roomCode,
        room?.players?.length || 0,
        room?.size || 5
      ).catch(() => {});

      return NextResponse.json({ success: true, action: "started" });
    }

    // Call a specific item
    if (action === "call" && item) {
      const result = await callItem(roomCode, session.user.id, item);
      if (!result) {
        return NextResponse.json({ error: "Failed to call item" }, { status: 400 });
      }
      return NextResponse.json({ success: true, item, calledItems: result.calledItems });
    }

    // Call a random item (auto-caller)
    const result = await callRandomItem(roomCode, session.user.id);
    if (!result) {
      return NextResponse.json({ error: "No more items to call or game not active" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      item: result.item,
      calledItems: result.room.calledItems,
      remaining: result.room.wordList.length - result.room.calledItems.length,
    });
  } catch (error) {
    console.error("Call item error:", error);
    return NextResponse.json({ error: "Failed to call item" }, { status: 500 });
  }
}
