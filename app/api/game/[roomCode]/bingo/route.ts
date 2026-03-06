import { NextResponse } from "next/server";
import { claimBingo, markCell, unmarkCell, getGameRoom } from "@/lib/db/games";

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
      return NextResponse.json({ success });
    }

    if (action === "unmark" && playerId && cellIndex !== undefined) {
      const success = await unmarkCell(roomCode, playerId, cellIndex);
      return NextResponse.json({ success });
    }

    // Claim bingo
    if (action === "claim" && playerId) {
      const result = await claimBingo(roomCode, playerId);
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
