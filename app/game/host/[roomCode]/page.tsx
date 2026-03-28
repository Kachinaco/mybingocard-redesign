"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Confetti from "@/components/Confetti";
import SoundToggle from "@/components/SoundToggle";
import { playDingSound, playBingoSound } from "@/lib/sounds";
import { isImageCell, parseImageCell, getCellDisplayText } from "@/lib/cellContent";
import { trackClientActivity } from "@/lib/activity-client";

interface Player {
  playerId: string;
  playerName: string;
  hasBingo: boolean;
  markedCount: number;
}

interface GameState {
  status: "waiting" | "active" | "finished";
  calledItems: string[];
  players: Player[];
  winnerId?: string;
  winnerName?: string;
  wordListCount: number;
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
  const prevCalledCountRef = useRef(0);

  // Connect to SSE stream
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
          // Play ding when new item called (not on initial load)
          if (prev && data.calledItems.length > prev.calledItems.length) {
            const newItem = data.calledItems[data.calledItems.length - 1];
            setLastCalledItem(newItem);
            setShowCalledAnimation(true);
            playDingSound();
            setTimeout(() => setShowCalledAnimation(false), 2000);
          }

          // Play bingo sound when someone wins
          if (data.winnerName && (!prev || !prev.winnerName)) {
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
          // Reconnect handled by browser
        }
      }, 3000);
    };

    // Fetch initial room info
    fetch(`/api/game/${roomCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.room) {
          setTitle(data.room.title);
          if (data.room.calledItems?.length > 0) {
            setLastCalledItem(data.room.calledItems[data.room.calledItems.length - 1]);
            prevCalledCountRef.current = data.room.calledItems.length;
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

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

  const startGame = async () => {
    try {
      const res = await fetch(`/api/game/${roomCode}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to start");
      }
    } catch {
      setError("Failed to start game");
    }
  };

  const callNextItem = useCallback(async () => {
    if (calling) return;
    setCalling(true);
    try {
      const res = await fetch(`/api/game/${roomCode}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "random" }),
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
  }, [calling, roomCode]);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <Confetti active={!!gameState?.winnerName} />

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
            {/* Current Call Display */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              {gameState?.status === "waiting" && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎯</div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to Start!</h2>
                  <p className="text-slate-500 mb-6">
                    Share the room code <span className="font-bold text-indigo-600">{roomCode}</span> with your players
                  </p>
                  <button
                    onClick={startGame}
                    disabled={!gameState?.players.length}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gameState?.players.length ? "Start Game" : "Waiting for players..."}
                  </button>
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
                        <div className="text-2xl font-bold">Press Call to begin</div>
                      </div>
                    )}
                  </div>

                  {/* Call controls */}
                  <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                    <button
                      onClick={callNextItem}
                      disabled={calling || remaining === 0}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:shadow-lg transition font-bold disabled:opacity-50"
                    >
                      {calling ? "Calling..." : remaining === 0 ? "All Called!" : "Call Next"}
                    </button>

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
                    </div>

                    {autoCalling && (
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
                    )}

                    <div className="text-sm text-slate-500">
                      {remaining} remaining
                    </div>
                  </div>
                </div>
              )}

              {gameState?.status === "finished" && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🏆</div>
                  <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                    {gameState.winnerName || "Game"} Wins!
                  </h2>
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
                          : "border-slate-100 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          player.hasBingo
                            ? "bg-yellow-400 text-yellow-900"
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
