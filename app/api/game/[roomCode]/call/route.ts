import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { callRandomItem, callSequentialItem, callItem, startGame, getGameRoom, updateGameSettings, endGame, type GameRoom } from "@/lib/db/games";
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
    const { action, item, playAlong } = body;

    // Start the game
    if (action === "start") {
      const { started, hostPlayer } = await startGame(roomCode, session.user.id, playAlong);
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
          hostPlaysAlong: !!playAlong,
        },
      }).catch(() => {});

      notifyGameStarted(
        session.user.email || "Unknown",
        room?.title || "Untitled",
        roomCode,
        room?.players?.length || 0,
        room?.size || 5
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        action: "started",
        hostPlayer: hostPlayer ? {
          playerId: hostPlayer.playerId,
          playerName: hostPlayer.playerName,
          cells: hostPlayer.cells,
          marked: hostPlayer.marked,
        } : undefined,
      });
    }

    // Helper to track item called events
    const userId = session.user.id;
    const userEmail = session.user.email || null;
    const trackItemCalled = (calledItem: string, room: GameRoom) => {
      const startedAt = room.startedAt ? new Date(room.startedAt).getTime() : null;
      const timeSinceStartSeconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;
      trackActivity({
        event: "game_item_called",
        source: "server",
        userId,
        email: userEmail,
        pathname: `/game/host/${roomCode}`,
        metadata: {
          roomCode,
          item: calledItem,
          callNumber: room.calledItems.length,
          totalItems: room.wordList.length,
          timeSinceStartSeconds,
        },
      }).catch(() => {});
    };

    // Update game settings (waiting screen only)
    if (action === "settings") {
      const updated = await updateGameSettings(roomCode, session.user.id, body.settings || {});
      if (!updated) {
        return NextResponse.json({ error: "Cannot update settings (game may have started)" }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    // End the game (host-initiated, for multiple winners mode)
    if (action === "end") {
      const ended = await endGame(roomCode, session.user.id);
      if (!ended) {
        return NextResponse.json({ error: "Failed to end game" }, { status: 400 });
      }
      trackActivity({
        event: "game_host_ended",
        source: "server",
        userId: session.user.id,
        email: session.user.email || null,
        pathname: `/game/host/${roomCode}`,
        metadata: { roomCode },
      }).catch(() => {});
      return NextResponse.json({ success: true, action: "ended" });
    }

    // Call a specific item (manual pick mode)
    if (action === "call" && item) {
      const result = await callItem(roomCode, session.user.id, item);
      if (!result) {
        return NextResponse.json({ error: "Failed to call item" }, { status: 400 });
      }
      trackItemCalled(item, result);
      return NextResponse.json({ success: true, item, calledItems: result.calledItems });
    }

    // Call next item sequentially
    if (action === "sequential") {
      const result = await callSequentialItem(roomCode, session.user.id);
      if (!result) {
        return NextResponse.json({ error: "No more items to call or game not active" }, { status: 400 });
      }
      trackItemCalled(result.item, result.room);
      return NextResponse.json({
        success: true,
        item: result.item,
        calledItems: result.room.calledItems,
        remaining: result.room.wordList.length - result.room.calledItems.length,
      });
    }

    // Call a random item (default)
    const result = await callRandomItem(roomCode, session.user.id);
    if (!result) {
      return NextResponse.json({ error: "No more items to call or game not active" }, { status: 400 });
    }

    trackItemCalled(result.item, result.room);

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
