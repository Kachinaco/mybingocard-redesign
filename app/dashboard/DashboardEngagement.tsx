"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isImageCell, parseImageCell } from "@/lib/cellContent";
import ThemedCardWrapper from "@/components/ThemedCardWrapper";
import { getBrowserStorageItem, setBrowserStorageItem } from "@/lib/browser-storage";

interface RecentlyPlayedItem {
  cardId: string;
  cardName: string;
  lastPlayed: string;
}

interface SavedState {
  marked: number[];
  bingo: boolean;
}

function MiniCardPreview({ cardId }: { cardId: string }) {
  const [state, setState] = useState<SavedState | null>(null);
  const [cardData, setCardData] = useState<any>(null);

  useEffect(() => {
    try {
      const saved = getBrowserStorageItem("localStorage", `mybingo_state_${cardId}`);
      if (saved) setState(JSON.parse(saved));
    } catch {}
    // Fetch card data for cells and size
    fetch(`/api/cards/${cardId}`)
      .then(r => r.json())
      .then(d => { if (d.card) setCardData(d.card); })
      .catch(() => {});
  }, [cardId]);

  const markedSet = new Set(state?.marked || []);
  const size = cardData?.size || 5;
  const cells = cardData?.cells || [];
  const freeSpaceIdx = cardData?.freeSpace ? Math.floor((size * size) / 2) : -1;

  if (!cardData) {
    // Fallback: simple dot grid while loading
    return (
      <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(5, 1fr)` }}>
        {Array.from({ length: 25 }, (_, i) => (
          <div key={i} className={"aspect-square rounded-sm " + (markedSet.has(i) ? "bg-indigo-500" : "bg-slate-200")} />
        ))}
      </div>
    );
  }

  return (
    <ThemedCardWrapper theme={cardData?.style?.theme} title={cardData?.title || ""} size="mini">
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
      {cells.map((cell: string, index: number) => {
        const isFreeSpace = index === freeSpaceIdx;
        const isMarked = markedSet.has(index);
        return (
          <div
            key={index}
            className={`aspect-square flex items-center justify-center text-center overflow-hidden font-semibold rounded-sm
              ${isFreeSpace
                ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                : isMarked
                  ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white ring-1 ring-indigo-300"
                  : "bg-slate-50 text-slate-700 border border-slate-200"
              }`}
            style={{ fontSize: `${size <= 3 ? 6 : size <= 4 ? 4.5 : 3.5}px`, padding: "1px", lineHeight: 1.1 }}
          >
            {isFreeSpace ? (
              <span className="line-clamp-2">★</span>
            ) : isImageCell(cell) ? (
              <img src={parseImageCell(cell)?.imageUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
            ) : (
              <span className="line-clamp-2">{cell || ""}</span>
            )}
          </div>
        );
      })}
    </div>
    </ThemedCardWrapper>
  );
}

export default function DashboardEngagement() {
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayedItem[]>([]);

  useEffect(() => {
    try {
      const stored = getBrowserStorageItem("localStorage", "mybingo_recently_played");
      if (stored) {
        const items: RecentlyPlayedItem[] = JSON.parse(stored);
        // Validate each card still exists, remove stale entries
        Promise.all(
          items.map((item) =>
            fetch(`/api/cards/${item.cardId}`)
              .then((r) => (r.ok ? item : null))
              .catch(() => null)
          )
        ).then((results) => {
          const valid = results.filter(Boolean) as RecentlyPlayedItem[];
          setRecentlyPlayed(valid);
          // Update localStorage to remove stale entries
          if (valid.length !== items.length) {
            setBrowserStorageItem("localStorage", "mybingo_recently_played", JSON.stringify(valid));
          }
        });
      }
    } catch {}
  }, []);

  if (recentlyPlayed.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-10 animate-fade-in-up animation-delay-250">
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Recently Played
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentlyPlayed.map((item) => (
          <Link
            key={item.cardId}
            href={`/cards/${item.cardId}`}
            className="group p-4 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                  {item.cardName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(item.lastPlayed).toLocaleDateString()}
                </p>
              </div>
              <span className="ml-3 text-xs font-medium text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors">
                Resume
              </span>
            </div>
            <div className="w-20 h-20 mx-auto">
              <MiniCardPreview cardId={item.cardId} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
