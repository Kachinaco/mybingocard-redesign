import { getGameRoom, DEFAULT_SETTINGS } from "@/lib/db/games";
import { trackActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      let lastHash = "";

      const send = (data: any) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const poll = async () => {
        if (closed) return;

        try {
          const room = await getGameRoom(roomCode);
          if (!room) {
            send({ error: "Room not found" });
            closed = true;
            try { controller.close(); } catch {}
            return;
          }

          const winnersLen = (room.winners ?? []).length;
          const hash = `${room.status}-${room.calledItems.length}-${room.players.length}-${winnersLen}-${room.players.map(p => `${p.playerId}:${p.marked.length}:${p.hasBingo}`).join(",")}`;

          if (hash !== lastHash) {
            lastHash = hash;
            send({
              status: room.status,
              rows: room.rows,
              columns: room.columns,
              bingoVariant: room.bingoVariant || "custom",
              calledItems: room.calledItems,
              players: room.players.map(p => ({
                playerId: p.playerId,
                playerName: p.playerName,
                hasBingo: p.hasBingo,
                markedCount: p.marked.length,
              })),
              winnerId: room.winnerId,
              winnerName: room.winnerName,
              wordListCount: room.wordList.length,
              settings: room.settings ?? DEFAULT_SETTINGS,
              winners: (room.winners ?? []).map(w => ({
                playerId: w.playerId,
                playerName: w.playerName,
                verificationCode: w.verificationCode,
              })),
            });
          }
        } catch (err) {
          console.error("SSE poll error:", err);
        }

        if (!closed) {
          setTimeout(poll, 1500);
        }
      };

      // Send initial keepalive
      send({ type: "connected", roomCode });

      // Start polling
      poll();

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        closed = true;
        try { controller.close(); } catch {}

        // Determine role from Referer header
        const referer = request.headers.get("referer") || "";
        const role = referer.includes("/game/host/") ? "host" : "player";

        trackActivity({
          event: "game_stream_disconnected",
          source: "server",
          userId: null,
          email: null,
          pathname: `/api/game/${roomCode}/stream`,
          metadata: {
            roomCode,
            role,
          },
        }).catch(() => {});
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
