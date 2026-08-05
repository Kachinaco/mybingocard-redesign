"use client";

import { useState, useCallback } from "react";

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

export default function NotFoundBingo() {
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
    <>
      {/* Bingo Card */}
      <div className="relative w-full max-w-sm mx-auto animate-fade-in-up">
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-[#7c5cff] rounded-full blur-3xl opacity-20"></div>
        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#7c5cff] rounded-full blur-3xl opacity-20"></div>

        <div className="relative bg-white rounded-2xl shadow-xl shadow-[#7c5cff]/10 p-5 border border-[#a39a88]/80">
          <div className="text-center mb-4">
            <div className="flex justify-center gap-2 text-2xl font-black tracking-[0.2em]">
              {"BINGO".split("").map((letter, i) => (
                <span
                  key={i}
                  className="text-transparent bg-clip-text bg-gradient-to-br from-[#7c5cff] to-[#7c5cff]"
                >
                  {letter}
                </span>
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#6b6459] font-semibold mt-1">
              404 Edition
            </p>
          </div>

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
                        ? "bg-gradient-to-br from-[#2ec4b6] to-[#2ec4b6] text-white shadow-lg shadow-[#2ec4b6] scale-105 ring-2 ring-[#2ec4b6]"
                        : isSelected
                        ? "bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] text-white shadow-lg shadow-[#7c5cff] scale-[1.02]"
                        : "bg-[#fff7ed] text-[#33312e] border border-[#a39a88] hover:border-[#7c5cff] hover:bg-[#7c5cff]/50 hover:shadow-sm"
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

          <div className="mt-4 text-center">
            {winLine ? (
              <div className="space-y-3">
                <div className="bg-[#2ec4b6]/10 border border-[#2ec4b6] rounded-xl p-3">
                  <p className="text-[#2ec4b6] font-bold text-sm">
                    BINGO! You won in {moveCount} moves!
                  </p>
                  <p className="text-[#2ec4b6] text-xs mt-1">
                    Now that&apos;s a productive 404 error.
                  </p>
                </div>
                <button
                  onClick={resetGame}
                  className="text-xs font-semibold text-[#7c5cff] hover:text-[#7c5cff] transition-colors"
                >
                  Play again
                </button>
              </div>
            ) : (
              <p className="text-[#6b6459] text-xs font-medium">
                Get 4 in a row to win! ({selected.size}/16 selected)
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
