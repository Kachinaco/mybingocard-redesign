"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { trackClientActivity } from "@/lib/activity-client";

function JoinGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomInfo, setRoomInfo] = useState<{ title: string; playerCount: number; status: string } | null>(null);

  useEffect(() => {
    trackClientActivity("game_join_page_viewed");
  }, []);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setRoomCode(code.toUpperCase());
      fetchRoomInfo(code.toUpperCase());
    }
  }, [searchParams]);

  // Pre-fill player name from session
  useEffect(() => {
    if (session?.user?.name && !playerName) {
      setPlayerName(session.user.name.split(" ")[0] || "");
    }
  }, [session]);

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
          {authStatus === "loading" ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-slate-500 text-sm">Loading...</p>
            </div>
          ) : !session?.user ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Sign in to play</h3>
              <p className="text-slate-500 text-sm mb-6">Create a free account to join live bingo games.</p>
              <div className="space-y-3">
                <Link
                  href={`/login?callbackUrl=/game/join${roomCode ? `?code=${roomCode}` : ""}`}
                  className="block w-full px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold text-center hover:shadow-lg transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href={`/signup?callbackUrl=/game/join${roomCode ? `?code=${roomCode}` : ""}`}
                  className="block w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-center hover:bg-slate-200 transition-all"
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          ) : (
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
          )}
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
