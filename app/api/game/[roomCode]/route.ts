import { NextResponse } from "next/server";
import { getGameRoom, DEFAULT_SETTINGS } from "@/lib/db/games";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const room = await getGameRoom(roomCode);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({
      room: {
        roomCode: room.roomCode,
        title: room.title,
        size: room.size,
        freeSpace: room.freeSpace,
        calledItems: room.calledItems,
        players: room.players.map(p => ({
          playerId: p.playerId,
          playerName: p.playerName,
          hasBingo: p.hasBingo,
          markedCount: p.marked.length,
        })),
        playerCount: room.players.length,
        status: room.status,
        winnerId: room.winnerId,
        winnerName: room.winnerName,
        style: room.style,
        settings: room.settings ?? DEFAULT_SETTINGS,
        wordList: room.wordList,
        wordListCount: room.wordList.length,
        winners: (room.winners ?? []).map(w => ({ playerId: w.playerId, playerName: w.playerName })),
        createdAt: room.createdAt,
      },
    });
  } catch (error) {
    console.error("Get game room error:", error);
    return NextResponse.json({ error: "Failed to get game room" }, { status: 500 });
  }
}
