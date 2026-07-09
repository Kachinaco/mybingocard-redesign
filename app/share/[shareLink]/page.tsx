"use client";

import SocialShare from "@/components/SocialShare";
import ThemedCardWrapper from "@/components/ThemedCardWrapper";
import { isImageCell, parseImageCell, getCellDisplayText } from "@/lib/cellContent";
import { useTextFit } from "@/lib/useTextFit";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdUnit from "@/components/AdUnit";
import { trackClientActivity, getAnonymousId } from "@/lib/activity-client";
import {
  getBrowserStorageItem,
  removeBrowserStorageItem,
  setBrowserStorageItem,
} from "@/lib/browser-storage";
import { hashStringToSeed, shuffleBingoCells } from "@/lib/shuffle";
import {
  checkWinByGrid,
  createSeededRng,
  formatClassicCellLabel,
  generateClassicBingoCard,
  getBingoGridShape,
  getFreeSpaceIndexForGrid,
  isBlankClassicCell,
  normalizeBingoVariant,
  type BingoVariant,
} from "@/lib/classic-bingo";

interface Card {
  _id: string;
  title: string;
  description?: string;
  size: 3 | 4 | 5;
  rows?: number;
  columns?: number;
  bingoVariant?: BingoVariant;
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
  views: number;
  createdAt: string;
}

// --- localStorage persistence helpers ---
function getStorageKey(cardId: string) {
  return `bingo-state-${cardId}`;
}

function loadLocalState(cardId: string): { marked: number[]; bingo: boolean } | null {
  try {
    const raw = getBrowserStorageItem("localStorage", getStorageKey(cardId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.marked) && typeof parsed.bingo === "boolean") return parsed;
  } catch {}
  return null;
}

function saveLocalState(cardId: string, marked: Set<number>, bingo: boolean) {
  setBrowserStorageItem(
    "localStorage",
    getStorageKey(cardId),
    JSON.stringify({ marked: Array.from(marked), bingo })
  );
}

function clearLocalState(cardId: string) {
  removeBrowserStorageItem("localStorage", getStorageKey(cardId));
}

