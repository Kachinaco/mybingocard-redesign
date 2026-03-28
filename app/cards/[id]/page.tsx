"use client";

import { trackCardPrinted } from "@/lib/analytics";
import SocialShare from "@/components/SocialShare";
import ThemedCardWrapper from "@/components/ThemedCardWrapper";
import { isImageCell, parseImageCell, getCellDisplayText } from "@/lib/cellContent";
import { useTextFit } from "@/lib/useTextFit";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import AdUnit from "@/components/AdUnit";
import FavoriteButton from "@/components/FavoriteButton";
import { trackClientActivity } from "@/lib/activity-client";
import { redirectToCheckout } from "@/lib/upgrade";
import {
  BATCH_PACKS,
  formatBatchPackPrice,
  isBatchCount,
  type BatchCount,
} from "@/lib/batchPacks";

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
    theme?: string;
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
  const [activeTab, setActiveTab] = useState<"play" | "export" | "batch">("play");
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [bingo, setBingo] = useState(false);
  const [showBingo, setShowBingo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [batchCount, setBatchCount] = useState<BatchCount>(30);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{ count: number; cardIds: string[] } | null>(null);
  const [batchPdfLoading, setBatchPdfLoading] = useState<string | null>(null);
  const [batchCheckoutLoading, setBatchCheckoutLoading] = useState(false);
  const [availableBatchCounts, setAvailableBatchCounts] = useState<Partial<Record<BatchCount, number>>>({});
  const [barExpanded, setBarExpanded] = useState(true);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status || "loading";
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const gameStartTime = useRef(Date.now());
  const gridRef = useRef<HTMLDivElement>(null);
  const fittedSizes = useTextFit(gridRef, {
    cells: card?.cells ?? [],
    gridSize: (card?.size ?? 5) as 3 | 4 | 5,
    fontFamily: card?.style.fontFamily || "sans-serif",
    freeSpaceIndex: card?.freeSpace ? Math.floor(((card?.size ?? 5) * (card?.size ?? 5)) / 2) : null,
  });

  useEffect(() => { fetchCard(); }, [cardId]);
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      fetchUserPlan();
      loadBatchPurchases();
    }
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
          planType: data.plan.planName || data.planType,
          canExportHD: data.plan?.canExportHD || false,
          canRemoveBranding: data.plan?.canRemoveBranding || false,
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
        // Track bingo achieved
        trackClientActivity("bingo_achieved", {
          cardId: card._id,
          cardTitle: card.title,
          gridSize: card.size,
          markedCount: next.size,
          totalCells: card.size * card.size,
          timeToBingoSeconds: duration,
          context: "owner_card",
        });
      } else if (!hasBingo) {
        setBingo(false);
      }
      // Track cell toggle
      trackClientActivity("cell_toggled", {
        cardId: card._id,
        cellIndex: index,
        action: next.has(index) ? "marked" : "unmarked",
        markedCount: next.size,
        totalCells: card.size * card.size,
        context: "owner_card",
      });
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
      const entering = !document.fullscreenElement;
      if (entering) {
        await cardContainerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      trackClientActivity("fullscreen_toggled", { entered: entering });
    } catch {}
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      trackCardPrinted(cardId, "print");
      trackClientActivity("card_printed", {
        cardId,
        title: card?.title || "",
      });
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
      trackClientActivity("card_share_link_copied", {
        cardId,
        title: card.title,
      });
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
      trackClientActivity("card_share_link_copied", {
        cardId,
        title: card.title,
        generated: true,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      alert(err.message || "Failed to generate share link");
    } finally {
      setGeneratingLink(false);
    }
  };

  // --- Batch functions ---
  const loadBatchPurchases = async () => {
    if (!session?.user || userPlan?.planType === "Premium") {
      setAvailableBatchCounts({});
      return;
    }
    try {
      const response = await fetch("/api/batch-purchases", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) return;
      const nextCounts = Object.entries(data.availableByCount || {}).reduce<Partial<Record<BatchCount, number>>>(
        (acc, [key, value]) => {
          const numericKey = Number(key);
          if (isBatchCount(numericKey)) acc[numericKey] = Number(value);
          return acc;
        },
        {}
      );
      setAvailableBatchCounts(nextCounts);
    } catch {}
  };

  const handleBatchCheckout = async () => {
    if (!session?.user) return;
    setBatchCheckoutLoading(true);
    try {
      await redirectToCheckout({
        purchaseType: "batch_pack",
        batchCount,
        label: `${batchCount} Card Batch`,
        successPath: `/cards/${cardId}?batchPurchase=success&batchCount=${batchCount}`,
      });
    } catch {
    } finally {
      setBatchCheckoutLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!card) return;
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const filledCells = card.cells.filter((c) => c.trim()).length;
      const neededCells = card.freeSpace ? card.size * card.size - 1 : card.size * card.size;
      if (filledCells < neededCells) {
        alert(`Need at least ${neededCells} filled items for ${card.size}x${card.size} batch generation`);
        setBatchLoading(false);
        return;
      }
      const response = await fetch("/api/cards/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: card.title,
          size: card.size,
          cells: card.cells.filter((c) => c.trim()),
          freeSpace: card.freeSpace,
          style: card.style,
          count: batchCount,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403 && data.batchPurchaseRequired) {
          await loadBatchPurchases();
        }
        alert(data.error || "Failed to generate batch cards");
        setBatchLoading(false);
        return;
      }
      setBatchResult({ count: data.count, cardIds: data.cards.map((c: any) => c._id) });
      await loadBatchPurchases();
    } catch {
      alert("An error occurred during batch generation");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchPdfDownload = async (cardsPerPage: number = 1, grayscale: boolean = false) => {
    if (!batchResult) return;
    const loadingKey = grayscale ? "pdf-gray" : `pdf-${cardsPerPage}`;
    setBatchPdfLoading(loadingKey);
    try {
      const response = await fetch("/api/cards/batch/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: batchResult.cardIds, cardsPerPage, grayscale, showCutLines: true }),
      });
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (!w) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `bingo-batch-${batchResult.count}-cards.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      alert(err.message || "Failed to download batch PDF");
    } finally {
      setBatchPdfLoading(null);
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
  const markedCount = marked.size;
  const progressPercent = Math.round((markedCount / totalCells) * 100);
  const remainingSquares = Math.max(totalCells - markedCount, 0);
  const shareUrl = card.shareLink ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${card.shareLink}` : "";
  const qrCodeUrl = shareUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}` : "";

  const isPremiumBatchUser = userPlan?.planType === "Premium";
  const selectedBatchPrice = formatBatchPackPrice(batchCount);
  const hasSelectedBatchPurchase = (availableBatchCounts[batchCount] || 0) > 0;
  const batchActionLabel = batchLoading
    ? `Generating ${batchCount} cards...`
    : batchCheckoutLoading
      ? "Redirecting to checkout..."
      : isPremiumBatchUser || hasSelectedBatchPurchase
        ? `Generate ${batchCount} Unique Cards`
        : `Buy ${batchCount}-Card Batch \u2022 ${selectedBatchPrice}`;
  const handleBatchPrimaryAction = isPremiumBatchUser || hasSelectedBatchPurchase
    ? handleBatchGenerate
    : handleBatchCheckout;

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
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </Link>
              <Link href="/dashboard" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                MyBingoCard
              </Link>
            </div>
            <div className="flex gap-2 items-center">
              <FavoriteButton cardId={card._id} />
              <Link href={`/create?cardId=${card._id}`} className="px-4 py-2 text-sm border rounded-lg font-medium transition-colors border-slate-200 text-slate-700 hover:bg-slate-50">
                Edit
              </Link>
              <Link href="/dashboard/cards" className="hidden sm:inline px-4 py-2 text-sm transition-colors text-slate-500 hover:text-slate-700">
                My Cards
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

        {!isFullscreen && (
          <section className="mb-6 rounded-[28px] bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-700 text-white p-5 md:p-6 shadow-xl shadow-indigo-200/50 print:hidden relative overflow-hidden">
            <div className="absolute -top-16 -right-12 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-fuchsia-400/20 blur-3xl" />

            <div className="relative z-10">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-100">
                    <span>Solo Mode</span>
                    {bingo ? <span className="text-yellow-200">BINGO</span> : null}
                  </div>
                  <h1 className="mt-3 text-2xl md:text-4xl font-black tracking-tight">{card.title}</h1>
                  <p className="mt-2 text-sm md:text-base text-indigo-100/90">
                    {card.description || "Play at your own pace. Tap any square to mark it, and complete a row, column, or diagonal to win."}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur-sm md:min-w-[220px]">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100/80">Progress</div>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-3xl font-black">{progressPercent}%</span>
                    <span className="pb-1 text-sm text-indigo-100/80">{markedCount}/{totalCells} marked</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-white transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100/75">Goal</div>
                  <p className="mt-2 text-sm font-semibold">Complete any row, column, or diagonal.</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100/75">Remaining</div>
                  <p className="mt-2 text-sm font-semibold">{remainingSquares} squares left to fill.</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100/75">Autosave</div>
                  <p className="mt-2 text-sm font-semibold">Your solo progress is saved on this device.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:hidden">
                <button onClick={resetGame} className="rounded-xl bg-white text-slate-900 px-4 py-2.5 text-sm font-bold shadow-sm hover:bg-indigo-50 transition-colors">
                  Reset
                </button>
                <button onClick={undoLast} disabled={undoStack.length === 0} className="rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-40">
                  Undo
                </button>
                <button onClick={toggleFullscreen} className="rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm font-bold text-white transition-colors">
                  Fullscreen
                </button>
                {card.isPublic && card.shareLink && (
                  <button onClick={copyShareLink} className="rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm font-bold text-white transition-colors">
                    {copied ? "Copied" : "Share"}
                  </button>
                )}
              </div>
            </div>
          </section>
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
                  <button
                    onClick={() => { setActiveTab("batch"); loadBatchPurchases(); }}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "batch" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    📋 Batch
                  </button>
                </div>

                {activeTab === "play" && (
                  <div className="p-4 space-y-4">
                    <div>
                      <div className={`flex justify-between text-sm mb-1 ${"text-slate-500"}`}>
                        <span>Progress</span>
                        <span>{markedCount}/{totalCells} marked</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${"bg-slate-100"}`}>
                        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
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
                    {userPlan && !userPlan.canRemoveBranding && (
                      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-indigo-100 rounded-xl p-3 mb-1">
                        <p className="text-xs font-semibold text-indigo-900 mb-1">Exports include watermark</p>
                        <p className="text-xs text-indigo-700 mb-2">Remove the MyBingoCard.com watermark and unlock HD exports.</p>
                        <button onClick={() => redirectToCheckout()} className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-xs font-bold hover:shadow-md transition-all">
                          Remove Watermark — $4.99/mo
                        </button>
                      </div>
                    )}
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

                {activeTab === "batch" && (
                  <div className="p-4 space-y-4">
                    <p className="text-xs text-slate-500">
                      Generate multiple unique cards from the same items. Each card gets a different shuffled arrangement.
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Number of cards
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {([30, 100, 250, 500] as const).map((n) => (
                          <button
                            key={n}
                            onClick={() => setBatchCount(n)}
                            className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                              batchCount === n
                                ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600"
                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                            }`}
                          >
                            <div className="font-semibold">{n}</div>
                            {!isPremiumBatchUser && (
                              <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                                {BATCH_PACKS[n].label}
                              </div>
                            )}
                            {!isPremiumBatchUser && (availableBatchCounts[n] || 0) > 0 && (
                              <div className="mt-1 text-[10px] font-semibold text-emerald-600">
                                Ready x{availableBatchCounts[n]}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isPremiumBatchUser ? (
                      <p className="text-xs text-slate-500">
                        Batch generation is included in your Premium plan.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Free accounts can buy one-time batch packs. Premium includes unlimited batch generation.
                      </p>
                    )}

                    {batchResult ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-emerald-800">
                          {batchResult.count} cards generated!
                        </p>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleBatchPdfDownload(1)}
                            disabled={batchPdfLoading !== null}
                            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${
                              batchPdfLoading === "pdf-1" ? "bg-red-700 text-white cursor-wait" : "bg-red-600 text-white hover:bg-red-700"
                            } ${batchPdfLoading !== null && batchPdfLoading !== "pdf-1" ? "cursor-not-allowed" : ""}`}
                          >
                            {batchPdfLoading === "pdf-1" ? "Generating PDF..." : "Download PDF (1 per page)"}
                          </button>
                          <button
                            onClick={() => handleBatchPdfDownload(2)}
                            disabled={batchPdfLoading !== null}
                            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${
                              batchPdfLoading === "pdf-2" ? "bg-red-600 text-white cursor-wait" : "bg-red-500 text-white hover:bg-red-600"
                            } ${batchPdfLoading !== null && batchPdfLoading !== "pdf-2" ? "cursor-not-allowed" : ""}`}
                          >
                            {batchPdfLoading === "pdf-2" ? "Generating PDF..." : "Download PDF (2 per page)"}
                          </button>
                          <button
                            onClick={() => handleBatchPdfDownload(4)}
                            disabled={batchPdfLoading !== null}
                            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${
                              batchPdfLoading === "pdf-4" ? "bg-red-500 text-white cursor-wait" : "bg-red-400 text-white hover:bg-red-500"
                            } ${batchPdfLoading !== null && batchPdfLoading !== "pdf-4" ? "cursor-not-allowed" : ""}`}
                          >
                            {batchPdfLoading === "pdf-4" ? "Generating PDF..." : "Download PDF (4 per page)"}
                          </button>
                          <button
                            onClick={() => handleBatchPdfDownload(1, true)}
                            disabled={batchPdfLoading !== null}
                            className={`w-full py-2 rounded-lg text-sm font-semibold transition ${
                              batchPdfLoading === "pdf-gray" ? "bg-slate-700 text-white cursor-wait" : "bg-slate-600 text-white hover:bg-slate-700"
                            } ${batchPdfLoading !== null && batchPdfLoading !== "pdf-gray" ? "cursor-not-allowed" : ""}`}
                          >
                            {batchPdfLoading === "pdf-gray" ? "Generating..." : "Download Grayscale PDF"}
                          </button>
                        </div>
                        <button
                          onClick={() => setBatchResult(null)}
                          className="w-full py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                        >
                          Generate More
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleBatchPrimaryAction}
                        disabled={batchLoading || batchCheckoutLoading}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 font-bold text-sm"
                      >
                        {batchActionLabel}
                      </button>
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
           <ThemedCardWrapper theme={card.style?.theme} title={card.title}>
            <div className={`rounded-2xl shadow-sm border p-3 md:p-6 print-card ${"bg-white border-slate-100"}`} ref={cardRef}>
              <div className="text-center mb-3 md:mb-6">
                <div className="flex flex-wrap items-center justify-center gap-2 mb-3 print:hidden">
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wide">
                    Solo Play
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                    {markedCount}/{totalCells} marked
                  </span>
                  {bingo ? (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wide">
                      Bingo
                    </span>
                  ) : null}
                </div>
                <h1 className={`text-xl md:text-2xl font-black ${"text-slate-900"}`}>{card.title}</h1>
                {card.description && <p className={`text-sm mt-1 ${"text-slate-500"}`}>{card.description}</p>}
                <p className={`text-xs mt-1 print:hidden ${"text-slate-400"}`}>Tap a cell to mark it</p>
                <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden print:hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div ref={gridRef} className="grid gap-1.5 md:gap-2 w-full bingo-grid-print" style={{ gridTemplateColumns: `repeat(${card.size}, 1fr)` }}>
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
                          {isImageCell(cell) ? (
                            <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="max-w-[60%] max-h-[40%] object-contain opacity-60" />
                          ) : (
                            <span className="opacity-60 line-through leading-tight break-words text-center" style={{ fontSize: fittedSizes.has(index) ? `${fittedSizes.get(index)! * 0.55}px` : "0.6em" }}>{cell}</span>
                          )}
                        </span>
                      ) : isImageCell(cell) ? (
                        <span className="flex flex-col items-center gap-0.5 w-full h-full justify-center p-1">
                          <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="max-w-full max-h-[70%] object-contain" loading="lazy" />
                          {getCellDisplayText(cell) && <span className="text-[0.55em] leading-tight text-center w-full truncate">{getCellDisplayText(cell)}</span>}
                        </span>
                      ) : (
                        <span className="break-words leading-tight text-center" style={fittedSizes.has(index) ? { fontSize: `${fittedSizes.get(index)}px` } : undefined}>{cell}</span>
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
                <div className="text-center mt-4">
                  <p className="text-xs text-slate-400 mb-1">Created with MyBingoCard.com</p>
                  <button onClick={() => redirectToCheckout()} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">
                    Remove watermark →
                  </button>
                </div>
              )}

              {shareUrl && (
                <div className="print-only mt-6 text-center border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500 mb-2">Play this card digitally:</p>
                  <img src={qrCodeUrl} alt="QR Code" className="mx-auto" width={120} height={120} />
                  <p className="text-xs text-slate-400 mt-1">{shareUrl}</p>
                </div>
              )}
            </div>
           </ThemedCardWrapper>
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
                      <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
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
                {activeTab === "batch" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {([30, 100, 250, 500] as const).map((n) => (
                        <button
                          key={n}
                          onClick={() => setBatchCount(n)}
                          className={`py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            batchCount === n
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 text-slate-600"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    {batchResult ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBatchPdfDownload(1)}
                          disabled={batchPdfLoading !== null}
                          className="flex-1 py-2.5 bg-red-600 text-white rounded-xl disabled:opacity-50 font-semibold text-sm"
                        >
                          {batchPdfLoading ? "..." : "📄 Download PDF"}
                        </button>
                        <button
                          onClick={() => setBatchResult(null)}
                          className="py-2.5 px-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm"
                        >
                          More
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleBatchPrimaryAction}
                        disabled={batchLoading || batchCheckoutLoading}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2.5 rounded-xl disabled:opacity-50 font-bold text-sm"
                      >
                        {batchActionLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center px-3 py-2 gap-2">
              <button
                onClick={() => { setActiveTab("play"); setBarExpanded(v => activeTab === "play" ? !v : true); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "play" && barExpanded ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                🎮 Play · {markedCount}/{totalCells}
              </button>
              <button
                onClick={() => { setActiveTab("export"); setBarExpanded(v => activeTab === "export" ? !v : true); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "export" && barExpanded ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                📥 Export
              </button>
              <button
                onClick={() => { setActiveTab("batch"); setBarExpanded(v => activeTab === "batch" ? !v : true); loadBatchPurchases(); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "batch" && barExpanded ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                📋 Batch
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
