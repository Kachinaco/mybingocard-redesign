"use client";

import { useState } from "react";

const WORDS = [
  "Cake", "Balloon", "Gift", "Dance", "Photo",
  "Music", "Games", "Candles", "Toast", "Hat",
  "Confetti", "Prize", "FREE", "Snack", "Cheer",
  "Selfie", "Decor", "Laugh", "Wish", "Card",
  "Guest", "Song", "Treat", "Hug", "Yay!",
];

const HEADER_COLORS = ["#ff5d8f", "#ffb800", "#2ec4b6", "#7c5cff", "#ff8a3d"];

const LINES: number[][] = [];
for (let r = 0; r < 5; r++) LINES.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
for (let c = 0; c < 5; c++) LINES.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
LINES.push([0, 6, 12, 18, 24]);
LINES.push([4, 8, 12, 16, 20]);

export default function HomeDabBoard() {
  const [dabbed, setDabbed] = useState<ReadonlySet<number>>(new Set());

  const toggle = (i: number) => {
    if (i === 12) return;
    setDabbed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const won = LINES.some((line) => line.every((i) => i === 12 || dabbed.has(i)));

  return (
    <div className="relative w-full flex justify-center">
      <span className="hidden min-[421px]:inline-block absolute -top-3.5 right-[clamp(4px,2vw,14px)] bg-[#ffb800] border-2 border-[#33312e] rounded-full px-3 py-1 font-heading font-semibold text-[11px] rotate-3 shadow-[0_2px_0_#33312e] z-[2] whitespace-nowrap">
        psst — click the squares!
      </span>
      <div className="bg-white border-[3px] border-[#33312e] rounded-2xl p-3 shadow-[0_6px_0_#33312e] rotate-[1.5deg] w-[min(340px,100%)]">
        <div className="grid grid-cols-5 gap-1.5 mb-1.5">
          {"BINGO".split("").map((letter, i) => (
            <span
              key={letter}
              className="text-center font-heading font-bold text-[15px] text-white rounded-lg py-1 border-2 border-[#33312e]"
              style={{ background: HEADER_COLORS[i] }}
            >
              {letter}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {WORDS.map((word, i) => {
            const isFree = i === 12;
            const isDab = dabbed.has(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                className={`relative aspect-square border-2 border-[#33312e] rounded-lg flex items-center justify-center text-[9px] font-extrabold text-center p-0.5 select-none transition-transform ${
                  isFree ? "bg-[#ffb800] cursor-default" : isDab ? "bg-[#cdeee9]" : "bg-[#fff7ed] hover:scale-105 cursor-pointer"
                }`}
              >
                {isDab && (
                  <span className="absolute w-[58%] h-[58%] rounded-full bg-[#ff5d8f]/45 pointer-events-none" />
                )}
                <span className="relative z-[1]">{word}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2.5 text-center font-heading font-semibold text-[13px] text-[#ff5d8f] min-h-5">
          {won ? "🎉 BINGO! Now imagine this at your party." : ""}
        </div>
      </div>
    </div>
  );
}
