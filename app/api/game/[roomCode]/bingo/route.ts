import { NextResponse } from "next/server";
import { claimBingo, markCell, unmarkCell, getGameRoom, detectWinPattern, DEFAULT_SETTINGS, verifyPlayerToken } from "@/lib/db/games";
import { trackActivity } from "@/lib/activity";
import { auth } from "@/auth";

const VALID_ACTIONS = new Set(["mark", "unmark", "claim", "state"]);
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const TOKEN_RE = /^[a-f0-9]{64}$/i;

function validateBingoRequest(body: unknown): {
  action: "mark" | "unmark" | "claim" | "state";
  playerId: string;
  playerToken?: string;
  cellIndex?: number;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const { action, playerId, playerToken, cellIndex } = b;

  if (typeof action !== "string" || !VALID_ACTIONS.has(action)) return null;
  if (typeof playerId !== "string" || !OBJECT_ID_RE.test(playerId)) return null;
  // playerToken is optional (host bypass uses NextAuth session instead),
  // but if provided it must be a valid 64-hex token.
  let token: string | undefined;
  if (playerToken !== undefined && playerToken !== null && playerToken !== "") {
    if (typeof playerToken !== "string" || !TOKEN_RE.test(playerToken)) return null;
    token = playerToken;
  }

  if (action === "mark" || action === "unmark") {
    if (!Number.isInteger(cellIndex) || (cellIndex as number) < 0 || (cellIndex as number) >= 10000) {
      return null;
    }
    return {
      action: action as "mark" | "unmark",
      playerId,
      playerToken: token,
      cellIndex: cellIndex as number,
    };
  }

  return { action: action as "claim" | "state", playerId, playerToken: token };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const body = await request.json();
    const parsed = validateBingoRequest(body);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { action, playerId, playerToken, cellIndex } = parsed;

    // Authorize: either a valid player token, or an authenticated host acting on their own player record.
    let isAuthorizedHost = false;
    if (playerToken) {
      if (!(await verifyPlayerToken(roomCode, playerId, playerToken))) {
        return NextResponse.json(
          { error: "Session expired, please rejoin the game" },
          { status: 401 }
        );
      }
    } else {
      const session = await auth();
      if (session?.user?.id) {
        const room = await getGameRoom(roomCode);
        if (room?.hostUserId === session.user.id) {
          const hostPlayer = room.players.find(p => p.userId === session.user!.id);
          if (hostPlayer && hostPlayer.playerId === playerId) {
            isAuthorizedHost = true;
          }
        }
      }
      if (!isAuthorizedHost) {
        return NextResponse.json(
          { error: "Session expired, please rejoin the game" },
          { status: 401 }
        );
      }
    }

    // Mark/unmark a cell
    if (action === "mark" && cellIndex !== undefined) {
      const success = await markCell(roomCode, playerId, cellIndex, playerToken ?? "", isAuthorizedHost);
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

    if (action === "unmark" && cellIndex !== undefined) {
      const success = await unmarkCell(roomCode, playerId, cellIndex, playerToken ?? "", isAuthorizedHost);
      return NextResponse.json({ success });
    }

    // Claim bingo
    if (action === "claim") {
      // Fetch room before claim to get startedAt for duration calculation
      const roomBeforeClaim = await getGameRoom(roomCode);
      const result = await claimBingo(roomCode, playerId, playerToken ?? "", isAuthorizedHost);

      if (result && result.valid) {
        const room = await getGameRoom(roomCode);
        const winningPlayer = room?.players.find(p => p.playerId === playerId);
        const winPattern = winningPlayer && room
          ? detectWinPattern(
              winningPlayer.marked,
              winningPlayer.cells,
              room.rows || room.size,
              room.columns || room.size,
              room.bingoVariant || "custom"
            )
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
            winnerName: result.playerName || null,
            playerCount: room?.players?.length || 0,
            calledItemCount: room?.calledItems?.length || 0,
            gameTitle: room?.title || null,
            win_pattern: winPattern,
            gameEnded: result.gameEnded,
          },
        }).catch(() => {});

        // Track game completion only when game actually ended
        if (result.gameEnded !== false) {
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
              winnersCount: (room?.winners ?? []).length,
            },
          }).catch(() => {});
        }
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
    if (action === "state") {
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
        rows: room.rows,
        columns: room.columns,
        bingoVariant: room.bingoVariant || "custom",
        winnerId: room.winnerId,
        winnerName: room.winnerName,
        settings: room.settings ?? DEFAULT_SETTINGS,
        winners: (room.winners ?? []).map(w => ({
          playerId: w.playerId,
          playerName: w.playerName,
          verificationCode: w.verificationCode,
        })),
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
