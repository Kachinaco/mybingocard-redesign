"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Confetti from "@/components/Confetti";
import SoundToggle from "@/components/SoundToggle";
import { playDingSound, playBingoSound, playDabSound, playUndabSound } from "@/lib/sounds";
import { isImageCell, parseImageCell, getCellDisplayText } from "@/lib/cellContent";
import { trackClientActivity } from "@/lib/activity-client";

type CallMode = "random" | "manual" | "auto" | "sequential";
type WinCondition = "standard" | "four_corners" | "blackout";

interface Player {
  playerId: string;
  playerName: string;
  hasBingo: boolean;
  markedCount: number;
}

interface GameWinner {
  playerId: string;
  playerName: string;
}

interface GameState {
  status: "waiting" | "active" | "finished";
  calledItems: string[];
  players: Player[];
  winnerId?: string;
  winnerName?: string;
  wordListCount: number;
  settings?: { callMode: CallMode; winCondition: WinCondition; allowMultipleWinners: boolean; autoCallInterval?: number };
  winners?: GameWinner[];
}

interface HostPlayerData {
  playerId: string;
  playerName: string;
  cells: string[];
  marked: number[];
}

export default function HostGamePage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [calling, setCalling] = useState(false);
  const [lastCalledItem, setLastCalledItem] = useState<string | null>(null);
  const [showCalledAnimation, setShowCalledAnimation] = useState(false);
  const [autoCalling, setAutoCalling] = useState(false);
  const [autoInterval, setAutoInterval] = useState(5);
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState("");
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Host play-along state
  const [playAlong, setPlayAlong] = useState(true);
  const [hostPlayer, setHostPlayer] = useState<HostPlayerData | null>(null);
  const [hostMarked, setHostMarked] = useState<Set<number>>(new Set());
  const [hostHasBingo, setHostHasBingo] = useState(false);
  const [claimingBingo, setClaimingBingo] = useState(false);
  const [size, setSize] = useState(5);
  const [freeSpace, setFreeSpace] = useState(true);
  const [cardStyle, setCardStyle] = useState<any>({});

  // Game settings state
  const [callMode, setCallMode] = useState<CallMode>("random");
  const [winCondition, setWinCondition] = useState<WinCondition>("standard");
  const [allowMultipleWinners, setAllowMultipleWinners] = useState(false);
  const [wordList, setWordList] = useState<string[]>([]);

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
      // Standard bingo
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

  // Persist a setting change to the server
  const saveSettings = (updates: Record<string, any>) => {
    fetch(`/api/game/${roomCode}/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settings", settings: updates }),
    }).catch(() => {});
  };

  // Connect to SSE stream + fetch room info + recover host player
  useEffect(() => {
    const es = new EventSource(`/api/game/${roomCode}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
          return;
        }
        if (data.type === "connected") return;

        setGameState((prev) => {
          if (prev && data.calledItems.length > prev.calledItems.length) {
            const newItem = data.calledItems[data.calledItems.length - 1];
            setLastCalledItem(newItem);
            setShowCalledAnimation(true);
            playDingSound();
            setTimeout(() => setShowCalledAnimation(false), 2000);
          }

          // Play bingo sound for new winners
          const prevWinners = prev?.winners?.length || 0;
          const newWinners = data.winners?.length || 0;
          if (newWinners > prevWinners) {
            playBingoSound();
          } else if (data.winnerName && (!prev || !prev.winnerName)) {
            playBingoSound();
          }

          return data;
        });
        setLoading(false);
      } catch {}
    };

    es.onerror = () => {
      setError("Connection lost. Reconnecting...");
      setTimeout(() => {
        if (eventSourceRef.current === es) {
          es.close();
        }
      }, 3000);
    };

    // Fetch initial room info
    fetch(`/api/game/${roomCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.room) {
          setTitle(data.room.title);
          setSize(data.room.size || 5);
          setFreeSpace(data.room.freeSpace !== false);
          setCardStyle(data.room.style || {});
          setWordList(data.room.wordList || []);
          if (data.room.calledItems?.length > 0) {
            setLastCalledItem(data.room.calledItems[data.room.calledItems.length - 1]);
          }
          // Load persisted settings
          if (data.room.settings) {
            setCallMode(data.room.settings.callMode || "random");
            setWinCondition(data.room.settings.winCondition || "standard");
            setAllowMultipleWinners(data.room.settings.allowMultipleWinners || false);
            if (data.room.settings.autoCallInterval) {
              setAutoInterval(data.room.settings.autoCallInterval);
            }
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Recover host player data from sessionStorage
    try {
      const stored = sessionStorage.getItem(`host-game-${roomCode}`);
      if (stored) {
        const data = JSON.parse(stored) as HostPlayerData;
        setHostPlayer(data);
        setHostMarked(new Set(data.marked || []));
        fetch(`/api/game/${roomCode}/bingo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "state", playerId: data.playerId }),
        })
          .then((r) => r.json())
          .then((state) => {
            if (state.cells) {
              const recovered: HostPlayerData = {
                ...data,
                cells: state.cells,
                marked: state.marked || [],
              };
              setHostPlayer(recovered);
              setHostMarked(new Set(state.marked || []));
              setHostHasBingo(state.hasBingo || false);
              sessionStorage.setItem(`host-game-${roomCode}`, JSON.stringify(recovered));
            }
          })
          .catch(() => {});
      }
    } catch {}

    return () => {
      es.close();
    };
  }, [roomCode]);

  // Auto-caller
  useEffect(() => {
    if (autoCalling && gameState?.status === "active") {
      autoTimerRef.current = setTimeout(() => {
        callNextItem();
      }, autoInterval * 1000);
    }
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [autoCalling, gameState?.calledItems?.length, autoInterval, gameState?.status]);

  // Auto-start calling when callMode is "auto" and game becomes active
  useEffect(() => {
    if (callMode === "auto" && gameState?.status === "active" && !autoCalling) {
      setAutoCalling(true);
    }
  }, [callMode, gameState?.status]);

  const startGame = async () => {
    try {
      const res = await fetch(`/api/game/${roomCode}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", playAlong }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start");
      } else if (data.hostPlayer) {
        const hp: HostPlayerData = {
          playerId: data.hostPlayer.playerId,
          playerName: data.hostPlayer.playerName,
          cells: data.hostPlayer.cells,
          marked: data.hostPlayer.marked || [],
        };
        setHostPlayer(hp);
        setHostMarked(new Set(hp.marked));
        sessionStorage.setItem(`host-game-${roomCode}`, JSON.stringify(hp));
      }
    } catch {
      setError("Failed to start game");
    }
  };

  const callNextItem = useCallback(async () => {
    if (calling) return;
    setCalling(true);
    try {
      const action = callMode === "sequential" ? "sequential" : "random";
      const res = await fetch(`/api/game/${roomCode}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("No more items")) {
          setAutoCalling(false);
        }
        setError(data.error || "Failed to call");
      }
    } catch {
      setError("Failed to call item");
    } finally {
      setCalling(false);
    }
  }, [calling, roomCode, callMode]);

  const callSpecificItem = async (item: string) => {
    if (calling) return;
    setCalling(true);
    try {
      const res = await fetch(`/api/game/${roomCode}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "call", item }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to call item");
      }
    } catch {
      setError("Failed to call item");
    } finally {
      setCalling(false);
    }
  };

  const endGameManually = async () => {
    try {
      const res = await fetch(`/api/game/${roomCode}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to end game");
      }
    } catch {
      setError("Failed to end game");
    }
  };

  const toggleHostCell = async (index: number) => {
    if (!hostPlayer || gameState?.status !== "active") return;
    const freeIdx = getFreeSpaceIndex();
    if (freeSpace && index === freeIdx) return;

    const cellValue = hostPlayer.cells[index] as string;
    const calledSet = new Set(gameState?.calledItems || []);

    if (!hostMarked.has(index) && !calledSet.has(cellValue)) return;

    const newMarked = new Set(hostMarked);
    const isMarking = !newMarked.has(index);

    if (isMarking) {
      newMarked.add(index);
      playDabSound();
    } else {
      newMarked.delete(index);
      playUndabSound();
    }

    setHostMarked(newMarked);

    const updated = { ...hostPlayer, marked: Array.from(newMarked) };
    sessionStorage.setItem(`host-game-${roomCode}`, JSON.stringify(updated));

    fetch(`/api/game/${roomCode}/bingo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: isMarking ? "mark" : "unmark",
        playerId: hostPlayer.playerId,
        cellIndex: index,
      }),
    }).catch(() => {});

    if (checkBingoWin(newMarked) && !hostHasBingo) {
      setHostHasBingo(true);
    }
  };

  const claimHostBingo = async () => {
    if (!hostPlayer || claimingBingo) return;
    setClaimingBingo(true);

    try {
      const res = await fetch(`/api/game/${roomCode}/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "claim",
          playerId: hostPlayer.playerId,
        }),
      });

      const data = await res.json();
      if (data.valid) {
        playBingoSound();
      } else {
        setError("Bingo claim invalid - make sure all marked items have been called!");
        setHostHasBingo(false);
        setTimeout(() => setError(""), 3000);
      }
    } catch {
      setError("Failed to claim bingo");
    } finally {
      setClaimingBingo(false);
    }
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}/game/join?code=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-slate-500">Loading game room...</p>
        </div>
      </div>
    );
  }

  const remaining = gameState ? (gameState.wordListCount - gameState.calledItems.length) : 0;
  const freeIdx = getFreeSpaceIndex();
  const calledSet = new Set(gameState?.calledItems || []);
  const totalCells = size * size;
  const isHostWinner = gameState?.winnerName && hostPlayer && gameState.winnerId === hostPlayer.playerId;
  const winners = gameState?.winners || [];
  const canHostClaimBingo = hostHasBingo && gameState?.status === "active" && (allowMultipleWinners || !gameState?.winnerName);
  const uncalledItems = wordList.filter(w => !calledSet.has(w));

  return (
    <div className="min-h-screen bg-slate-50">
      <Confetti active={!!gameState?.winnerName || winners.length > 0} />

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
            MyBingoCard
          </Link>
          <div className="flex items-center gap-2">
            <SoundToggle />
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
              HOST
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}

        {/* Room Info Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{title || "Bingo Game"}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  gameState?.status === "waiting" ? "bg-amber-100 text-amber-700" :
                  gameState?.status === "active" ? "bg-green-100 text-green-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {gameState?.status === "waiting" ? "Waiting for players" :
                   gameState?.status === "active" ? "Game in progress" : "Game over"}
                </span>
                <span className="text-sm text-slate-500">{gameState?.players.length || 0} players</span>
                {gameState?.status === "active" && (
                  <span className="text-xs text-slate-400">
                    {winCondition === "four_corners" ? "Four Corners" : winCondition === "blackout" ? "Blackout" : "Standard"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
                <div className="text-2xl font-black text-indigo-600 font-mono tracking-widest">{roomCode}</div>
                <div className="text-xs text-slate-500">Room Code</div>
              </div>
              <button
                onClick={copyRoomLink}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-semibold"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bingo Caller Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Current Call Display / Waiting / Finished */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              {gameState?.status === "waiting" && (
                <div className="py-4">
                  <div className="text-center mb-6">
                    <div className="text-5xl mb-3">🎯</div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Ready to Start!</h2>
                    <p className="text-slate-500 text-sm">
                      Share the room code <span className="font-bold text-indigo-600">{roomCode}</span> with your players
                    </p>
                  </div>

                  {/* Game Settings */}
                  <div className="max-w-lg mx-auto space-y-4 mb-6">
                    {/* Call Mode */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">How to call items</div>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ["random", "Random"],
                          ["manual", "Manual Pick"],
                          ["auto", "Auto-Call"],
                          ["sequential", "In Order"],
                        ] as [CallMode, string][]).map(([mode, label]) => (
                          <button
                            key={mode}
                            onClick={() => { setCallMode(mode); saveSettings({ callMode: mode }); }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                              callMode === mode
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {callMode === "auto" && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-slate-500">Interval:</span>
                          <select
                            value={autoInterval}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setAutoInterval(val);
                              saveSettings({ autoCallInterval: val });
                            }}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm"
                          >
                            <option value={3}>3 seconds</option>
                            <option value={5}>5 seconds</option>
                            <option value={8}>8 seconds</option>
                            <option value={10}>10 seconds</option>
                            <option value={15}>15 seconds</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Win Condition */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Win condition</div>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          ["standard", "Standard"],
                          ["four_corners", "4 Corners"],
                          ["blackout", "Blackout"],
                        ] as [WinCondition, string][]).map(([cond, label]) => (
                          <button
                            key={cond}
                            onClick={() => { setWinCondition(cond); saveSettings({ winCondition: cond }); }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                              winCondition === cond
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {winCondition === "standard" && "Row, column, or diagonal"}
                        {winCondition === "four_corners" && "All four corner cells"}
                        {winCondition === "blackout" && "Every cell on the card"}
                      </p>
                    </div>

                    {/* Multiple Winners + Play Along */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="flex-1 flex items-center gap-2 cursor-pointer bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 hover:border-indigo-300 transition">
                        <input
                          type="checkbox"
                          checked={allowMultipleWinners}
                          onChange={(e) => { setAllowMultipleWinners(e.target.checked); saveSettings({ allowMultipleWinners: e.target.checked }); }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Allow multiple winners</span>
                      </label>
                      <label className="flex-1 flex items-center gap-2 cursor-pointer bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 hover:border-indigo-300 transition">
                        <input
                          type="checkbox"
                          checked={playAlong}
                          onChange={(e) => setPlayAlong(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-slate-700">I want to play too</span>
                      </label>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={startGame}
                      disabled={!gameState?.players.length}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {gameState?.players.length ? "Start Game" : "Waiting for players..."}
                    </button>
                  </div>
                </div>
              )}

              {gameState?.status === "active" && (
                <div>
                  {/* Current called item */}
                  <div className={`text-center mb-6 transition-all duration-300 ${showCalledAnimation ? "scale-110" : ""}`}>
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Current Call</div>
                    {lastCalledItem ? (
                      <div className={`inline-block px-8 py-6 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl shadow-lg transition-all duration-500 ${showCalledAnimation ? "animate-bounce shadow-xl shadow-indigo-200" : ""}`}>
                        <div className="text-3xl font-black">
                          {isImageCell(lastCalledItem!) ? (
                            <span className="flex flex-col items-center gap-1">
                              <img src={parseImageCell(lastCalledItem!)?.imageUrl} alt="" className="w-20 h-20 object-contain" />
                              {getCellDisplayText(lastCalledItem!) && <span className="text-lg">{getCellDisplayText(lastCalledItem!)}</span>}
                            </span>
                          ) : lastCalledItem}
                        </div>
                        <div className="text-indigo-200 text-sm mt-1">
                          Call #{gameState.calledItems.length} of {gameState.wordListCount}
                        </div>
                      </div>
                    ) : (
                      <div className="inline-block px-8 py-6 bg-slate-100 text-slate-400 rounded-2xl">
                        <div className="text-2xl font-bold">
                          {callMode === "manual" ? "Pick an item below" : "Press Call to begin"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Call controls — varies by mode */}
                  <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
                    {/* Random + Sequential: Call Next button */}
                    {(callMode === "random" || callMode === "sequential") && (
                      <button
                        onClick={callNextItem}
                        disabled={calling || remaining === 0}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:shadow-lg transition font-bold disabled:opacity-50"
                      >
                        {calling ? "Calling..." : remaining === 0 ? "All Called!" : "Call Next"}
                      </button>
                    )}

                    {/* Auto mode: pause/resume + interval */}
                    {callMode === "auto" && (
                      <>
                        <button
                          onClick={() => setAutoCalling(!autoCalling)}
                          className={`px-6 py-3 rounded-xl font-bold transition ${
                            autoCalling
                              ? "bg-amber-500 text-white hover:bg-amber-600"
                              : "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg"
                          }`}
                        >
                          {autoCalling ? "Pause" : "Resume"}
                        </button>
                        <select
                          value={autoInterval}
                          onChange={(e) => setAutoInterval(Number(e.target.value))}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                        >
                          <option value={3}>3s</option>
                          <option value={5}>5s</option>
                          <option value={8}>8s</option>
                          <option value={10}>10s</option>
                          <option value={15}>15s</option>
                        </select>
                        {autoCalling && (
                          <span className="text-sm text-green-600 font-medium animate-pulse">Auto-calling...</span>
                        )}
                      </>
                    )}

                    {/* Random mode: also show auto-call toggle */}
                    {callMode === "random" && (
                      <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                        <label className="text-sm text-slate-600 font-medium whitespace-nowrap">Auto-Call</label>
                        <button
                          onClick={() => {
                            const newValue = !autoCalling;
                            setAutoCalling(newValue);
                            trackClientActivity("game_auto_call_toggled", {
                              enabled: newValue,
                              interval_seconds: autoInterval,
                              roomCode,
                            });
                          }}
                          className={`relative w-12 h-6 rounded-full transition-colors ${autoCalling ? "bg-green-500" : "bg-slate-300"}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoCalling ? "translate-x-6" : "translate-x-0.5"}`} />
                        </button>
                        {autoCalling && (
                          <select
                            value={autoInterval}
                            onChange={(e) => setAutoInterval(Number(e.target.value))}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm"
                          >
                            <option value={3}>3s</option>
                            <option value={5}>5s</option>
                            <option value={8}>8s</option>
                            <option value={10}>10s</option>
                            <option value={15}>15s</option>
                          </select>
                        )}
                      </div>
                    )}

                    <div className="text-sm text-slate-500">
                      {remaining} remaining
                    </div>

                    {/* End Game button for multiple winners mode */}
                    {allowMultipleWinners && winners.length > 0 && (
                      <button
                        onClick={endGameManually}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-semibold text-sm"
                      >
                        End Game
                      </button>
                    )}
                  </div>

                  {/* Manual Pick Grid */}
                  {callMode === "manual" && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Tap an item to call it ({uncalledItems.length} remaining)
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                        {uncalledItems.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => callSpecificItem(item)}
                            disabled={calling}
                            className="px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 hover:border-indigo-400 transition disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            {isImageCell(item) ? (
                              <>
                                <img src={parseImageCell(item)?.imageUrl} alt="" className="w-6 h-6 object-contain" />
                                {getCellDisplayText(item) && <span>{getCellDisplayText(item)}</span>}
                              </>
                            ) : item}
                          </button>
                        ))}
                        {uncalledItems.length === 0 && (
                          <p className="text-sm text-slate-400">All items have been called!</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {gameState?.status === "finished" && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🏆</div>
                  {winners.length > 1 ? (
                    <>
                      <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
                        Winners!
                      </h2>
                      <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {winners.map((w, i) => (
                          <span key={i} className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-xl font-bold text-sm">
                            {w.playerId === hostPlayer?.playerId ? "You" : w.playerName}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                      {isHostWinner ? "You Win!" : `${gameState.winnerName || "Game"} Wins!`}
                    </h2>
                  )}
                  <p className="text-slate-500 mb-6">
                    After {gameState.calledItems.length} calls
                  </p>
                  <Link
                    href="/dashboard"
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold"
                  >
                    Back to Dashboard
                  </Link>
                </div>
              )}
            </div>

            {/* Host Bingo Claim Button */}
            {canHostClaimBingo && (
              <button
                onClick={claimHostBingo}
                disabled={claimingBingo}
                className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-2xl font-black text-2xl shadow-lg hover:shadow-xl transition-all animate-pulse disabled:opacity-50"
              >
                {claimingBingo ? "Checking..." : "BINGO! Tap to claim!"}
              </button>
            )}

            {/* Host's Bingo Card (Play Along) */}
            {hostPlayer && gameState?.status !== "waiting" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="text-center mb-3">
                  <h3 className="text-sm font-bold text-slate-700">Your Card</h3>
                  <p className="text-xs text-slate-400">
                    {hostMarked.size}/{totalCells} marked
                  </p>
                </div>
                <div
                  className="grid gap-1.5 max-w-md mx-auto"
                  style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
                >
                  {hostPlayer.cells.map((cell, index) => {
                    const isFreeSpace = freeSpace && index === freeIdx;
                    const isMarked = hostMarked.has(index);
                    const isCalled = calledSet.has(cell);
                    const canMark = gameState?.status === "active" && (isCalled || isMarked) && !isFreeSpace;

                    return (
                      <button
                        key={index}
                        onClick={() => toggleHostCell(index)}
                        disabled={!canMark && !isFreeSpace}
                        className={`
                          aspect-square flex items-center justify-center text-center rounded-lg font-semibold transition-all duration-150 select-none touch-manipulation overflow-hidden p-1
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
                          fontSize: size === 3 ? "0.75rem" : size === 4 ? "0.65rem" : "0.6rem",
                          fontFamily: cardStyle.fontFamily || "inherit",
                        }}
                      >
                        {isFreeSpace ? (
                          <span className="font-black text-xs">FREE</span>
                        ) : isMarked ? (
                          <span className="flex flex-col items-center gap-0.5">
                            <span className="text-base leading-none">&#10003;</span>
                            {isImageCell(cell) ? (
                              <img src={parseImageCell(cell)?.imageUrl} alt="" className="max-w-[60%] max-h-[40%] object-contain opacity-60" />
                            ) : (
                              <span className="opacity-60 line-through leading-tight break-words text-center text-[0.5em]">{cell}</span>
                            )}
                          </span>
                        ) : isImageCell(cell) ? (
                          <span className="flex flex-col items-center gap-0.5 w-full h-full justify-center p-0.5">
                            <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="max-w-full max-h-[70%] object-contain" loading="lazy" />
                            {getCellDisplayText(cell) && <span className="text-[0.5em] leading-tight text-center w-full truncate">{getCellDisplayText(cell)}</span>}
                          </span>
                        ) : (
                          <span className="break-words leading-tight text-center line-clamp-3">{cell}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${(hostMarked.size / totalCells) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Called Items History */}
            {gameState && gameState.calledItems.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-sm font-bold text-slate-700 mb-3">
                  Called Items ({gameState.calledItems.length})
                </h3>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {[...gameState.calledItems].reverse().map((item, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1 ${
                        i === 0
                          ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isImageCell(item) ? (
                        <>
                          <img src={parseImageCell(item)?.imageUrl} alt="" className="w-6 h-6 object-contain" />
                          {getCellDisplayText(item) && <span>{getCellDisplayText(item)}</span>}
                        </>
                      ) : item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Players Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sticky top-20">
              <h3 className="text-sm font-bold text-slate-700 mb-3">
                Players ({gameState?.players.length || 0})
              </h3>

              {!gameState?.players.length ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-slate-400 text-sm">Waiting for players to join...</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {gameState.players.map((player) => (
                    <div
                      key={player.playerId}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        player.hasBingo
                          ? "border-yellow-300 bg-yellow-50"
                          : player.playerId === hostPlayer?.playerId
                            ? "border-indigo-200 bg-indigo-50"
                            : "border-slate-100 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          player.hasBingo
                            ? "bg-yellow-400 text-yellow-900"
                            : player.playerId === hostPlayer?.playerId
                              ? "bg-indigo-200 text-indigo-700"
                              : "bg-indigo-100 text-indigo-600"
                        }`}>
                          {player.playerName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-700 text-sm">{player.playerName}</span>
                      </div>
                      <div className="text-right">
                        {player.hasBingo ? (
                          <span className="text-xs font-bold text-yellow-600">BINGO!</span>
                        ) : (
                          <span className="text-xs text-slate-400">{player.markedCount} marked</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
