"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function JoinGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomInfo, setRoomInfo] = useState<{ title: string; playerCount: number; status: string } | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setRoomCode(code.toUpperCase());
      fetchRoomInfo(code.toUpperCase());
    }
  }, [searchParams]);

  const fetchRoomInfo = async (code: string) => {
    try {
      const res = await fetch(`/api/game/${code}`);
      if (res.ok) {
        const data = await res.json();
        setRoomInfo({
          title: data.room.title,
          playerCount: data.room.players.length,
          status: data.room.status,
        });
      }
    } catch {}
  };

  const handleCodeChange = (val: string) => {
    const upper = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setRoomCode(upper);
    setRoomInfo(null);
    setError("");
    if (upper.length === 6) {
      fetchRoomInfo(upper);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !playerName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/game/${roomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: playerName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to join game");
        setLoading(false);
        return;
      }

      // Store player info in sessionStorage
      sessionStorage.setItem(`game-${roomCode}`, JSON.stringify({
        playerId: data.playerId,
        playerName: data.playerName,
        cells: data.cells,
        marked: data.marked,
      }));

      router.push(`/game/play/${roomCode}`);
    } catch {
      setError("Failed to join game");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
              MyBingoCard
            </span>
          </Link>
          <p className="text-slate-500 mt-2">Join a live bingo game</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <form onSubmit={handleJoin} className="space-y-5">
            {/* Room Code */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="ABCDEF"
                maxLength={6}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
              {roomInfo && (
                <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700 text-center">
                  <span className="font-semibold">{roomInfo.title}</span>
                  <span className="text-green-500 mx-1">&bull;</span>
                  <span>{roomInfo.playerCount} player{roomInfo.playerCount !== 1 ? "s" : ""}</span>
                  {roomInfo.status === "finished" && (
                    <span className="text-red-500 ml-1">(Game ended)</span>
                  )}
                </div>
              )}
            </div>

            {/* Player Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={30}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || roomCode.length !== 6 || !playerName.trim() || roomInfo?.status === "finished"}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Joining..." : "Join Game"}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link href="/create" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Or create your own bingo card
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function JoinGamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
      <JoinGameContent />
    </Suspense>
  );
}
