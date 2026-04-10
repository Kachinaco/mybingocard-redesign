"use client";

import ThemedCardWrapper from "@/components/ThemedCardWrapper";
import { isImageCell, parseImageCell, getCellDisplayText } from "@/lib/cellContent";
import { useTextFit } from "@/lib/useTextFit";
import { useState, useEffect, useCallback, useRef } from "react";
import { trackClientActivity } from "@/lib/activity-client";

export interface PlayCardData {
  _id: string;
  title: string;
  description?: string;
  size: 3 | 4 | 5;
  cells: string[];
  freeSpace: boolean;
  style: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: string;
    fontFamily?: string;
    headerText?: string;
    footerText?: string;
    theme?: string;
  };
}

interface PlayCardProps {
  linkId: string;
  card: PlayCardData;
  onBingo?: () => void;
}

function getStorageKey(linkId: string) {
  return `bingo-play-state-${linkId}`;
}

function loadLocalState(
  linkId: string,
  size: number,
): { marked: number[]; bingo: boolean } | null {
  try {
    const raw = localStorage.getItem(getStorageKey(linkId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.marked) || typeof parsed.bingo !== "boolean") return null;

    // Reject tampered or stale state. Every index must be an integer in
    // [0, size*size) — anything else gets discarded so we start from scratch.
    const total = size * size;
    const sanitized: number[] = [];
    const seen = new Set<number>();
    for (const idx of parsed.marked) {
      if (
        typeof idx !== "number" ||
        !Number.isInteger(idx) ||
        idx < 0 ||
        idx >= total ||
        seen.has(idx)
      ) {
        return null;
      }
      seen.add(idx);
      sanitized.push(idx);
    }

    return { marked: sanitized, bingo: parsed.bingo };
  } catch {}
  return null;
}

function saveLocalState(linkId: string, marked: Set<number>, bingo: boolean) {
  try {
    localStorage.setItem(
      getStorageKey(linkId),
      JSON.stringify({ marked: Array.from(marked), bingo }),
    );
  } catch {}
}

function clearLocalState(linkId: string) {
  try {
    localStorage.removeItem(getStorageKey(linkId));
  } catch {}
}

