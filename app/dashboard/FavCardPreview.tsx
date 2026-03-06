"use client";

import { useEffect, useState } from "react";

interface SavedState {
  marked: number[];
}

export default function FavCardPreview({ card }: { card: any }) {
  const [savedMarks, setSavedMarks] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mybingo_state_${card._id}`);
      if (saved) {
        const state: SavedState = JSON.parse(saved);
        if (state.marked) setSavedMarks(new Set(state.marked));
      }
    } catch {}
  }, [card._id]);

  const size = card.size || 5;
  const freeSpaceIdx = card.freeSpace ? Math.floor((size * size) / 2) : -1;
  const cells = card.cells || [];

  return (
    <div className="mb-3">
      <div className="text-center mb-1.5">
        <p className="text-[7px] font-bold text-slate-600 truncate">{card.title}</p>
      </div>
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {cells.map((cell: string, index: number) => {
          const isFreeSpace = index === freeSpaceIdx;
          const isMarked = savedMarks.has(index);

          return (
            <div
              key={index}
              className={`
                aspect-square flex items-center justify-center text-center overflow-hidden font-semibold
                ${size <= 3 ? "rounded-md" : "rounded-sm"}
                ${isFreeSpace
                  ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm"
                  : isMarked
                    ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm ring-1 ring-indigo-300"
                    : "bg-slate-50 text-slate-700 border border-slate-200"
                }
              `}
              style={{
                fontSize: `${size <= 3 ? 7 : size <= 4 ? 5.5 : 4.5}px`,
                padding: "1px",
                lineHeight: 1.1,
                fontFamily: card.style?.fontFamily || "inherit",
                ...(isMarked || isFreeSpace ? {} : {
                  backgroundColor: card.style?.backgroundColor || undefined,
                  color: card.style?.textColor || undefined,
                  borderColor: card.style?.borderColor || undefined,
                }),
              }}
            >
              <span className="line-clamp-2">
                {isFreeSpace ? "\u2605" : (cell || "")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
