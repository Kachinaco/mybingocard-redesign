"use client";

import { useState } from "react";

export default function LiveGamesBanner() {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  const handleNotify = async () => {
    setState("loading");
    try {
      await fetch("/api/waitlist/live-games", { method: "POST" });
      setState("done");
    } catch {
      setState("done");
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="text-3xl">🎯</div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-slate-900 text-sm">Live Multiplayer Games</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Coming Soon</span>
          </div>
          <p className="text-slate-500 text-sm">Host real-time bingo games with friends, family, or your team — everyone plays from their phone.</p>
        </div>
      </div>
      {state === "done" ? (
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          You&apos;re on the list!
        </div>
      ) : (
        <button
          onClick={handleNotify}
          disabled={state === "loading"}
          className="shrink-0 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
        >
          {state === "loading" ? "Saving..." : "Notify me when it's ready"}
        </button>
      )}
    </div>
  );
}
