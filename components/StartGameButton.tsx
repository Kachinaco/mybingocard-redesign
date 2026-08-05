"use client";

import { useState } from "react";
import { trackClientActivity } from "@/lib/activity-client";
import { redirectToCheckout } from "@/lib/upgrade";

export default function StartGameButton({
  cardId,
  label = "Play with friends",
  className = "",
  compact = false,
}: {
  cardId: string;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
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
        trackClientActivity("game_create_failed", {
          cardId,
          error: data.error || "Failed to start live game.",
          upgradeRequired: Boolean(data.upgradeRequired || data.trialRequired),
        });
        if (data.upgradeRequired || data.trialRequired) {
          await redirectToCheckout({
            label: "Premium monthly, $7.99/mo",
            successPath: `${window.location.pathname}${window.location.search}`,
          });
          return;
        }
        setError(data.error || "Failed to start live game.");
        return;
      }

      if (data.room?.roomCode) {
        trackClientActivity("game_create_clicked", {
          cardId,
          roomCode: data.room.roomCode,
        });
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
        className={`${className || "w-full"} flex items-center justify-center gap-2 ${compact ? "px-2.5 py-2 text-xs sm:text-sm" : "px-5 py-3 text-base"} bg-[#2ec4b6] hover:bg-[#2ec4b6] disabled:opacity-60 text-white font-bold ${compact ? "rounded-lg" : "rounded-xl"} transition-colors`}
      >
        <svg className={compact ? "h-4 w-4" : "h-5 w-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {loading ? "Starting..." : label}
      </button>
      {error ? (
        <p className="text-xs text-[#ff5d8f] leading-snug">{error}</p>
      ) : null}
    </div>
  );
}
