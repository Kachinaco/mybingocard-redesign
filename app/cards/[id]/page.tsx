"use client";

import { trackCardPrinted } from "@/lib/analytics";
import SocialShare from "@/components/SocialShare";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import AdUnit from "@/components/AdUnit";
import FavoriteButton from "@/components/FavoriteButton";

interface Card {
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
  };
  isPublic: boolean;
  shareLink?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserPlan {
  planType: string;
  canExportHD: boolean;
  canRemoveBranding: boolean;
}

export default function CardViewPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.id as string;
  const cardRef = useRef<HTMLDivElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);
  const [pdfGrayscale, setPdfGrayscale] = useState(false);
  const [pdfCopies, setPdfCopies] = useState(1);
  const [activeTab, setActiveTab] = useState<"play" | "export">("play");
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [bingo, setBingo] = useState(false);
  const [showBingo, setShowBingo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [barExpanded, setBarExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status || "loading";
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const gameStartTime = useRef(Date.now());

  useEffect(() => { fetchCard(); }, [cardId]);
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) fetchUserPlan();
  }, [status, session]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);


  // Track recently played in localStorage
  useEffect(() => {
    if (!card) return;
    try {
      const key = "mybingo_recently_played";
      const stored = JSON.parse(localStorage.getItem(key) || "[]");
      const filtered = stored.filter((i: any) => i.cardId !== card._id);
      filtered.unshift({ cardId: card._id, cardName: card.title, lastPlayed: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)));
    } catch {}
  }, [card]);
  const fetchCard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cards/${cardId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch card");
      setCard(data.card);
      // Restore saved game state from localStorage
      try {
        const saved = localStorage.getItem(`mybingo_state_${cardId}`);
        if (saved) {
          const state = JSON.parse(saved);
          if (state.marked && Array.isArray(state.marked)) {
            setMarked(new Set(state.marked));
            if (state.bingo) { setBingo(true); }
            if (state.undoStack) { setUndoStack(state.undoStack); }
            return;
          }
        }
      } catch {}
      if (data.card?.freeSpace) {
        const freeIdx = Math.floor((data.card.size * data.card.size) / 2);
        setMarked(new Set([freeIdx]));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load card");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPlan = async () => {
    try {
      const response = await fetch("/api/user/plan");
      const data = await response.json();
      if (data.plan) {
        setUserPlan({
          planType: data.plan.planType,
          canExportHD: data.plan.features.includes("Export HD quality (2400px)"),
          canRemoveBranding: data.plan.features.includes("Remove MyBingoCard.com branding"),
        });
      }
    } catch {}
  };

  const getFreeSpaceIndex = useCallback(() => {
    if (!card?.freeSpace) return -1;
    return Math.floor((card.size * card.size) / 2);
  }, [card]);

  const checkBingo = useCallback((markedSet: Set<number>, size: number): boolean => {
    const grid = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => markedSet.has(r * size + c))
    );
    for (let r = 0; r < size; r++) { if (grid[r]?.every(Boolean)) return true; }
    for (let c = 0; c < size; c++) { if (grid.map(row => row[c] ?? false).every(Boolean)) return true; }
    if (Array.from({ length: size }, (_, i) => grid[i]?.[i] ?? false).every(Boolean)) return true;
    if (Array.from({ length: size }, (_, i) => grid[i]?.[size - 1 - i] ?? false).every(Boolean)) return true;
    return false;
  }, []);

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }
  };

  const toggleCell = (index: number) => {
    if (!card) return;
    if (card.freeSpace && index === getFreeSpaceIndex()) return;
    triggerHaptic();
    setMarked(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
        setUndoStack(s => [...s, -(index + 1)]);
      } else {
        next.add(index);
        setUndoStack(s => [...s, index + 1]);
      }
      // Save to localStorage
      try { localStorage.setItem(`mybingo_state_${cardId}`, JSON.stringify({ marked: Array.from(next), bingo: checkBingo(next, card.size), undoStack: [...(undoStack || []), next.has(index) ? index + 1 : -(index + 1)], timestamp: Date.now() })); } catch {}
      const hasBingo = checkBingo(next, card.size);
      if (hasBingo && !bingo) {
        setBingo(true);
        setShowBingo(true);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([100, 50, 100, 50, 200]);
        }
        setTimeout(() => setShowBingo(false), 4000);
        // Save game history
        const duration = Math.round((Date.now() - gameStartTime.current) / 1000);
        fetch("/api/game-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card._id, cardName: card.title, won: true, duration }),
        }).catch(() => {});
      } else if (!hasBingo) {
        setBingo(false);
      }
      return next;
    });
  };

  const undoLast = () => {
    if (!card || undoStack.length === 0) return;
    triggerHaptic();
    const lastAction = undoStack[undoStack.length - 1] as number;
    setUndoStack(s => s.slice(0, -1));
    setMarked(prev => {
      const next = new Set(prev);
      if (lastAction > 0) {
        next.delete(lastAction - 1);
      } else {
        next.add(-(lastAction) - 1);
      }
      const hasBingo = checkBingo(next, card.size);
      if (hasBingo && !bingo) {
        setBingo(true);
      } else if (!hasBingo) {
        setBingo(false);
        setShowBingo(false);
      }
      // Save to localStorage
      try { localStorage.setItem(`mybingo_state_${cardId}`, JSON.stringify({ marked: Array.from(next), bingo: checkBingo(next, card.size), undoStack: undoStack.slice(0, -1), timestamp: Date.now() })); } catch {}
      return next;
    });
  };

  const resetGame = () => {
    if (!card) return;
    const freeIdx = card.freeSpace ? Math.floor((card.size * card.size) / 2) : -1;
    setMarked(freeIdx >= 0 ? new Set([freeIdx]) : new Set());
    setUndoStack([]);
    setBingo(false);
    setShowBingo(false);
    try { localStorage.removeItem(`mybingo_state_${cardId}`); } catch {}
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await cardContainerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      trackCardPrinted(cardId, "print");
      window.print();
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting("pdf");
      const response = await fetch(`/api/cards/${cardId}/export/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grayscale: pdfGrayscale, copies: pdfCopies }),
      });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || "Failed"); }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${card?.title || "bingo-card"}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err: any) { alert(err.message || "Failed to export PDF"); }
    finally { setExporting(null); }
  };

  const handleExportPNG = async () => {
    try {
      setExporting("png");
      const response = await fetch(`/api/cards/${cardId}/export/png`, { method: "POST" });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || "Failed"); }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${card?.title || "bingo-card"}.png`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err: any) { alert(err.message || "Failed to export PNG"); }
    finally { setExporting(null); }
  };

  const copyShareLink = async () => {
    if (card?.shareLink) {
      const url = `${window.location.origin}/share/${card.shareLink}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateShareLink = async () => {
    if (!card) return;
    try {
      setGeneratingLink(true);
      const response = await fetch(`/api/cards/${cardId}/share`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate link");
      setCard({ ...card, shareLink: data.shareLink, isPublic: true });
      const url = `${window.location.origin}/share/${data.shareLink}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      alert(err.message || "Failed to generate share link");
    } finally {
      setGeneratingLink(false);
    }
  };

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${"bg-slate-50"}`}>
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className={"text-slate-500"}>Loading card...</p>
      </div>
    </div>
  );

  if (error || !card) return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${"bg-slate-50"}`}>
      <div className={`max-w-md w-full rounded-2xl shadow p-8 text-center ${"bg-white"}`}>
        <div className="text-5xl mb-4">😕</div>
        <h2 className={`text-2xl font-bold mb-2 ${"text-slate-900"}`}>Card Not Found</h2>
        <p className={`mb-6 ${"text-slate-500"}`}>{error}</p>
        <Link href="/dashboard/cards" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold">Back to My Cards</Link>
      </div>
    </div>
  );

  const freeSpaceIdx = getFreeSpaceIndex();
  const totalCells = card.size * card.size;
  const shareUrl = card.shareLink ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${card.shareLink}` : "";
  const qrCodeUrl = shareUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}` : "";

  return (
    <div
      ref={cardContainerRef}
      className={`min-h-screen transition-colors duration-200 ${
        "bg-slate-50 text-slate-900"
      } ${isFullscreen ? "fullscreen-card" : ""}`}
    >
      {showBingo && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-center animate-bounce">
            <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 drop-shadow-lg">BINGO!</div>
            <div className="text-4xl mt-2">🎉🎊🎉</div>
          </div>
        </div>
      )}

      {!isFullscreen && (
        <header className={`border-b sticky top-0 z-10 print:hidden ${
          "bg-white border-slate-100"
        }`}>
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/dashboard" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
              MyBingoCard
            </Link>
            <div className="flex gap-2 items-center">
              <FavoriteButton cardId={card._id} />
              <Link href={`/create?cardId=${card._id}`} className={`px-4 py-2 text-sm border rounded-lg font-medium transition-colors ${
                "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}>
                Edit
              </Link>
              <Link href="/dashboard/cards" className={`hidden sm:inline px-4 py-2 text-sm transition-colors ${
                "text-slate-500 hover:text-slate-700"
              }`}>
                ← My Cards
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className={`container mx-auto px-4 py-6 max-w-5xl ${isFullscreen ? "" : "pb-24 md:pb-6"}`}>
        {bingo && !isFullscreen && (
          <div className="mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl p-3 text-center font-black text-xl shadow-lg print:hidden">
            🎉 BINGO! You got it! 🎉
          </div>
        )}

        <div className={`${isFullscreen ? "" : "grid lg:grid-cols-3 gap-6"}`}>
          {!isFullscreen && (
            <div className="hidden lg:block lg:col-span-1 space-y-4 print:hidden">
              <div className={`rounded-2xl shadow-sm border overflow-hidden ${
                "bg-white border-slate-100"
              }`}>
                <div className={`flex border-b ${"border-slate-100"}`}>
                  <button
                    onClick={() => setActiveTab("play")}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "play" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    🎮 Play
                  </button>
                  <button
                    onClick={() => setActiveTab("export")}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "export" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    📥 Export
                  </button>
                </div>

                {activeTab === "play" && (
                  <div className="p-4 space-y-4">
                    <div>
                      <div className={`flex justify-between text-sm mb-1 ${"text-slate-500"}`}>
                        <span>Progress</span>
                        <span>{marked.size}/{totalCells} marked</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${"bg-slate-100"}`}>
                        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300" style={{ width: `${(marked.size / totalCells) * 100}%` }} />
                      </div>
                    </div>
                    <p className={`text-xs ${"text-slate-400"}`}>Tap any cell on the card to mark it. Get a row, column, or diagonal to win!</p>
                    <div className="flex gap-2">
                      <button onClick={resetGame} className={`flex-1 py-2.5 text-sm font-semibold border-2 rounded-xl transition-all ${"border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50"}`}>
                        🔄 Reset
                      </button>
                      <button onClick={undoLast} disabled={undoStack.length === 0} className={`flex-1 py-2.5 text-sm font-semibold border-2 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed ${"border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-600 hover:bg-amber-50"}`}>
                        ↩ Undo
                      </button>
                    </div>
                    <button onClick={toggleFullscreen} className={`w-full py-2.5 text-sm font-semibold border-2 rounded-xl transition-all ${"border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50"}`}>
                      ⛶ Fullscreen
                    </button>
                    {card.isPublic && card.shareLink && (
                      <button onClick={copyShareLink} className="w-full py-2.5 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all">
                        {copied ? "✅ Copied!" : "🔗 Copy Share Link"}
                      </button>
                    )}
                  </div>
                )}

                {activeTab === "export" && (
                  <div className="p-4 space-y-3">
                    <button onClick={handleExportPDF} disabled={exporting !== null} className="w-full px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold text-sm">
                      {exporting === "pdf" ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Generating...</span></>
                      ) : (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg><span>Download PDF</span></>
                      )}
                    </button>
                    <button onClick={handleExportPNG} disabled={exporting !== null} className="w-full px-4 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold text-sm">
                      {exporting === "png" ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Generating...</span></>
                      ) : (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span>Download PNG</span></>
                      )}
                    </button>
                    <button onClick={handlePrint} className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 font-semibold text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      <span>Print</span>
                    </button>
                    {userPlan && (
                      <p className={`text-xs text-center ${"text-slate-400"}`}>
                        {userPlan.canExportHD ? "✨ HD Quality (2400px)" : "📄 Standard Quality (1200px)"}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className={`rounded-2xl shadow-sm border p-4 ${"bg-white border-slate-100"}`}>
                <h3 className={`text-sm font-semibold mb-3 ${"text-slate-700"}`}>Card Details</h3>
                <div className="space-y-1.5 text-sm">
                  {([
                    ["Grid", `${card.size}×${card.size}`],
                    ["Free Space", card.freeSpace ? "Yes" : "No"],
                    ["Public", card.isPublic ? "Yes" : "No"],
                    ["Created", new Date(card.createdAt).toLocaleDateString()],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className={"text-slate-500"}>{label}</span>
                      <span className={`font-medium ${"text-slate-700"}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Card grid */}
          <div className={isFullscreen ? "bingo-container w-full max-w-2xl mx-auto" : "lg:col-span-2"}>
            <div className={`rounded-2xl shadow-sm border p-3 md:p-6 print-card ${"bg-white border-slate-100"}`} ref={cardRef}>
              <div className="text-center mb-3 md:mb-6">
                <h1 className={`text-xl md:text-2xl font-black ${"text-slate-900"}`}>{card.title}</h1>
                {card.description && <p className={`text-sm mt-1 ${"text-slate-500"}`}>{card.description}</p>}
                <p className={`text-xs mt-1 print:hidden ${"text-slate-400"}`}>Tap a cell to mark it</p>
              </div>

              <div className="grid gap-1.5 md:gap-2 w-full bingo-grid-print" style={{ gridTemplateColumns: `repeat(${card.size}, 1fr)` }}>
                {card.cells.map((cell, index) => {
                  const isFreeSpace = card.freeSpace && index === freeSpaceIdx;
                  const isMarked = marked.has(index);

                  return (
                    <button
                      key={index}
                      onClick={() => toggleCell(index)}
                      className={`
                        aspect-square flex items-center justify-center text-center rounded-xl font-semibold transition-all duration-150 select-none touch-manipulation overflow-hidden
                        ${isFreeSpace
                          ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white cursor-default shadow-md"
                          : isMarked
                            ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md ring-2 ring-indigo-300"
                            : "bg-slate-50 text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-95"
                        }
                      `}
                      style={{
                        fontSize: `clamp(0.55rem, ${card.size === 3 ? "3.5vw" : card.size === 4 ? "2.8vw" : "2.2vw"}, ${card.size === 3 ? "1rem" : card.size === 4 ? "0.9rem" : "0.8rem"})`,
                        padding: "4px",
                        fontFamily: card.style.fontFamily || "inherit",
                        ...(isMarked || isFreeSpace ? {} : {
                          backgroundColor: card.style.backgroundColor || undefined,
                          color: card.style.textColor || undefined,
                          borderColor: card.style.borderColor || undefined,
                        }),
                      }}
                      aria-label={isFreeSpace ? "Free space" : `${cell} - ${isMarked ? "marked" : "not marked"}`}
                    >
                      {isFreeSpace ? (
                        <span className="font-black text-xs">FREE</span>
                      ) : isMarked ? (
                        <span className="flex flex-col items-center gap-0.5">
                          <span className="text-base leading-none">✓</span>
                          <span className="opacity-60 line-through leading-tight break-words text-center" style={{ fontSize: "0.6em" }}>{cell}</span>
                        </span>
                      ) : (
                        <span className="break-words leading-tight text-center">{cell}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {isFullscreen && (
                <div className="mt-4 flex justify-center gap-3 print:hidden">
                  <button onClick={undoLast} disabled={undoStack.length === 0} className="px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm disabled:opacity-30 transition-all">↩ Undo</button>
                  <button onClick={resetGame} className="px-4 py-2 bg-slate-600 text-white rounded-xl font-semibold text-sm">🔄 Reset</button>
                  <button onClick={toggleFullscreen} className="px-4 py-2 bg-red-500 text-white rounded-xl font-semibold text-sm">✕ Exit</button>
                </div>
              )}

              {card.isPublic && card.shareLink && !isFullscreen && (
                <div className="mt-5 flex justify-center print:hidden">
                  <SocialShare url={shareUrl} title={card.title} cardId={card._id} />
                </div>
              )}

              {!userPlan?.canRemoveBranding && (
                <p className={`text-center text-xs mt-4 ${"text-slate-400"}`}>Created with MyBingoCard.com</p>
              )}

              {shareUrl && (
                <div className="print-only mt-6 text-center border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500 mb-2">Play this card digitally:</p>
                  <img src={qrCodeUrl} alt="QR Code" className="mx-auto" width={120} height={120} />
                  <p className="text-xs text-slate-400 mt-1">{shareUrl}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {!isFullscreen && (!userPlan || userPlan.planType === "FREE") && (
          <div className="max-w-5xl mx-auto mt-6 print:hidden">
            <AdUnit slot="card-view" format="horizontal" className="rounded-xl overflow-hidden" />
          </div>
        )}

        {!isFullscreen && (
          <div className={`md:hidden fixed bottom-0 left-0 right-0 border-t shadow-lg z-20 print:hidden ${"bg-white border-slate-200"}`}>
            {barExpanded && (
              <div className="px-4 pt-3 pb-2">
                {activeTab === "play" && (
                  <div className="space-y-2">
                    <div className={`h-1.5 rounded-full overflow-hidden ${"bg-slate-100"}`}>
                      <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300" style={{ width: `${(marked.size / totalCells) * 100}%` }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={resetGame} className={`flex-1 py-2.5 text-sm font-semibold border-2 rounded-xl ${"border-slate-200 text-slate-600"}`}>🔄 Reset</button>
                      <button onClick={undoLast} disabled={undoStack.length === 0} className={`flex-1 py-2.5 text-sm font-semibold border-2 rounded-xl disabled:opacity-30 ${"border-slate-200 text-slate-600"}`}>↩ Undo</button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={toggleFullscreen} className={`flex-1 py-2.5 text-sm font-semibold border-2 rounded-xl ${"border-slate-200 text-slate-600"}`}>⛶ Fullscreen</button>
                      {card.isPublic && card.shareLink && (
                        <button onClick={copyShareLink} className="flex-1 py-2.5 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl">
                          {copied ? "✅ Copied" : "🔗 Share"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {activeTab === "export" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button onClick={handleExportPDF} disabled={exporting !== null} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl disabled:opacity-50 font-semibold text-sm">{exporting === "pdf" ? "..." : "📄 PDF"}</button>
                      <button onClick={handleExportPNG} disabled={exporting !== null} className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl disabled:opacity-50 font-semibold text-sm">{exporting === "png" ? "..." : "🖼 PNG"}</button>
                    </div>
                    <button onClick={handlePrint} className="w-full py-2.5 bg-slate-700 text-white rounded-xl font-semibold text-sm">🖨 Print</button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center px-3 py-2 gap-2">
              <button
                onClick={() => { setActiveTab("play"); setBarExpanded(v => activeTab === "play" ? !v : true); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "play" && barExpanded ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                🎮 Play · {marked.size}/{totalCells}
              </button>
              <button
                onClick={() => { setActiveTab("export"); setBarExpanded(v => activeTab === "export" ? !v : true); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "export" && barExpanded ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                📥 Export
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
