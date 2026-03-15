"use client";

import { useState } from "react";

export default function StartGameButton({ cardId }: { cardId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Failed to start live game.");
        return;
      }

      if (data.room?.roomCode) {
        window.location.href = `/game/host/${data.room.roomCode}`;
        return;
      }

      setError("Live game started, but no room code was returned.");
    } catch {
      setError("Failed to start live game.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors"
      >
        {loading ? "Starting..." : "🎮 Start Live Game"}
      </button>
      {error ? (
        <p className="text-xs text-red-600 leading-snug">{error}</p>
      ) : null}
    </div>
  );
}
