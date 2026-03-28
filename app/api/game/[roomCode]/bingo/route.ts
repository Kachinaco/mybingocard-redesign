import { NextResponse } from "next/server";
import { claimBingo, markCell, unmarkCell, getGameRoom, detectWinPattern } from "@/lib/db/games";
import { trackActivity } from "@/lib/activity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const body = await request.json();
    const { action, playerId, cellIndex } = body;

    // Mark/unmark a cell
    if (action === "mark" && playerId && cellIndex !== undefined) {
      const success = await markCell(roomCode, playerId, cellIndex);
      if (success) {
        // Fetch updated room to get player info for tracking
        const room = await getGameRoom(roomCode);
        const player = room?.players.find(p => p.playerId === playerId);
        trackActivity({
          event: "game_cell_marked",
          source: "server",
          userId: null,
          email: null,
          pathname: `/game/play/${roomCode}`,
          metadata: {
            roomCode,
            playerName: player?.playerName || null,
            cellIndex,
            markedCount: player?.marked?.length || 0,
          },
        }).catch(() => {});
      }
      return NextResponse.json({ success });
    }

    if (action === "unmark" && playerId && cellIndex !== undefined) {
      const success = await unmarkCell(roomCode, playerId, cellIndex);
      return NextResponse.json({ success });
    }

    // Claim bingo
    if (action === "claim" && playerId) {
      // Fetch room before claim to get startedAt for duration calculation
      const roomBeforeClaim = await getGameRoom(roomCode);
      const result = await claimBingo(roomCode, playerId);

      if (result && result.valid) {
        const room = await getGameRoom(roomCode);
        const winningPlayer = room?.players.find(p => p.playerId === playerId);
        const winPattern = winningPlayer && room
          ? detectWinPattern(winningPlayer.marked, room.size)
          : null;
        trackActivity({
          event: "game_bingo_claimed",
          source: "server",
          userId: null,
          email: null,
          pathname: `/game/play/${roomCode}`,
          metadata: {
            roomCode,
            playerId,
            winnerName: room?.winnerName || null,
            playerCount: room?.players?.length || 0,
            calledItemCount: room?.calledItems?.length || 0,
            gameTitle: room?.title || null,
            win_pattern: winPattern,
          },
        }).catch(() => {});

        // Track game completion
        const startedAt = roomBeforeClaim?.startedAt ? new Date(roomBeforeClaim.startedAt).getTime() : null;
        const gameDurationSeconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;
        trackActivity({
          event: "game_completed",
          source: "server",
          userId: null,
          email: null,
          pathname: `/game/play/${roomCode}`,
          metadata: {
            roomCode,
            winnerName: room?.winnerName || null,
            playerCount: room?.players?.length || 0,
            totalCallsMade: room?.calledItems?.length || 0,
            gameDurationSeconds,
          },
        }).catch(() => {});
      } else {
        // Track invalid bingo claim
        let rejectionReason = "unknown";
        if (!roomBeforeClaim || roomBeforeClaim.status !== "active") {
          rejectionReason = "game_not_active";
        } else {
          const player = roomBeforeClaim.players.find(p => p.playerId === playerId);
          if (!player) {
            rejectionReason = "player_not_found";
          } else {
            rejectionReason = "invalid_bingo_pattern";
          }
        }
        trackActivity({
          event: "game_bingo_claim_invalid",
          source: "server",
          userId: null,
          email: null,
          pathname: `/game/play/${roomCode}`,
          metadata: {
            roomCode,
            playerName: roomBeforeClaim?.players.find(p => p.playerId === playerId)?.playerName || null,
            rejectionReason,
          },
        }).catch(() => {});
      }

      return NextResponse.json(result);
    }

    // Get player state (for refreshing)
    if (action === "state" && playerId) {
      const room = await getGameRoom(roomCode);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      const player = room.players.find(p => p.playerId === playerId);
      if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

      return NextResponse.json({
        cells: player.cells,
        marked: player.marked,
        hasBingo: player.hasBingo,
        calledItems: room.calledItems,
        status: room.status,
        winnerId: room.winnerId,
        winnerName: room.winnerName,
        players: room.players.map(p => ({
          playerId: p.playerId,
          playerName: p.playerName,
          hasBingo: p.hasBingo,
          markedCount: p.marked.length,
        })),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Bingo action error:", error);
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 });
  }
}
