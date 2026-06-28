"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { trackClientActivity } from "@/lib/activity-client";
import { setBrowserStorageItem } from "@/lib/browser-storage";

function makeGuestName() {
  return `Player ${Math.floor(100 + Math.random() * 900)}`;
}

function firstNameFromSessionName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] || "";
}

function isGeneratedGuestName(name: string): boolean {
  return /^Player \d{3}$/.test(name.trim());
}

function JoinGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomInfo, setRoomInfo] = useState<{ title: string; playerCount: number; status: string } | null>(null);
  const callbackUrl = roomCode.length === 6 ? `/game/join?code=${encodeURIComponent(roomCode)}` : "/game/join";
  const authQuery = encodeURIComponent(callbackUrl);
  const sessionDisplayName = firstNameFromSessionName(session?.user?.name);

  useEffect(() => {
    trackClientActivity("game_join_page_viewed");
    setPlayerName(makeGuestName());
  }, []);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setRoomCode(code.toUpperCase());
      fetchRoomInfo(code.toUpperCase());
    }
    if (searchParams.get("error") === "session_expired") {
      setError("Your session expired, please join again.");
    }
  }, [searchParams]);

  // Pre-fill player name from session
  useEffect(() => {
    const sessionName = firstNameFromSessionName(session?.user?.name);
    if (sessionName && (!playerName || isGeneratedGuestName(playerName))) {
      setPlayerName(sessionName);
    }
  }, [session, playerName]);

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
    if (!roomCode.trim()) return;

    setLoading(true);
    setError("");
    const resolvedName = playerName.trim() || makeGuestName();

    try {
      const res = await fetch(`/api/game/${roomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: resolvedName }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to join game");
        setLoading(false);
        return;
      }

      // Store player info in sessionStorage
      const stored = setBrowserStorageItem("sessionStorage", `game-${roomCode}`, JSON.stringify({
        playerId: data.playerId,
        playerToken: data.playerToken,
        playerName: data.playerName,
        cells: data.cells,
        marked: data.marked,
      }));
      if (!stored) {
        setError("Your browser blocked temporary game storage. Please allow site storage and try again.");
        setLoading(false);
        return;
      }

      trackClientActivity("game_join_started", {
        roomCode,
        usedDefaultName: !playerName.trim(),
      });
      router.push(`/game/play/${roomCode}`);
    } catch {
      setError("Failed to join game");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black text-emerald-700">
              MyBingoCard
            </span>
          </Link>
          <p className="text-emerald-800 mt-2 font-semibold">Join as a guest or sign in</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-6">
          {authStatus === "loading" ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-slate-500 text-sm">Loading...</p>
            </div>
          ) : (
          <form onSubmit={handleJoin} className="space-y-5">
            {session ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800 text-center">
                Signed in as {sessionDisplayName || "your account"}
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="flex gap-2">
                  <Link
                    href={`/login?callbackUrl=${authQuery}`}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Sign in
                  </Link>
                  <Link
                    href={`/signup?callbackUrl=${authQuery}`}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-bold text-white hover:bg-slate-800"
                  >
                    Sign up
                  </Link>
                </div>
                <div className="mt-2 text-center text-xs text-slate-500">
                  Guests can join with a name only.
                </div>
              </div>
            )}
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
                className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
              {roomInfo && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700 text-center">
                  <span className="font-semibold">{roomInfo.title}</span>
                  <span className="text-emerald-500 mx-1">&bull;</span>
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
                Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Player name"
                maxLength={30}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setPlayerName(makeGuestName())}
                className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Pick a simple name
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || roomCode.length !== 6 || roomInfo?.status === "finished"}
              className="w-full py-5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition font-black text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Joining..." : session ? `Join as ${playerName.trim() || sessionDisplayName || "player"}` : "Join as guest"}
            </button>
          </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/create" className="text-sm text-emerald-700 hover:text-emerald-800 font-medium">
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
