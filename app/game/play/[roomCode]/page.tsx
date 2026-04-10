"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Confetti from "@/components/Confetti";
import SoundToggle from "@/components/SoundToggle";
import { playDabSound, playUndabSound, playBingoSound, playDingSound } from "@/lib/sounds";
import { isImageCell, parseImageCell, getCellDisplayText } from "@/lib/cellContent";
import { useTextFit } from "@/lib/useTextFit";
import { trackClientActivity } from "@/lib/activity-client";

interface PlayerData {
  playerId: string;
  playerToken: string;
  playerName: string;
  cells: string[];
  marked: number[];
}

interface OtherPlayer {
  playerId: string;
  playerName: string;
  hasBingo: boolean;
  markedCount: number;
}

type WinCondition = "standard" | "four_corners" | "blackout";

interface GameWinner {
  playerId: string;
  playerName: string;
}

export default function PlayGamePage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [calledItems, setCalledItems] = useState<string[]>([]);
  const [lastCalledItem, setLastCalledItem] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<"waiting" | "active" | "finished">("waiting");
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<OtherPlayer[]>([]);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [hasBingo, setHasBingo] = useState(false);
  const [showBingoAnim, setShowBingoAnim] = useState(false);
  const [showNewCall, setShowNewCall] = useState(false);
  const [title, setTitle] = useState("");
  const [size, setSize] = useState(5);
  const [freeSpace, setFreeSpace] = useState(true);
  const [style, setStyle] = useState<any>({});
  const [error, setError] = useState("");
  const [claimingBingo, setClaimingBingo] = useState(false);
  const [winCondition, setWinCondition] = useState<WinCondition>("standard");
  const [allowMultipleWinners, setAllowMultipleWinners] = useState(false);
  const [winners, setWinners] = useState<GameWinner[]>([]);

  const prevCalledCountRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const cellMarkCountRef = useRef(0);
  const multiGridRef = useRef<HTMLDivElement>(null);
  const fittedSizes = useTextFit(multiGridRef, {
    cells: player?.cells ?? [],
    gridSize: size as 3 | 4 | 5,
    fontFamily: style.fontFamily || "sans-serif",
    freeSpaceIndex: freeSpace ? Math.floor((size * size) / 2) : null,
  });

  // Load player data from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(`game-${roomCode}`);
    if (!stored) {
      router.push(`/game/join?code=${roomCode}`);
      return;
    }

    const data = JSON.parse(stored) as PlayerData;
    if (!data.playerToken) {
      sessionStorage.removeItem(`game-${roomCode}`);
      router.push(`/game/join?code=${roomCode}&error=session_expired`);
      return;
    }
    setPlayer(data);
    setMarked(new Set(data.marked || []));

    trackClientActivity("game_player_page_viewed", {
      roomCode,
      playerName: data.playerName,
    });

    // Fetch room info
    fetch(`/api/game/${roomCode}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.room) {
          setTitle(d.room.title);
          setSize(d.room.size);
          setFreeSpace(d.room.freeSpace);
          setStyle(d.room.style || {});
          setGameStatus(d.room.status);
          setCalledItems(d.room.calledItems || []);
          if (d.room.settings) {
            setWinCondition(d.room.settings.winCondition || "standard");
            setAllowMultipleWinners(d.room.settings.allowMultipleWinners || false);
          }
          if (d.room.winners) setWinners(d.room.winners);
          prevCalledCountRef.current = d.room.calledItems?.length || 0;
          if (d.room.calledItems?.length) {
            setLastCalledItem(d.room.calledItems[d.room.calledItems.length - 1]);
          }
        }
      });

    // SSE stream
    const es = new EventSource(`/api/game/${roomCode}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error || data.type === "connected") return;

        setGameStatus(data.status);
        setOtherPlayers(data.players || []);
        if (data.settings) {
          setWinCondition(data.settings.winCondition || "standard");
          setAllowMultipleWinners(data.settings.allowMultipleWinners || false);
        }

        if (data.calledItems) {
          setCalledItems((prev) => {
            if (data.calledItems.length > prev.length) {
              const newItem = data.calledItems[data.calledItems.length - 1];
              setLastCalledItem(newItem);
              setShowNewCall(true);
              playDingSound();
              setTimeout(() => setShowNewCall(false), 2000);
            }
            return data.calledItems;
          });
        }

        // Handle winners
        const newWinners = data.winners || [];
        setWinners((prev) => {
          if (newWinners.length > prev.length) {
            playBingoSound();
          }
          return newWinners;
        });
        if (data.winnerName) {
          setWinnerName(data.winnerName);
        }
      } catch {}
    };

    return () => {
      es.close();
    };
  }, [roomCode, router]);

  const getFreeSpaceIndex = useCallback(() => {
    if (!freeSpace) return -1;
    return Math.floor((size * size) / 2);
  }, [freeSpace, size]);

  const checkBingoWin = useCallback(
    (markedSet: Set<number>): boolean => {
      const s = size;
      if (winCondition === "four_corners") {
        return [0, s - 1, s * (s - 1), s * s - 1].every(idx => markedSet.has(idx));
      }
      if (winCondition === "blackout") {
        return markedSet.size >= s * s;
      }
      const grid = Array.from({ length: s }, (_, r) =>
        Array.from({ length: s }, (_, c) => markedSet.has(r * s + c))
      );
      for (let r = 0; r < s; r++) {
        if (grid[r]?.every(Boolean)) return true;
      }
      for (let c = 0; c < s; c++) {
        if (grid.map((row) => row[c] ?? false).every(Boolean)) return true;
      }
      if (Array.from({ length: s }, (_, i) => grid[i]?.[i] ?? false).every(Boolean)) return true;
      if (Array.from({ length: s }, (_, i) => grid[i]?.[s - 1 - i] ?? false).every(Boolean)) return true;
      return false;
    },
    [size, winCondition]
  );

  const toggleCell = async (index: number) => {
    if (!player || gameStatus !== "active") return;
    if (freeSpace && index === getFreeSpaceIndex()) return;

    const cellValue = player.cells[index] as string;
    const calledSet = new Set(calledItems);

    // Only allow marking cells that have been called
    if (!marked.has(index) && !calledSet.has(cellValue)) return;

    const newMarked = new Set(marked);
    const isMarking = !newMarked.has(index);

    if (isMarking) {
      newMarked.add(index);
      playDabSound();
      cellMarkCountRef.current++;
      if (cellMarkCountRef.current <= 10) {
        trackClientActivity("game_player_cell_marked", {
          roomCode,
          cellValue,
        });
      }
    } else {
      newMarked.delete(index);
      playUndabSound();
    }

    setMarked(newMarked);

    // Sync to server
    fetch(`/api/game/${roomCode}/bingo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: isMarking ? "mark" : "unmark",
        playerId: player.playerId,
        playerToken: player.playerToken,
        cellIndex: index,
      }),
    })
      .then((res) => {
        if (res.status === 401) {
          sessionStorage.removeItem(`game-${roomCode}`);
          router.push(`/game/join?code=${roomCode}&error=session_expired`);
        }
      })
      .catch(() => {});

    // Check for bingo
    if (checkBingoWin(newMarked) && !hasBingo) {
      setHasBingo(true);
    }
  };

  const claimBingoWin = async () => {
    if (!player || claimingBingo) return;
    setClaimingBingo(true);

    trackClientActivity("game_player_bingo_claimed", { roomCode });

    try {
      const res = await fetch(`/api/game/${roomCode}/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "claim",
          playerId: player.playerId,
          playerToken: player.playerToken,
        }),
      });

      if (res.status === 401) {
        sessionStorage.removeItem(`game-${roomCode}`);
        router.push(`/game/join?code=${roomCode}&error=session_expired`);
        return;
      }

      const data = await res.json();
      if (data.valid) {
        setShowBingoAnim(true);
        playBingoSound();
        setTimeout(() => setShowBingoAnim(false), 5000);
      } else {
        setError("Bingo claim invalid - make sure all marked items have been called!");
        setHasBingo(false);
        setTimeout(() => setError(""), 3000);
      }
    } catch {
      setError("Failed to claim bingo");
    } finally {
      setClaimingBingo(false);
    }
  };

  if (!player) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const freeIdx = getFreeSpaceIndex();
  const totalCells = size * size;
  const calledSet = new Set(calledItems);

  return (
    <div className="min-h-screen bg-slate-50">
      <Confetti active={showBingoAnim || (!!winnerName && winnerName === player.playerName)} />

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <Link href="/" className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
              MyBingoCard
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <SoundToggle />
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
              {player.playerName}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4 max-w-2xl">
        {error && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Game Status Bar */}
        {gameStatus === "waiting" && (
          <div className="mb-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">⏳</div>
            <p className="text-amber-800 font-semibold">Waiting for the host to start the game...</p>
            <p className="text-amber-600 text-sm mt-1">Room: {roomCode}</p>
          </div>
        )}

        {/* Win Condition Badge */}
        {gameStatus === "active" && winCondition !== "standard" && (
          <div className="mb-3 text-center">
            <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold">
              {winCondition === "four_corners" ? "Win: Four Corners" : "Win: Blackout (Full Card)"}
            </span>
          </div>
        )}

        {/* Winner Banner */}
        {winners.length > 0 && gameStatus === "finished" && (
          <div className="mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl p-4 text-center font-black shadow-lg">
            {winners.some(w => w.playerId === player.playerId) ? (
              <div className="text-xl">🎉 YOU WON! BINGO! 🎉</div>
            ) : winners.length === 1 ? (
              <div className="text-xl">🏆 {winners[0]!.playerName} got BINGO! 🏆</div>
            ) : (
              <div>
                <div className="text-lg mb-1">🏆 Game Over! 🏆</div>
                <div className="text-sm font-semibold">{winners.map(w => w.playerName).join(", ")}</div>
              </div>
            )}
          </div>
        )}
        {winnerName && gameStatus === "active" && allowMultipleWinners && (
          <div className="mb-3 p-2.5 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm text-center font-semibold">
            {winners.some(w => w.playerId === player.playerId)
              ? "You got BINGO! Game continues for other players."
              : `${winnerName} got BINGO! Game continues — you can still win!`}
          </div>
        )}
        {winnerName && !allowMultipleWinners && (
          <div className="mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl p-4 text-center font-black text-xl shadow-lg">
            {winnerName === player.playerName
              ? "🎉 YOU WON! BINGO! 🎉"
              : `🏆 ${winnerName} got BINGO! 🏆`}
          </div>
        )}

        {/* Current Call Display */}
        {gameStatus === "active" && lastCalledItem && (
          <div className={`mb-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center transition-all ${showNewCall ? "ring-2 ring-indigo-400 shadow-lg" : ""}`}>
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Current Call</div>
            <div className={`text-2xl font-black text-indigo-600 transition-all ${showNewCall ? "scale-110" : ""}`}>
              {lastCalledItem && isImageCell(lastCalledItem) ? (
                <span className="flex flex-col items-center gap-1">
                  <img src={parseImageCell(lastCalledItem)?.imageUrl} alt="" className="w-16 h-16 object-contain" />
                  {getCellDisplayText(lastCalledItem) && <span className="text-sm">{getCellDisplayText(lastCalledItem)}</span>}
                </span>
              ) : lastCalledItem}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {calledItems.length} called &bull; Tap matching cells to mark them
            </div>
          </div>
        )}

        {/* Bingo Claim Button */}
        {hasBingo && gameStatus === "active" && (allowMultipleWinners ? !winners.some(w => w.playerId === player.playerId) : !winnerName) && (
          <button
            onClick={claimBingoWin}
            disabled={claimingBingo}
            className="w-full mb-4 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-2xl font-black text-2xl shadow-lg hover:shadow-xl transition-all animate-pulse disabled:opacity-50"
          >
            {claimingBingo ? "Checking..." : "🎉 BINGO! Tap to claim!"}
          </button>
        )}

        {/* Card Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 md:p-5">
          <div className="text-center mb-3">
            <h1 className="text-lg font-bold text-slate-900">{title}</h1>
            <p className="text-xs text-slate-400">
              {marked.size}/{totalCells} marked
            </p>
          </div>

          <div
            ref={multiGridRef}
            className="grid gap-1.5 w-full"
            style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          >
            {player.cells.map((cell, index) => {
              const isFreeSpace = freeSpace && index === freeIdx;
              const isMarked = marked.has(index);
              const isCalled = calledSet.has(cell);
              const canMark = gameStatus === "active" && (isCalled || isMarked) && !isFreeSpace;
              const cellSize = `calc((min(100vw, 560px) - 36px - ${(size - 1) * 6}px) / ${size})`;

              return (
                <button
                  key={index}
                  onClick={() => toggleCell(index)}
                  disabled={!canMark && !isFreeSpace}
                  className={`
                    flex items-center justify-center text-center rounded-xl font-semibold transition-all duration-150 select-none touch-manipulation overflow-hidden
                    ${isFreeSpace
                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md cursor-default"
                      : isMarked
                        ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md ring-2 ring-indigo-300"
                        : isCalled
                          ? "bg-indigo-50 text-indigo-700 border-2 border-indigo-300 animate-pulse"
                          : "bg-slate-50 text-slate-500 border border-slate-200 opacity-60"
                    }
                  `}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    fontSize: `calc(${cellSize} * ${size === 3 ? 0.13 : size === 4 ? 0.12 : 0.10})`,
                    padding: "2px",
                    fontFamily: style.fontFamily || "inherit",
                  }}
                >
                  {isFreeSpace ? (
                    <span className="font-black text-xs">FREE</span>
                  ) : isMarked ? (
                    <span className="flex flex-col items-center gap-0.5">
                      <span className="text-base leading-none">&#10003;</span>
                      {isImageCell(cell) ? (
                        parseImageCell(cell)?.fit === "cover" ? (
                          <img src={parseImageCell(cell)?.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover rounded-lg md:rounded-xl opacity-60" />
                        ) : (
                          <img src={parseImageCell(cell)?.imageUrl} alt="" className="max-w-[60%] max-h-[40%] object-contain opacity-60" />
                        )
                      ) : (
                        <span className="opacity-60 line-through leading-tight break-words text-center" style={{ fontSize: fittedSizes.has(index) ? `${fittedSizes.get(index)! * 0.55}px` : "0.55em" }}>{cell}</span>
                      )}
                    </span>
                  ) : isImageCell(cell) ? (
                    parseImageCell(cell)?.fit === "cover" ? (
                      <span className="w-full h-full relative">
                        <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="absolute inset-0 w-full h-full object-cover rounded-lg md:rounded-xl" loading="lazy" />
                        {getCellDisplayText(cell) && <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[0.5em] leading-tight text-center truncate bg-black/40 text-white px-1 py-0.5 rounded">{getCellDisplayText(cell)}</span>}
                      </span>
                    ) : (
                      <span className="flex flex-col items-center gap-0.5 w-full h-full justify-center p-0.5">
                        <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="max-w-full max-h-[70%] object-contain" loading="lazy" />
                        {getCellDisplayText(cell) && <span className="text-[0.5em] leading-tight text-center w-full truncate">{getCellDisplayText(cell)}</span>}
                      </span>
                    )
                  ) : (
                    <span className="break-words leading-tight text-center" style={fittedSizes.has(index) ? { fontSize: `${fittedSizes.get(index)}px` } : undefined}>{cell}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${(marked.size / totalCells) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Called Items History (collapsible) */}
        {calledItems.length > 0 && (
          <details className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <summary className="px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
              Called Items ({calledItems.length})
            </summary>
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-1.5">
                {[...calledItems].reverse().map((item, i) => {
                  const isOnCard = player.cells.includes(item);
                  const isMarkedOnCard = player.cells.some((c, idx) => c === item && marked.has(idx));
                  return (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        i === 0
                          ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300"
                          : isMarkedOnCard
                            ? "bg-green-100 text-green-700"
                            : isOnCard
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item}
                    </span>
                  );
                })}
              </div>
            </div>
          </details>
        )}
      </main>
    </div>
  );
}
