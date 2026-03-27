"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

const BINGO_ITEMS = [
  "Typed URL wrong",
  "Broken link",
  "Page moved",
  "Ghost page",
  "Internet gremlins",
  "Forgot bookmark",
  "Clicked a 2019 link",
  "Copy-paste fail",
  "DNS hiccup",
  "Server nap",
  "Deleted by accident",
  "Alternate timeline",
  "Caffeine needed",
  "Cat walked on keyboard",
  "Mercury retrograde",
  "It's not you, it's us",
];

const WINNING_LINES = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11],
  [12, 13, 14, 15],
  [0, 4, 8, 12],
  [1, 5, 9, 13],
  [2, 6, 10, 14],
  [3, 7, 11, 15],
  [0, 5, 10, 15],
  [3, 6, 9, 12],
];

function shuffleArray(arr: string[]): string[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  return shuffled;
}

export default function NotFound() {
  const [items] = useState(() => shuffleArray(BINGO_ITEMS));
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [moveCount, setMoveCount] = useState(0);

  const checkWin = useCallback(
    (newSelected: Set<number>) => {
      for (const line of WINNING_LINES) {
        if (line.every((i) => newSelected.has(i))) {
          return line;
        }
      }
      return null;
    },
    []
  );

  const toggleCell = (index: number) => {
    if (winLine) return;
    const next = new Set(selected);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
      setMoveCount((c) => c + 1);
    }
    setSelected(next);
    const win = checkWin(next);
    if (win) setWinLine(win);
  };

  const resetGame = () => {
    setSelected(new Set());
    setWinLine(null);
    setMoveCount(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center px-4 py-12 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wide px-4 py-1.5 rounded-full mb-4">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Error 404
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">
          Page not{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
            found.
          </span>
        </h1>
        <p className="text-slate-500 text-lg max-w-md mx-auto">
          But hey, while you&apos;re here... why not play some 404 Bingo?
        </p>
      </div>

      {/* Bingo Card */}
      <div className="relative w-full max-w-sm mx-auto animate-fade-in-up">
        {/* Decorative blobs */}
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-violet-300 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-indigo-300 rounded-full blur-3xl opacity-20"></div>

        <div className="relative bg-white rounded-2xl shadow-xl shadow-indigo-500/10 p-5 border border-slate-200/80">
          {/* BINGO header */}
          <div className="text-center mb-4">
            <div className="flex justify-center gap-2 text-2xl font-black tracking-[0.2em]">
              {"BINGO".split("").map((letter, i) => (
                <span
                  key={i}
                  className="text-transparent bg-clip-text bg-gradient-to-br from-violet-600 to-indigo-600"
                >
                  {letter}
                </span>
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-semibold mt-1">
              404 Edition
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 gap-2">
            {items.map((item, i) => {
              const isSelected = selected.has(i);
              const isWinCell = winLine?.includes(i);

              return (
                <button
                  key={i}
                  onClick={() => toggleCell(i)}
                  className={`
                    aspect-square rounded-xl flex items-center justify-center p-1.5
                    text-[10px] sm:text-xs leading-tight font-semibold text-center
                    transition-all duration-200 cursor-pointer select-none
                    ${
                      isWinCell
                        ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 scale-105 ring-2 ring-emerald-300"
                        : isSelected
                        ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-sm"
                    }
                  `}
                >
                  {isWinCell ? (
                    <span className="flex flex-col items-center gap-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[9px]">{item}</span>
                    </span>
                  ) : (
                    item
                  )}
                </button>
              );
            })}
          </div>

          {/* Status */}
          <div className="mt-4 text-center">
            {winLine ? (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-emerald-700 font-bold text-sm">
                    BINGO! You won in {moveCount} moves!
                  </p>
                  <p className="text-emerald-600 text-xs mt-1">
                    Now that&apos;s a productive 404 error.
                  </p>
                </div>
                <button
                  onClick={resetGame}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Play again
                </button>
              </div>
            ) : (
              <p className="text-slate-400 text-xs font-medium">
                Get 4 in a row to win! ({selected.size}/16 selected)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center animate-fade-in-up">
        <Link
          href="/"
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Go Home
        </Link>
        <Link
          href="/templates"
          className="bg-white text-indigo-600 border-2 border-indigo-200 px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300"
        >
          Browse Templates
        </Link>
        <Link
          href="/create"
          className="text-slate-500 hover:text-indigo-600 font-semibold text-sm transition-colors"
        >
          Create a Card
        </Link>
      </div>

      {/* Footer brand */}
      <div className="mt-12 flex items-center gap-2 text-slate-400 text-sm">
        <div className="w-6 h-6 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>
        MyBingoCard
      </div>
    </div>
  );
}
