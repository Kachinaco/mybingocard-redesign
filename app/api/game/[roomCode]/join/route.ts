import { NextResponse } from "next/server";
import { joinGameRoom } from "@/lib/db/games";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const { playerName } = await request.json();

    if (!playerName?.trim()) {
      return NextResponse.json({ error: "Player name required" }, { status: 400 });
    }

    const result = await joinGameRoom(roomCode, playerName.trim());
    if (!result) {
      return NextResponse.json({ error: "Room not found or game has ended" }, { status: 404 });
    }

    return NextResponse.json({
      playerId: result.player.playerId,
      playerName: result.player.playerName,
      cells: result.player.cells,
      marked: result.player.marked,
      room: {
        roomCode: result.room.roomCode,
        title: result.room.title,
        size: result.room.size,
        freeSpace: result.room.freeSpace,
        status: result.room.status,
        style: result.room.style,
      },
    });
  } catch (error) {
    console.error("Join game error:", error);
    return NextResponse.json({ error: "Failed to join game" }, { status: 500 });
  }
}
