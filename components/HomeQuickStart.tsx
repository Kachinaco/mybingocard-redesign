"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type GridSize = 3 | 4 | 5;

const DEFAULT_TITLE = "Baby Shower Bingo";
const DEFAULT_SQUARES = [
  "Diapers",
  "Blanket",
  "Bottles",
  "Onesie",
  "Wipes",
  "Pacifier",
  "Baby book",
  "Stuffed toy",
  "Gift card",
  "Rattle",
  "Tiny socks",
  "Baby monitor",
];

const GRID_SIZES: GridSize[] = [3, 4, 5];

function cleanSquares(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildCells(items: string[], size: GridSize) {
  const total = size * size;
  const center = Math.floor(total / 2);
  const cells = Array(total).fill("");
  let itemIndex = 0;

  for (let index = 0; index < total; index += 1) {
    if (index === center) {
      cells[index] = "FREE";
    } else {
      cells[index] = items[itemIndex] || "";
      itemIndex += 1;
    }
  }

  return cells;
}

export default function HomeQuickStart() {
  const router = useRouter();
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [squareText, setSquareText] = useState(DEFAULT_SQUARES.join("\n"));
  const [size, setSize] = useState<GridSize>(3);

  const squareItems = useMemo(() => cleanSquares(squareText), [squareText]);
  const cells = useMemo(() => buildCells(squareItems, size), [squareItems, size]);
  const filledCount = cells.filter((cell) => cell.trim()).length;

  const handleGenerate = () => {
    const nextTitle = title.trim() || "Custom Bingo";
    const nextCells = buildCells(squareItems, size);
    const params = new URLSearchParams({
      templateId: "homepage-quick-start",
      title: nextTitle,
      size: size.toString(),
      cells: JSON.stringify(nextCells),
      freeSpace: "true",
      style: JSON.stringify({
        backgroundColor: "#ffffff",
        textColor: "#0f172a",
        borderColor: "#c7d2fe",
        fontFamily: "Arial",
        fontSize: size === 5 ? "14px" : "16px",
      }),
    });

    router.push(`/create?${params.toString()}`);
  };

  return (
    <div className="relative animate-fade-in-up animation-delay-200">
      <div className="relative bg-white rounded-2xl shadow-2xl shadow-[#7c5cff]/10 border border-[#7c5cff]/15 overflow-hidden">
        <div className="border-b border-[#fff7ed] px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#7c5cff]">Quick Start</p>
            <h2 className="text-lg font-bold text-[#33312e]">Make your first card</h2>
          </div>
          <div className="flex rounded-xl border border-[#a39a88] bg-[#fff7ed] p-1" aria-label="Grid size">
            {GRID_SIZES.map((gridSize) => (
              <button
                key={gridSize}
                type="button"
                onClick={() => setSize(gridSize)}
                className={`h-9 min-w-12 rounded-lg px-3 text-sm font-bold transition-colors ${
                  size === gridSize
                    ? "bg-[#7c5cff] text-white shadow-sm"
                    : "text-[#33312e] hover:bg-white"
                }`}
              >
                {gridSize}x{gridSize}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_0.92fr]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#33312e]">Card title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-[#a39a88] bg-[#fff7ed] px-4 py-3 text-sm font-semibold text-[#33312e] outline-none transition focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/15"
                placeholder="Baby Shower Bingo"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#33312e]">Square ideas</span>
              <textarea
                value={squareText}
                onChange={(event) => setSquareText(event.target.value)}
                rows={7}
                className="min-h-[170px] w-full resize-none rounded-xl border border-[#a39a88] bg-[#fff7ed] px-4 py-3 text-sm leading-6 text-[#33312e] outline-none transition focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/15"
                placeholder="Paste words or phrases, one per line"
              />
            </label>

            <button
              type="button"
              onClick={handleGenerate}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#7c5cff] px-5 py-4 text-base font-bold text-white shadow-lg shadow-[#7c5cff]/25 transition hover:-translate-y-0.5 hover:shadow-[#7c5cff]/35"
            >
              <svg className="h-5 w-5 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Generate Card
            </button>
          </div>

          <div className="rounded-2xl bg-[#fff7ed] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-[#33312e] truncate">{title || "Custom Bingo"}</div>
              <div className="shrink-0 text-xs font-semibold text-[#6b6459]">{filledCount}/{size * size}</div>
            </div>
            <div
              className="grid gap-1.5 rounded-xl bg-white p-2 shadow-sm"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
              aria-label="Bingo card preview"
            >
              {cells.map((cell, index) => (
                <div
                  key={`${index}-${cell}`}
                  className={`aspect-square rounded-lg border p-1 text-center text-[9px] font-semibold leading-tight flex items-center justify-center overflow-hidden ${
                    cell === "FREE"
                      ? "border-[#7c5cff] bg-[#7c5cff] text-white"
                      : "border-[#7c5cff]/15 bg-white text-[#33312e]"
                  }`}
                >
                  {cell || " "}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-[#6b6459]">
              Use at least {size * size - 1} ideas for a full {size}x{size} card.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
