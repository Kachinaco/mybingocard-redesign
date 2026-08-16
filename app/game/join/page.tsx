"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { trackClientActivity } from "@/lib/activity-client";
import { setBrowserStorageItem } from "@/lib/browser-storage";

function makeGuestName() {
  return `Player ${Math.floor(100 + Math.random() * 900)}`;
}

function JoinGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const playerNameEditedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomInfo, setRoomInfo] = useState<{ title: string; playerCount: number; status: string } | null>(null);

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
    if (!session?.user?.name || playerNameEditedRef.current) return;

    const sessionFirstName = session.user.name.split(" ")[0] || "";
    if (sessionFirstName) setPlayerName(sessionFirstName);
  }, [session]);

  const handlePlayerNameChange = (value: string) => {
    playerNameEditedRef.current = true;
    setPlayerName(value);
  };

  const pickGuestName = () => {
    playerNameEditedRef.current = true;
    setPlayerName(makeGuestName());
  };

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
    <div className="min-h-screen bg-[#2ec4b6]/10 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black text-[#2ec4b6]">
              MyBingoCard
            </span>
          </Link>
          <p className="text-[#2ec4b6] mt-2 font-semibold">Tap one button to join</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-[#2ec4b6]/15 p-6">
          <div className="mb-5 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#2ec4b6]">Join a live room</span>
            <h1 className="mt-1 text-2xl font-bold text-[#33312e]">Enter the room code</h1>
            <p className="mt-1 text-sm text-[#6b6459]">The host will show a six-character code or QR image.</p>
          </div>
          <form onSubmit={handleJoin} className="space-y-5">
            {session?.user?.email && (
              <div className="text-xs text-[#6b6459] text-center">
                Signed in as {session.user.email}
              </div>
            )}
            {/* Room Code */}
            <div>
              <label className="block text-sm font-semibold text-[#33312e] mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="ABCDEF"
                maxLength={6}
                className="w-full px-4 py-3 bg-[#2ec4b6]/10 border border-[#2ec4b6] rounded-xl text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase focus:ring-2 focus:ring-[#2ec4b6]/20 focus:border-[#2ec4b6] outline-none"
              />
              {roomInfo && (
                <div className="mt-2 p-2 bg-[#2ec4b6]/10 border border-[#2ec4b6]/15 rounded-lg text-sm text-[#2ec4b6] text-center">
                  <span className="font-semibold">{roomInfo.title}</span>
                  <span className="text-[#2ec4b6] mx-1">&bull;</span>
                  <span>{roomInfo.playerCount} player{roomInfo.playerCount !== 1 ? "s" : ""}</span>
                  {roomInfo.status === "finished" && (
                    <span className="text-[#ff5d8f] ml-1">(Game ended)</span>
                  )}
                </div>
              )}
            </div>

            {/* Player Name */}
            <div>
              <label className="block text-sm font-semibold text-[#33312e] mb-2">
                Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => handlePlayerNameChange(e.target.value)}
                placeholder="Player name"
                maxLength={30}
                className="w-full px-4 py-3 bg-[#fff7ed] border border-[#a39a88] rounded-xl focus:ring-2 focus:ring-[#2ec4b6]/20 focus:border-[#2ec4b6] outline-none"
              />
              <button
                type="button"
                onClick={pickGuestName}
                className="mt-2 text-xs font-semibold text-[#2ec4b6] hover:text-[#2ec4b6]"
              >
                Pick a simple name
              </button>
            </div>

            {error && (
              <div className="p-3 bg-[#ff5d8f]/10 border border-[#ff5d8f]/15 rounded-xl text-[#ff5d8f] text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || roomCode.length !== 6 || roomInfo?.status === "finished"}
              className="w-full py-5 bg-[#2ec4b6] text-white rounded-2xl hover:bg-[#2ec4b6] transition font-black text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Joining..." : "Join"}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link href="/create" className="text-sm text-[#2ec4b6] hover:text-[#2ec4b6] font-medium">
            Or create your own bingo card
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function JoinGamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fff7ed] flex items-center justify-center">Loading...</div>}>
      <JoinGameContent />
    </Suspense>
  );
}
