import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { joinGameRoom, getGameRoom } from "@/lib/db/games";
import { trackActivity, getRequestActivityContext } from "@/lib/activity";
import { readJsonObject } from "@/lib/request-json";

function validatePlayerName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  let cleaned = name.trim();
  if (cleaned.length === 0 || cleaned.length > 40) return null;
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, "");
  if (cleaned.length === 0 || cleaned.length > 40) return null;
  return cleaned;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const session = await auth();

    const { roomCode } = await params;
    const body = await readJsonObject(request);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const { playerName } = body.data;

    const cleanedName = validatePlayerName(playerName);
    if (!cleanedName) {
      return NextResponse.json(
        { error: "Please enter your name (max 40 characters, no control characters)." },
        { status: 400 }
      );
    }

    const finalName = cleanedName;

    const result = await joinGameRoom(roomCode, finalName, session?.user?.id, session?.user?.email || undefined);
    if (!result) {
      // Determine specific failure reason
      const existingRoom = await getGameRoom(roomCode);
      let failureReason = "room_not_found";
      if (existingRoom) {
        if (existingRoom.status === "finished") {
          failureReason = "game_ended";
        } else if (existingRoom.players.length >= 50) {
          failureReason = "room_full";
        }
      }

      const reqCtx = getRequestActivityContext(request);
      trackActivity({
        event: "game_join_failed",
        source: "server",
        userId: session?.user?.id ?? null,
        email: session?.user?.email || null,
        pathname: `/game/play/${roomCode}`,
        domain: reqCtx.domain,
        ipAddress: reqCtx.ipAddress,
        userAgent: reqCtx.userAgent,
        metadata: {
          roomCode,
          failureReason,
          playerName: finalName,
        },
      }).catch(() => {});

      return NextResponse.json({ error: "Room not found, full, or game has ended" }, { status: 404 });
    }

    // Track player join
    const reqCtx = getRequestActivityContext(request);
    trackActivity({
      event: "game_player_joined",
      source: "server",
      userId: session?.user?.id ?? null,
      email: session?.user?.email || null,
      pathname: `/game/play/${roomCode}`,
      domain: reqCtx.domain,
      ipAddress: reqCtx.ipAddress,
      userAgent: reqCtx.userAgent,
      metadata: {
        roomCode,
        playerId: result.player.playerId,
        playerName: result.player.playerName,
        gameTitle: result.room.title,
        playerCount: result.room.players?.length || 1,
      },
    }).catch(() => {});

    return NextResponse.json({
      playerId: result.player.playerId,
      playerToken: result.playerToken,
      playerName: result.player.playerName,
      cells: result.player.cells,
      marked: result.player.marked,
      room: {
        roomCode: result.room.roomCode,
        title: result.room.title,
        size: result.room.size,
        rows: result.room.rows,
        columns: result.room.columns,
        bingoVariant: result.room.bingoVariant || "custom",
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