export default function SharedCardPage() {
  const params = useParams();
  const shareLink = params.shareLink as string;
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const playStartedTrackedRef = useRef(false);
  const shareViewTrackedRef = useRef(false);

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [bingo, setBingo] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stateRestored, setStateRestored] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordTitle, setPasswordTitle] = useState("");
  const [expired, setExpired] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [adFree, setAdFree] = useState(false);
  const [displayCells, setDisplayCells] = useState<string[]>([]);
  const variant = normalizeBingoVariant(card?.bingoVariant);
  const shape = card ? getBingoGridShape(card) : { rows: 5, columns: 5 };
  const activeCells = displayCells.length > 0 ? displayCells : (card?.cells ?? []);
  const freeSpaceIndex = card
    ? getFreeSpaceIndexForGrid({
        freeSpace: card.freeSpace,
        rows: shape.rows,
        columns: shape.columns,
        bingoVariant: variant,
      })
    : -1;
  const totalPlayableCells = activeCells.filter((cell) => !isBlankClassicCell(cell, variant)).length;
  const gameStartTime = useRef(Date.now());
  const shareGridRef = useRef<HTMLDivElement>(null);
  const fittedSizes = useTextFit(shareGridRef, {
    cells: activeCells,
    gridSize: (card?.size ?? 5) as 3 | 4 | 5,
    fontFamily: card?.style.fontFamily || "sans-serif",
    freeSpaceIndex: freeSpaceIndex >= 0 ? freeSpaceIndex : null,
  });

  useEffect(() => { fetchCard(); }, [shareLink]);

  useEffect(() => {
    if (!card || shareViewTrackedRef.current) return;
    shareViewTrackedRef.current = true;
    trackClientActivity("share_link_viewed", {
      cardId: card._id,
      title: card.title,
      shareLink,
      context: "shared_card",
    });
  }, [card, shareLink]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Restore persisted game state after card loads
  useEffect(() => {
    if (!card || stateRestored) return;
    const local = loadLocalState(card._id);
    if (local && local.marked.length > 0) {
      const restoredMarked = new Set<number>(local.marked);
      if (freeSpaceIndex >= 0) {
        restoredMarked.add(freeSpaceIndex);
      }
      setMarked(restoredMarked);
      setBingo(local.bingo);
    } else if (freeSpaceIndex >= 0) {
      setMarked(new Set([freeSpaceIndex]));
    }
    setStateRestored(true);
  }, [card, stateRestored, freeSpaceIndex]);

  // Compute display cells — shuffle per viewer if Premium, otherwise show original order
  useEffect(() => {
    if (!card) return;
    if (shuffleEnabled) {
      const viewerId = getAnonymousId() || "fallback";
      if (variant === "custom") {
        setDisplayCells(shuffleBingoCells(card.cells, card.size, card.freeSpace, viewerId, card._id));
      } else {
        const seed = hashStringToSeed(`${viewerId}:${card._id}:${variant}`);
        setDisplayCells(generateClassicBingoCard(variant, createSeededRng(seed)));
      }
    } else {
      setDisplayCells(card.cells);
    }
  }, [card, shuffleEnabled, variant]);

  const fetchCard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cards/share/${shareLink}`);
      const data = await response.json();

      if (response.status === 410) {
        setExpired(true);
        return;
      }

      if (!response.ok) throw new Error(data.error || "Failed to fetch card");

      if (data.requiresPassword) {
        setRequiresPassword(true);
        setPasswordTitle(data.card?.title || "");
        return;
      }

      setCard(data.card);
      setShuffleEnabled(data.shuffleEnabled || false);
      setAdFree(data.adFree || false);
    } catch (err: any) {
      setError(err.message || "Failed to load card");
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    try {
      const response = await fetch(`/api/cards/share/${shareLink}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await response.json();

      if (response.status === 410) {
        setExpired(true);
        setRequiresPassword(false);
        return;
      }

      if (response.status === 401) {
        setPasswordError("Incorrect password. Please try again.");
        return;
      }

      if (!response.ok) throw new Error(data.error || "Failed to verify password");

      setRequiresPassword(false);
      setCard(data.card);
      setShuffleEnabled(data.shuffleEnabled || false);
      setAdFree(data.adFree || false);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to verify password");
    }
  };

  const getFreeSpaceIndex = useCallback(() => freeSpaceIndex, [freeSpaceIndex]);

  const checkBingo = useCallback((markedSet: Set<number>): boolean => {
    return checkWinByGrid(
      Array.from(markedSet),
      activeCells,
      shape.rows,
      shape.columns,
      variant === "classic90" ? "one_line" : "standard",
      variant,
    );
  }, [activeCells, shape.rows, shape.columns, variant]);

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }
  };

  const toggleCell = (index: number) => {
    if (!card) return;
    const isFreeSpace = card.freeSpace && index === getFreeSpaceIndex();
    if (isFreeSpace) return;
    if (isBlankClassicCell(activeCells[index] || "", variant)) return;
    triggerHaptic();
    if (!playStartedTrackedRef.current) {
      playStartedTrackedRef.current = true;
      trackClientActivity("play_started", {
        cardId: card._id,
        title: card.title,
        gridSize: shape.columns,
        shareLink,
        context: "shared_card",
        bingoVariant: variant,
      });
    }

    setMarked(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
        setUndoStack(s => [...s, -(index + 1)]);
      } else {
        next.add(index);
        setUndoStack(s => [...s, index + 1]);
      }
      const hasBingo = checkBingo(next);
      if (hasBingo && !bingo) {
        setBingo(true);
        setShowConfetti(true);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([100, 50, 100, 50, 200]);
        }
        setTimeout(() => setShowConfetti(false), 4000);
        // Track bingo achieved
        const duration = Math.round((Date.now() - gameStartTime.current) / 1000);
        trackClientActivity("bingo_achieved", {
          cardId: card._id,
          cardTitle: card.title,
          gridSize: shape.columns,
          markedCount: next.size,
          totalCells: totalPlayableCells,
          timeToBingoSeconds: duration,
          context: "shared_card",
          bingoVariant: variant,
        });
        // Save game history for shared card plays
        fetch("/api/game-history/shared", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card._id, cardTitle: card.title, shareLink, duration }),
        }).catch(() => {});
      } else if (!hasBingo) {
        setBingo(false);
      }
      // Track cell toggle
      trackClientActivity("cell_toggled", {
        cardId: card._id,
        cellIndex: index,
        action: next.has(index) ? "marked" : "unmarked",
        markedCount: next.size,
        totalCells: totalPlayableCells,
        context: "shared_card",
        bingoVariant: variant,
      });
      // Persist game state
      saveLocalState(card._id, next, hasBingo);
      return next;
    });
  };

  const undoLast = () => {
    if (!card || undoStack.length === 0) return;
    triggerHaptic();
    const lastAction = undoStack[undoStack.length - 1]!;
    setUndoStack(s => s.slice(0, -1));
    setMarked(prev => {
      const next = new Set(prev);
      if (lastAction > 0) {
        next.delete(lastAction - 1);
      } else {
        next.add(-(lastAction) - 1);
      }
      const hasBingo = checkBingo(next);
      if (hasBingo && !bingo) { setBingo(true); }
      else if (!hasBingo) { setBingo(false); setShowConfetti(false); }
      // Persist game state
      saveLocalState(card._id, next, hasBingo);
      return next;
    });
  };

  const resetCard = () => {
    if (!card) return;
    setMarked(freeSpaceIndex >= 0 ? new Set([freeSpaceIndex]) : new Set());
    setUndoStack([]);
    setBingo(false);
    setShowConfetti(false);
    // Clear persisted state
    clearLocalState(card._id);
  };

  const toggleFullscreen = async () => {
    try {
      const entering = !document.fullscreenElement;
      if (entering) {
        await cardContainerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      trackClientActivity("fullscreen_toggled", { entered: entering });
    } catch {}
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${"bg-gradient-to-br from-slate-50 to-indigo-50"}`}>
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className={"text-slate-500"}>Loading bingo card...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">&#x23F3;</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Link Expired</h2>
          <p className="text-slate-500 mb-6">This share link has expired and is no longer available.</p>
          <Link href="/create" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold">
            Create Your Own Card
          </Link>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">&#x1F512;</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Protected</h2>
          <p className="text-slate-500 mb-6">This bingo card requires a password to view.</p>
          {passwordTitle && (
            <p className="text-lg font-semibold text-slate-700 mb-6">{passwordTitle}</p>
          )}
          <form onSubmit={submitPassword}>
            <input
              type="password"
              placeholder="Enter password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
            {passwordError && (
              <p className="text-red-500 text-sm mt-2">{passwordError}</p>
            )}
            <button
              type="submit"
              className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
            >
              View Card
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${"bg-gradient-to-br from-slate-50 to-indigo-50"}`}>
        <div className={`max-w-md w-full rounded-2xl shadow-lg p-8 text-center ${"bg-white"}`}>
          <div className="text-5xl mb-4">😕</div>
          <h2 className={`text-2xl font-bold mb-2 ${"text-slate-900"}`}>Card Not Found</h2>
          <p className={`mb-6 ${"text-slate-500"}`}>{error || "This card doesn't exist or is no longer shared."}</p>
          <Link href="/create" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold">
            Create Your Own Card
          </Link>
        </div>
      </div>
    );
  }

  const freeSpaceIdx = getFreeSpaceIndex();
  const markedCount = Array.from(marked).filter((index) =>
    !isBlankClassicCell(activeCells[index] || "", variant)
  ).length;
  const totalCells = totalPlayableCells || activeCells.length || card.cells.length;
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(currentUrl)}`;

  return (
    <div
      ref={cardContainerRef}
      className={`min-h-screen transition-colors duration-200 ${
        "bg-gradient-to-br from-slate-50 to-indigo-50"
      } ${isFullscreen ? "fullscreen-card" : ""}`}
    >
      {/* Confetti burst on BINGO */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-center animate-bounce">
            <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 drop-shadow-lg">BINGO!</div>
            <div className="text-4xl mt-2">🎉🎊🎉</div>
          </div>
        </div>
      )}

      {/* Header */}
      {!isFullscreen && (
        <header className={`backdrop-blur-sm border-b sticky top-0 z-10 print:hidden ${
          "bg-white/80 border-slate-100"
        }`}>
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
              MyBingoCard
            </Link>
            <div className="flex gap-2 items-center">
              <Link href="/create" className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-semibold text-sm">
                Create Your Own
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className="container mx-auto px-3 md:px-4 py-6 md:py-8 max-w-2xl">
        {/* Bingo Banner */}
        {bingo && !isFullscreen && (
          <div className="mb-6 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl p-6 text-center shadow-lg print:hidden">
            <div className="font-black text-2xl animate-pulse mb-3">🎉 BINGO! You won! 🎉</div>
            <p className="text-yellow-100 text-sm mb-3">Want to make your own bingo cards for your next event?</p>
            <Link href="/create" className="inline-block px-5 py-2 bg-white text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-50 transition shadow-md">
              Create Your Own Card
            </Link>
          </div>
        )}

        {/* Card */}
        <ThemedCardWrapper theme={card.style?.theme} title={card.title}>
        <div className={`rounded-2xl shadow-lg p-4 md:p-6 mb-4 print-card ${
          "bg-white"
        }`}>
          {/* Title */}
          <div className="text-center mb-4 md:mb-6">
            <h1 className={`text-xl md:text-2xl font-black ${"text-slate-900"}`}>{card.title}</h1>
            {card.description && <p className={`text-xs md:text-sm mt-1 ${"text-slate-500"}`}>{card.description}</p>}
            <p className={`text-xs mt-2 print:hidden ${"text-slate-400"}`}>Tap cells to mark • {markedCount}/{totalCells} marked</p>
          </div>

          {variant === "classic75" && (
            <div
              className="grid gap-1.5 md:gap-2 w-full mb-1 text-center text-sm md:text-base font-black text-emerald-700"
              style={{ gridTemplateColumns: `repeat(${shape.columns}, 1fr)` }}
            >
              {"BINGO".split("").map((letter) => (
                <div key={letter} className="rounded-lg bg-emerald-50 py-1">
                  {letter}
                </div>
              ))}
            </div>
          )}

          {variant === "classic90" && (
            <div
              className="grid gap-1.5 md:gap-2 w-full mb-1 text-center text-[10px] md:text-xs font-bold text-amber-700"
              style={{ gridTemplateColumns: `repeat(${shape.columns}, 1fr)` }}
            >
              {["1-9", "10s", "20s", "30s", "40s", "50s", "60s", "70s", "80-90"].map((label) => (
                <div key={label} className="rounded-md bg-amber-50 py-1">
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* Grid */}
          <div
            ref={shareGridRef}
            className="grid gap-1.5 md:gap-2 w-full bingo-grid-print"
            style={{ gridTemplateColumns: `repeat(${shape.columns}, 1fr)` }}
          >
            {activeCells.map((cell, index) => {
              const isFreeSpace = card.freeSpace && index === freeSpaceIdx;
              const isBlank = isBlankClassicCell(cell, variant);
              const isMarked = marked.has(index);
              const displayLabel = formatClassicCellLabel(cell, variant);

              return (
                <button
                  key={index}
                  onClick={() => toggleCell(index)}
                  disabled={isBlank}
                  className={`
                    aspect-square flex items-center justify-center text-center rounded-xl font-semibold transition-all duration-150 select-none touch-manipulation overflow-hidden
                    ${isBlank
                      ? "bg-amber-50/70 text-amber-300 border border-dashed border-amber-200 cursor-default"
                      : isFreeSpace
                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-indigo-200 shadow-md cursor-default"
                      : isMarked
                        ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-indigo-200 shadow-md ring-2 ring-indigo-300"
                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-95"
                    }
                  `}
                  style={{
                    fontSize: shape.columns >= 9
                      ? "clamp(0.45rem, 1.4vw, 0.8rem)"
                      : `clamp(0.55rem, ${card.size === 3 ? "3.5vw" : card.size === 4 ? "2.8vw" : "2.2vw"}, ${card.size === 3 ? "1rem" : card.size === 4 ? "0.9rem" : "0.8rem"})`,
                    padding: "4px",
                    fontFamily: card.style.fontFamily || "inherit",
                  }}
                  aria-label={isBlank ? "Blank space" : isFreeSpace ? "Free space" : `${displayLabel} - ${isMarked ? "marked" : "not marked"}`}
                >
                  {isBlank ? (
                    <span aria-hidden="true" />
                  ) : isFreeSpace ? (
                    <span className="font-black text-xs">FREE</span>
                  ) : isMarked ? (
                    <span className="flex flex-col items-center gap-0.5">
                      <span className="text-base leading-none">✓</span>
                      {isImageCell(cell) ? (
                        <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="max-w-[60%] max-h-[40%] object-contain opacity-60" />
                      ) : (
                        <span className="opacity-60 line-through leading-tight break-words text-center" style={{ fontSize: fittedSizes.has(index) ? `${fittedSizes.get(index)! * 0.55}px` : "0.6em" }}>{displayLabel}</span>
                      )}
                    </span>
                  ) : isImageCell(cell) ? (
                    <span className="flex flex-col items-center gap-0.5 w-full h-full justify-center p-1">
                      <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="max-w-full max-h-[70%] object-contain" loading="lazy" />
                      {getCellDisplayText(cell) && <span className="text-[0.55em] leading-tight text-center w-full truncate">{getCellDisplayText(cell)}</span>}
                    </span>
                  ) : (
                    <span className="break-words leading-tight text-center" style={fittedSizes.has(index) ? { fontSize: `${fittedSizes.get(index)}px` } : undefined}>{displayLabel}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Fullscreen controls */}
          {isFullscreen && (
            <div className="mt-4 flex justify-center gap-3 print:hidden">
              <button onClick={undoLast} disabled={undoStack.length === 0} className="px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm disabled:opacity-30 transition-all">↩ Undo</button>
              <button onClick={resetCard} className="px-4 py-2 bg-slate-600 text-white rounded-xl font-semibold text-sm">🔄 Reset</button>
              <button onClick={toggleFullscreen} className="px-4 py-2 bg-red-500 text-white rounded-xl font-semibold text-sm">✕ Exit</button>
            </div>
          )}

          {/* Progress bar */}
          {!isFullscreen && (
            <div className="mt-5 print:hidden">
              <div className={`h-1.5 rounded-full overflow-hidden ${"bg-slate-100"}`}>
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${(markedCount / totalCells) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Social Sharing */}
          {!isFullscreen && (
            <div className="mt-5 flex justify-center print:hidden">
              <SocialShare
                url={currentUrl}
                title={card.title}
                cardId={card._id}
              />
            </div>
          )}

          {/* Print-only QR code */}
          <div className="print-only mt-6 text-center border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500 mb-2">Play this card digitally:</p>
            <img src={qrCodeUrl} alt="QR Code" className="mx-auto" width={120} height={120} />
            <p className="text-xs text-slate-400 mt-1">{currentUrl}</p>
          </div>
        </div>
        </ThemedCardWrapper>

        {/* Action buttons */}
        {!isFullscreen && (
          <div className="flex justify-center gap-3 mb-8 print:hidden">
            <button
              onClick={undoLast}
              disabled={undoStack.length === 0}
              className={`text-sm font-medium px-4 py-2 rounded-xl transition-all disabled:opacity-30 ${
                "bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
              }`}
            >
              ↩ Undo
            </button>
            <button
              onClick={resetCard}
              className={`text-sm font-medium px-4 py-2 rounded-xl transition-all ${
                "bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
              }`}
            >
              🔄 Reset
            </button>
            <button
              onClick={toggleFullscreen}
              className={`text-sm font-medium px-4 py-2 rounded-xl transition-all ${
                "bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
              }`}
            >
              ⛶ Fullscreen
            </button>
          </div>
        )}

        {/* Ad placement on shared cards (hidden for Premium card owners) */}
        {!isFullscreen && !adFree && (
          <div className="mb-6 print:hidden">
            <AdUnit slot="shared-card" format="horizontal" className="rounded-xl overflow-hidden" />
          </div>
        )}

        {/* Upgrade CTA for non-shuffled cards */}
        {!isFullscreen && !shuffleEnabled && (
          <div className="mb-6 text-center text-sm text-slate-400 print:hidden">
            <p>Everyone sees the same card layout.</p>
            <Link href="/pricing" className="text-indigo-500 hover:underline font-medium">
              Upgrade to Premium
            </Link>{" "}
            for unique cards per viewer.
          </div>
        )}

        {/* CTA */}
        {!isFullscreen && (
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl shadow-lg p-8 text-center print:hidden">
            <h2 className="text-xl font-black mb-2">Create Your Own Bingo Card</h2>
            <p className="text-indigo-100 mb-6 text-sm">
              Design custom bingo cards in seconds. Perfect for parties, classrooms, and team events.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/create" className="px-5 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition font-semibold text-sm">
                Create a Card
              </Link>
              <Link href="/templates" className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 transition font-semibold text-sm">
                Browse Templates
              </Link>
            </div>
          </div>
        )}
      </main>

      {!isFullscreen && (
        <footer className={`text-center text-xs py-6 print:hidden ${"text-slate-400"}`}>
          © {new Date().getFullYear()} MyBingoCard.com
        </footer>
      )}
    </div>
  );
}