export default function PlayCard({ linkId, card, onBingo }: PlayCardProps) {
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gameStartTime = useRef(Date.now());

  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [bingo, setBingo] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stateRestored, setStateRestored] = useState(false);

  // Tracks the latest bingo value for closures inside setMarked. React batches
  // updates and the state setter closure can see a stale `bingo`, which caused
  // the celebration event to fire twice in quick succession.
  const bingoRef = useRef(bingo);
  useEffect(() => {
    bingoRef.current = bingo;
  }, [bingo]);

  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending confetti timeout if the component unmounts mid-celebration.
  useEffect(() => {
    return () => {
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
        confettiTimerRef.current = null;
      }
    };
  }, []);

  const fittedSizes = useTextFit(gridRef, {
    cells: card.cells,
    gridSize: card.size,
    fontFamily: card.style.fontFamily || "sans-serif",
    freeSpaceIndex: card.freeSpace ? Math.floor((card.size * card.size) / 2) : null,
  });

  // Track fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Restore persisted state once
  useEffect(() => {
    if (stateRestored) return;
    const local = loadLocalState(linkId, card.size);
    if (local && local.marked.length > 0) {
      const restoredMarked = new Set<number>(local.marked);
      if (card.freeSpace) {
        restoredMarked.add(Math.floor((card.size * card.size) / 2));
      }
      setMarked(restoredMarked);
      setBingo(local.bingo);
    } else if (card.freeSpace) {
      setMarked(new Set([Math.floor((card.size * card.size) / 2)]));
    }
    setStateRestored(true);
  }, [linkId, card, stateRestored]);

  const getFreeSpaceIndex = useCallback(() => {
    if (!card.freeSpace) return -1;
    return Math.floor((card.size * card.size) / 2);
  }, [card]);

  const checkBingo = useCallback((markedSet: Set<number>, size: number): boolean => {
    const grid = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => markedSet.has(r * size + c)),
    );
    for (let r = 0; r < size; r++) {
      if (grid[r]?.every(Boolean)) return true;
    }
    for (let c = 0; c < size; c++) {
      if (grid.map((row) => row[c] ?? false).every(Boolean)) return true;
    }
    if (Array.from({ length: size }, (_, i) => grid[i]?.[i] ?? false).every(Boolean)) return true;
    if (Array.from({ length: size }, (_, i) => grid[i]?.[size - 1 - i] ?? false).every(Boolean))
      return true;
    return false;
  }, []);

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }
  };

  const toggleCell = (index: number) => {
    const isFreeSpace = card.freeSpace && index === getFreeSpaceIndex();
    if (isFreeSpace) return;
    triggerHaptic();

    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
        setUndoStack((s) => [...s, -(index + 1)]);
      } else {
        next.add(index);
        setUndoStack((s) => [...s, index + 1]);
      }
      const hasBingo = checkBingo(next, card.size);
      // Use the ref instead of closed-over `bingo` to avoid double-firing
      // when React batches multiple updates in the same tick.
      if (hasBingo && !bingoRef.current) {
        bingoRef.current = true;
        setBingo(true);
        setShowConfetti(true);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([100, 50, 100, 50, 200]);
        }
        if (confettiTimerRef.current) {
          clearTimeout(confettiTimerRef.current);
        }
        confettiTimerRef.current = setTimeout(() => {
          setShowConfetti(false);
          confettiTimerRef.current = null;
        }, 4000);
        const duration = Math.round((Date.now() - gameStartTime.current) / 1000);
        trackClientActivity("share_link_bingo", {
          linkId,
          cardId: card._id,
          cardTitle: card.title,
          gridSize: card.size,
          markedCount: next.size,
          totalCells: card.size * card.size,
          timeToBingoSeconds: duration,
        });
        trackClientActivity("bingo_achieved", {
          cardId: card._id,
          cardTitle: card.title,
          gridSize: card.size,
          markedCount: next.size,
          totalCells: card.size * card.size,
          timeToBingoSeconds: duration,
          context: "play_link",
          linkId,
        });
        onBingo?.();
      } else if (!hasBingo && bingoRef.current) {
        bingoRef.current = false;
        setBingo(false);
      }
      trackClientActivity("cell_toggled", {
        cardId: card._id,
        cellIndex: index,
        action: next.has(index) ? "marked" : "unmarked",
        markedCount: next.size,
        totalCells: card.size * card.size,
        context: "play_link",
        linkId,
      });
      saveLocalState(linkId, next, hasBingo);
      return next;
    });
  };

  const undoLast = () => {
    if (undoStack.length === 0) return;
    triggerHaptic();
    const lastAction = undoStack[undoStack.length - 1]!;
    setUndoStack((s) => s.slice(0, -1));
    setMarked((prev) => {
      const next = new Set(prev);
      if (lastAction > 0) {
        next.delete(lastAction - 1);
      } else {
        next.add(-lastAction - 1);
      }
      const hasBingo = checkBingo(next, card.size);
      if (hasBingo && !bingoRef.current) {
        bingoRef.current = true;
        setBingo(true);
      } else if (!hasBingo && bingoRef.current) {
        bingoRef.current = false;
        setBingo(false);
        setShowConfetti(false);
        if (confettiTimerRef.current) {
          clearTimeout(confettiTimerRef.current);
          confettiTimerRef.current = null;
        }
      }
      saveLocalState(linkId, next, hasBingo);
      return next;
    });
  };

  const resetCard = () => {
    const freeIdx = card.freeSpace ? Math.floor((card.size * card.size) / 2) : -1;
    setMarked(freeIdx >= 0 ? new Set([freeIdx]) : new Set());
    setUndoStack([]);
    bingoRef.current = false;
    setBingo(false);
    setShowConfetti(false);
    if (confettiTimerRef.current) {
      clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = null;
    }
    clearLocalState(linkId);
  };

  const toggleFullscreen = async () => {
    try {
      const entering = !document.fullscreenElement;
      if (entering) {
        await cardContainerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      trackClientActivity("fullscreen_toggled", { entered: entering, context: "play_link", linkId });
    } catch {}
  };

  const freeSpaceIdx = getFreeSpaceIndex();
  const markedCount = marked.size;
  const totalCells = card.size * card.size;

  return (
    <div
      ref={cardContainerRef}
      className={`transition-colors duration-200 ${isFullscreen ? "fullscreen-card min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center" : ""}`}
    >
      {/* Confetti burst on BINGO */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-center animate-bounce">
            <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 drop-shadow-lg">
              BINGO!
            </div>
            <div className="text-4xl mt-2">🎉🎊🎉</div>
          </div>
        </div>
      )}

      {/* Bingo Banner */}
      {bingo && !isFullscreen && (
        <div className="mb-6 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl p-6 text-center shadow-lg">
          <div className="font-black text-2xl animate-pulse mb-1">🎉 BINGO! You won! 🎉</div>
          <p className="text-yellow-100 text-sm">Nice work — keep marking or reset to play again.</p>
        </div>
      )}

      <ThemedCardWrapper theme={card.style?.theme} title={card.title}>
        <div className="rounded-2xl shadow-lg p-4 md:p-6 mb-4 bg-white">
          {/* Title */}
          <div className="text-center mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-black text-slate-900">{card.title}</h1>
            {card.description && (
              <p className="text-xs md:text-sm mt-1 text-slate-500">{card.description}</p>
            )}
            <p className="text-xs mt-2 text-slate-400">
              Tap cells to mark • {markedCount}/{totalCells} marked
            </p>
          </div>

          {/* Grid */}
          <div
            ref={gridRef}
            className="grid gap-1.5 md:gap-2 w-full"
            style={{ gridTemplateColumns: `repeat(${card.size}, 1fr)` }}
          >
            {card.cells.map((cell, index) => {
              const isFreeSpace = card.freeSpace && index === freeSpaceIdx;
              const isMarked = marked.has(index);

              return (
                <button
                  key={index}
                  onClick={() => toggleCell(index)}
                  className={`
                    aspect-square flex items-center justify-center text-center rounded-xl font-semibold transition-all duration-150 select-none touch-manipulation overflow-hidden
                    ${
                      isFreeSpace
                        ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-indigo-200 shadow-md cursor-default"
                        : isMarked
                          ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-indigo-200 shadow-md ring-2 ring-indigo-300"
                          : "bg-slate-50 text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-95"
                    }
                  `}
                  style={{
                    fontSize: `clamp(0.55rem, ${card.size === 3 ? "3.5vw" : card.size === 4 ? "2.8vw" : "2.2vw"}, ${card.size === 3 ? "1rem" : card.size === 4 ? "0.9rem" : "0.8rem"})`,
                    padding: "4px",
                    fontFamily: card.style.fontFamily || "inherit",
                  }}
                  aria-label={
                    isFreeSpace ? "Free space" : `${cell} - ${isMarked ? "marked" : "not marked"}`
                  }
                >
                  {isFreeSpace ? (
                    <span className="font-black text-xs">FREE</span>
                  ) : isMarked ? (
                    <span className="flex flex-col items-center gap-0.5">
                      <span className="text-base leading-none">✓</span>
                      {isImageCell(cell) ? (
                        <img
                          src={parseImageCell(cell)?.imageUrl}
                          alt={getCellDisplayText(cell)}
                          className="max-w-[60%] max-h-[40%] object-contain opacity-60"
                        />
                      ) : (
                        <span
                          className="opacity-60 line-through leading-tight break-words text-center"
                          style={{
                            fontSize: fittedSizes.has(index)
                              ? `${fittedSizes.get(index)! * 0.55}px`
                              : "0.6em",
                          }}
                        >
                          {cell}
                        </span>
                      )}
                    </span>
                  ) : isImageCell(cell) ? (
                    <span className="flex flex-col items-center gap-0.5 w-full h-full justify-center p-1">
                      <img
                        src={parseImageCell(cell)?.imageUrl}
                        alt={getCellDisplayText(cell)}
                        className="max-w-full max-h-[70%] object-contain"
                        loading="lazy"
                      />
                      {getCellDisplayText(cell) && (
                        <span className="text-[0.55em] leading-tight text-center w-full truncate">
                          {getCellDisplayText(cell)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span
                      className="break-words leading-tight text-center"
                      style={
                        fittedSizes.has(index)
                          ? { fontSize: `${fittedSizes.get(index)}px` }
                          : undefined
                      }
                    >
                      {cell}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Fullscreen controls */}
          {isFullscreen && (
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={undoLast}
                disabled={undoStack.length === 0}
                className="px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm disabled:opacity-30 transition-all"
              >
                ↩ Undo
              </button>
              <button
                onClick={resetCard}
                className="px-4 py-2 bg-slate-600 text-white rounded-xl font-semibold text-sm"
              >
                🔄 Reset
              </button>
              <button
                onClick={toggleFullscreen}
                className="px-4 py-2 bg-red-500 text-white rounded-xl font-semibold text-sm"
              >
                ✕ Exit
              </button>
            </div>
          )}

          {/* Progress bar */}
          {!isFullscreen && (
            <div className="mt-5">
              <div className="h-1.5 rounded-full overflow-hidden bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${(markedCount / totalCells) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </ThemedCardWrapper>

      {/* Action buttons */}
      {!isFullscreen && (
        <div className="flex justify-center gap-3 mb-2">
          <button
            onClick={undoLast}
            disabled={undoStack.length === 0}
            className="text-sm font-medium px-4 py-2 rounded-xl transition-all disabled:opacity-30 bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            ↩ Undo
          </button>
          <button
            onClick={resetCard}
            className="text-sm font-medium px-4 py-2 rounded-xl transition-all bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            🔄 Reset
          </button>
          <button
            onClick={toggleFullscreen}
            className="text-sm font-medium px-4 py-2 rounded-xl transition-all bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            ⛶ Fullscreen
          </button>
        </div>
      )}
    </div>
  );
}
