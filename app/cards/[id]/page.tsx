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
import StartGameButton from "@/components/StartGameButton";
import { trackClientActivity } from "@/lib/activity-client";
import {
  getBrowserStorageItem,
  removeBrowserStorageItem,
  setBrowserStorageItem,
} from "@/lib/browser-storage";
import { redirectToCheckout } from "@/lib/upgrade";
import {
  BATCH_PACKS,
  formatBatchPackPrice,
  isBatchCount,
  type BatchCount,
} from "@/lib/batchPacks";
import {
  checkWinByGrid,
  formatClassicCellLabel,
  getBingoGridShape,
  getFreeSpaceIndexForGrid,
  isBlankClassicCell,
  normalizeBingoVariant,
  type BingoVariant,
} from "@/lib/classic-bingo";

const CARD_COUNT_OPTIONS = [30, 100, 250, 500] as const;

function formatPerCard(count: BatchCount) {
  const cents = BATCH_PACKS[count].amount / count;
  return `${Math.ceil(cents)}¢/card`;
}

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
    theme?: string;
  };
  isPublic: boolean;
  shareLink?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserPlan {
  planType: string;
  hasPremiumAccess: boolean;
  legacyFreeAccess: boolean;
  canExportHD: boolean;
  canExportPNG: boolean;
  canRemoveBranding: boolean;
}

export default function CardViewPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.id as string;
  const cardRef = useRef<HTMLDivElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const sharePanelRef = useRef<HTMLDivElement>(null);
  const playStartedTrackedRef = useRef(false);
  const cardViewTrackedRef = useRef(false);

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);
  const [pdfGrayscale, setPdfGrayscale] = useState(false);
  const [pdfCopies, setPdfCopies] = useState(1);
  const [activeTab, setActiveTab] = useState<"play" | "share" | "download">("play");
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [bingo, setBingo] = useState(false);
  const [showBingo, setShowBingo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [batchCount, setBatchCount] = useState<BatchCount>(30);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchCheckoutLoading, setBatchCheckoutLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{ count: number; cardIds: string[] } | null>(null);
  const [batchPdfLoading, setBatchPdfLoading] = useState<string | null>(null);
  const [batchPdfDownloaded, setBatchPdfDownloaded] = useState(false);
  const [availableBatchCounts, setAvailableBatchCounts] = useState<Partial<Record<BatchCount, number>>>({});
  const [barExpanded, setBarExpanded] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [entryNotice, setEntryNotice] = useState<"created" | "saved" | "continue" | null>(null);
  const [shareEmailOpenTrigger, setShareEmailOpenTrigger] = useState(0);

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
    freeSpaceIndex: card
      ? getFreeSpaceIndexForGrid({
          freeSpace: card.freeSpace,
          rows: getBingoGridShape(card).rows,
          columns: getBingoGridShape(card).columns,
          bingoVariant: card.bingoVariant,
        })
      : null,
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
      const stored = JSON.parse(getBrowserStorageItem("localStorage", key) || "[]");
      const filtered = stored.filter((i: any) => i.cardId !== card._id);
      filtered.unshift({ cardId: card._id, cardName: card.title, lastPlayed: new Date().toISOString() });
      setBrowserStorageItem("localStorage", key, JSON.stringify(filtered.slice(0, 10)));
    } catch {}
  }, [card]);

  useEffect(() => {
    if (!card || cardViewTrackedRef.current) return;
    cardViewTrackedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const created = params.get("created") === "1";
    const saved = params.get("saved") === "1";
    const next = params.get("next");
    const notice = created ? "created" : saved ? "saved" : next ? "continue" : null;

    if (notice) setEntryNotice(notice);
    if (next === "export" || next === "batch" || next === "download") {
      setActiveTab("download");
      loadBatchPurchases();
    }
    if (next === "share") {
      setActiveTab("share");
      window.setTimeout(() => sharePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }

    const viewedAt = Date.now();
    const seenKey = `mybingo_card_last_seen_${card._id}`;
    const previousSeenAt = Number(getBrowserStorageItem("localStorage", seenKey) || 0);
    setBrowserStorageItem("localStorage", seenKey, String(viewedAt));

    trackClientActivity(notice ? "post_save_card_viewed" : "card_viewed", {
      cardId: card._id,
      title: card.title,
      source: notice || next || "direct",
      context: "owner_card",
    });

    if (!notice && previousSeenAt > 0 && viewedAt - previousSeenAt > 60 * 60 * 1000) {
      trackClientActivity("returned_to_card", {
        cardId: card._id,
        title: card.title,
        hoursSinceLastView: Math.round((viewedAt - previousSeenAt) / (60 * 60 * 1000)),
        context: "owner_card",
      });
    }
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
        const saved = getBrowserStorageItem("localStorage", `mybingo_state_${cardId}`);
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
        const shape = getBingoGridShape(data.card);
        const freeIdx = getFreeSpaceIndexForGrid({
          freeSpace: data.card.freeSpace,
          rows: shape.rows,
          columns: shape.columns,
          bingoVariant: data.card.bingoVariant,
        });
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
          hasPremiumAccess: Boolean(data.hasPremiumAccess),
          legacyFreeAccess: Boolean(data.legacyFreeAccess),
          canExportHD: data.plan?.canExportHD || false,
          canExportPNG: data.plan?.canExportPNG || false,
          canRemoveBranding: data.plan?.canRemoveBranding || false,
        });
      }
    } catch {}
  };

  const getFreeSpaceIndex = useCallback(() => {
    if (!card) return -1;
    const shape = getBingoGridShape(card);
    return getFreeSpaceIndexForGrid({
      freeSpace: card.freeSpace,
      rows: shape.rows,
      columns: shape.columns,
      bingoVariant: card.bingoVariant,
    });
  }, [card]);

  const checkBingo = useCallback((markedSet: Set<number>): boolean => {
    if (!card) return false;
    const variant = normalizeBingoVariant(card.bingoVariant);
    const shape = getBingoGridShape(card);
    return checkWinByGrid(
      Array.from(markedSet),
      card.cells,
      shape.rows,
      shape.columns,
      variant === "classic90" ? "one_line" : "standard",
      variant
    );
  }, [card]);

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }
  };

  const toggleCell = (index: number) => {
    if (!card) return;
    if (card.freeSpace && index === getFreeSpaceIndex()) return;
    if (isBlankClassicCell(card.cells[index] || "", normalizeBingoVariant(card.bingoVariant))) return;
    triggerHaptic();
    if (!playStartedTrackedRef.current) {
      playStartedTrackedRef.current = true;
      trackClientActivity("play_started", {
        cardId: card._id,
        title: card.title,
        gridSize: card.size,
        context: "owner_card",
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
      // Save to localStorage
      setBrowserStorageItem("localStorage", `mybingo_state_${cardId}`, JSON.stringify({ marked: Array.from(next), bingo: checkBingo(next), undoStack: [...(undoStack || []), next.has(index) ? index + 1 : -(index + 1)], timestamp: Date.now() }));
      const hasBingo = checkBingo(next);
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
          totalCells: card.cells.filter((cell) => !isBlankClassicCell(cell, normalizeBingoVariant(card.bingoVariant))).length,
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
        totalCells: card.cells.filter((cell) => !isBlankClassicCell(cell, normalizeBingoVariant(card.bingoVariant))).length,
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
      const hasBingo = checkBingo(next);
      if (hasBingo && !bingo) {
        setBingo(true);
      } else if (!hasBingo) {
        setBingo(false);
        setShowBingo(false);
      }
      // Save to localStorage
      setBrowserStorageItem("localStorage", `mybingo_state_${cardId}`, JSON.stringify({ marked: Array.from(next), bingo: checkBingo(next), undoStack: undoStack.slice(0, -1), timestamp: Date.now() }));
      return next;
    });
  };

  const resetGame = () => {
    if (!card) return;
    const freeIdx = getFreeSpaceIndex();
    setMarked(freeIdx >= 0 ? new Set([freeIdx]) : new Set());
    setUndoStack([]);
    setBingo(false);
    setShowBingo(false);
    removeBrowserStorageItem("localStorage", `mybingo_state_${cardId}`);
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
      trackClientActivity("print_started", {
        cardId,
        title: card?.title || "",
        context: "owner_card",
      });
      trackCardPrinted(cardId, "print");
      trackClientActivity("card_printed", {
        cardId,
        title: card?.title || "",
      });
      window.print();
    }
  };

  const handleExportPDF = async () => {
    if (shouldUseBatchForPdf) {
      openBatchForPdf("single_pdf_export");
      return;
    }

    try {
      trackExportButtonClicked("single_pdf_export", "single_pdf");
      setExporting("pdf");
      trackClientActivity("export_pdf_started", { cardId, format: "pdf", context: "owner_card" });
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
      trackClientActivity("export_pdf_downloaded", { cardId, format: "pdf" });
    } catch (err: any) {
      trackClientActivity("export_failed", { cardId, format: "pdf", error: err.message || "Unknown error" });
      alert(err.message || "Failed to export PDF");
    }
    finally { setExporting(null); }
  };

  const handleExportPNG = async () => {
    try {
      setExporting("png");
      trackClientActivity("export_png_started", { cardId, format: "png", context: "owner_card" });
      const response = await fetch(`/api/cards/${cardId}/export/png`, { method: "POST" });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || "Failed"); }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${card?.title || "bingo-card"}.png`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
      trackClientActivity("export_png_downloaded", { cardId, format: "png" });
    } catch (err: any) {
      trackClientActivity("export_failed", { cardId, format: "png", error: err.message || "Unknown error" });
      alert(err.message || "Failed to export PNG");
    }
    finally { setExporting(null); }
  };

  const copyShareLink = async (source: unknown = "card_page") => {
    if (card?.shareLink) {
      const eventSource = typeof source === "string" ? source : "card_page";
      const url = `${window.location.origin}/share/${card.shareLink}`;
      await navigator.clipboard.writeText(url);
      trackClientActivity("share_link_copied", {
        cardId,
        title: card.title,
        source: eventSource,
        context: "owner_card",
      });
      trackClientActivity("card_share_link_copied", {
        cardId,
        title: card.title,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateShareLink = async (source: unknown = "card_page") => {
    if (!card) return false;
    if (userPlan && !userPlan.hasPremiumAccess && !userPlan.legacyFreeAccess) {
      trackClientActivity("share_link_blocked", {
        cardId,
        title: card.title,
        source: typeof source === "string" ? source : "card_page",
        reason: "premium_required",
        context: "owner_card",
      });
      await redirectToCheckout({
        label: "Premium trial, then $7.99/mo",
        successPath: `/cards/${cardId}?next=share`,
      });
      return false;
    }
    try {
      const eventSource = typeof source === "string" ? source : "card_page";
      setGeneratingLink(true);
      const response = await fetch(`/api/cards/${cardId}/share`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate link");
      setCard({ ...card, shareLink: data.shareLink, isPublic: true });
      const url = `${window.location.origin}/share/${data.shareLink}`;
      await navigator.clipboard.writeText(url);
      trackClientActivity("share_link_copied", {
        cardId,
        title: card.title,
        generated: true,
        source: eventSource,
        context: "owner_card",
      });
      trackClientActivity("card_share_link_copied", {
        cardId,
        title: card.title,
        generated: true,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (err: any) {
      alert(err.message || "Failed to generate share link");
      return false;
    } finally {
      setGeneratingLink(false);
    }
  };

  const openShareEmailFromMobile = async () => {
    if (!card || generatingLink) return;

    setActiveTab("share");
    setBarExpanded(true);

    if (!card.shareLink) {
      const created = await generateShareLink("mobile_share_email");
      if (!created) return;
    }

    setShareEmailOpenTrigger((value) => value + 1);
  };

  const trackNextStep = (action: string) => {
    if (!card) return;
    trackClientActivity("post_save_next_step_clicked", {
      cardId: card._id,
      title: card.title,
      action,
      source: entryNotice || "card_page",
      context: "owner_card",
    });
  };

  const trackExportButtonClicked = (source: string, exportType: string) => {
    trackClientActivity("export_button_clicked", {
      source,
      export_type: exportType,
      cardId,
      title: card?.title || "",
      plan_type: userPlan?.planType || "UNKNOWN",
      batch_count: batchCount,
      context: "owner_card",
    });
  };

  const trackBatchButtonClicked = (
    action: string,
    source: string,
    nextBatchCount: BatchCount = batchCount,
    extra: Record<string, unknown> = {}
  ) => {
    trackClientActivity("batch_button_clicked", {
      action,
      source,
      cardId,
      title: card?.title || "",
      batch_count: nextBatchCount,
      price: formatBatchPackPrice(nextBatchCount),
      plan_type: userPlan?.planType || "UNKNOWN",
      has_ready_purchase: (availableBatchCounts[nextBatchCount] || 0) > 0,
      is_premium_batch_user: isPremiumBatchUser,
      context: "owner_card",
      ...extra,
    });
  };

  const selectBatchCount = (nextBatchCount: BatchCount, source: string) => {
    setBatchCount(nextBatchCount);
    trackClientActivity("batch_tier_selected", {
      source,
      cardId,
      title: card?.title || "",
      batch_count: nextBatchCount,
      price: formatBatchPackPrice(nextBatchCount),
      plan_type: userPlan?.planType || "UNKNOWN",
      has_ready_purchase: (availableBatchCounts[nextBatchCount] || 0) > 0,
      context: "owner_card",
    });
  };

  const openBatchForPdf = (source: string = "export_tab") => {
    trackExportButtonClicked(source, "batch_pdf");
    trackBatchButtonClicked("open_panel_for_pdf", source);
    trackClientActivity("export_pdf_batch_required", {
      cardId,
      title: card?.title || "",
      source,
      batchCount,
      context: "owner_card",
    });
    setActiveTab("download");
    setBarExpanded(true);
    loadBatchPurchases();
  };

  // --- Batch functions ---
  const loadBatchPurchases = async () => {
    if (!session?.user || userPlan?.hasPremiumAccess) {
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
    trackClientActivity("batch_primary_clicked", {
      action: "buy",
      source: "card_page",
      cardId,
      title: card?.title || "",
      batch_count: batchCount,
      price: formatBatchPackPrice(batchCount),
      plan_type: userPlan?.planType || "UNKNOWN",
      context: "owner_card",
    });
    setBatchCheckoutLoading(true);
    try {
      await redirectToCheckout({
        purchaseType: "batch_pack",
        batchCount,
        label: `${batchCount} Card Download`,
        successPath: `/cards/${cardId}?batchPurchase=success&batchCount=${batchCount}`,
      });
    } catch {
    } finally {
      setBatchCheckoutLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!card) return;
    trackClientActivity("batch_primary_clicked", {
      action: "generate",
      source: "card_page",
      cardId,
      title: card.title,
      batch_count: batchCount,
      price: formatBatchPackPrice(batchCount),
      plan_type: userPlan?.planType || "UNKNOWN",
      has_ready_purchase: hasSelectedBatchPurchase,
      is_premium_batch_user: isPremiumBatchUser,
      context: "owner_card",
    });
    setBatchLoading(true);
    setBatchResult(null);
    setBatchPdfDownloaded(false);
    try {
      const variant = normalizeBingoVariant(card.bingoVariant);
      const shape = getBingoGridShape(card);
      const filledCells = card.cells.filter((c) => c.trim() && c !== "FREE").length;
      const neededCells = variant === "classic90" ? 15 : card.freeSpace ? shape.rows * shape.columns - 1 : shape.rows * shape.columns;
      if (variant === "custom" && filledCells < neededCells) {
        alert(`Need at least ${neededCells} filled items for a ${card.size}x${card.size} card set`);
        setBatchLoading(false);
        return;
      }
      const response = await fetch("/api/cards/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: card.title,
          size: card.size,
          rows: shape.rows,
          columns: shape.columns,
          bingoVariant: variant,
          cells: variant === "custom" ? card.cells.filter((c) => c.trim()) : card.cells,
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
        alert(data.error || "Failed to generate cards");
        setBatchLoading(false);
        return;
      }
      setBatchResult({ count: data.count, cardIds: data.cards.map((c: any) => c._id) });
      await loadBatchPurchases();
    } catch {
      alert("An error occurred while generating cards");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchPdfDownload = async (cardsPerPage: number = 1, grayscale: boolean = false) => {
    if (!batchResult) return;
    const loadingKey = grayscale ? "pdf-gray" : `pdf-${cardsPerPage}`;
    setBatchPdfLoading(loadingKey);
    setBatchPdfDownloaded(false);
    const pdfMetadata = {
      source: "card_page",
      action: "pdf_layout",
      cardId: card?._id || cardId,
      title: card?.title || "",
      batch_count: batchResult.count,
      price: isPremiumBatchUser ? "premium" : formatBatchPackPrice(batchCount),
      plan_type: userPlan?.planType || "UNKNOWN",
      batchCount: batchResult.count,
      cardCount: batchResult.cardIds.length,
      cardsPerPage,
      grayscale,
      showCutLines: true,
    };
    trackClientActivity("batch_pdf_export_started", pdfMetadata);
    try {
      const response = await fetch("/api/cards/batch/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: batchResult.cardIds, cardsPerPage, grayscale, showCutLines: true }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate PDF");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bingo-cards-${batchResult.count}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      setBatchPdfDownloaded(true);
      const delivery: "download" = "download";
      trackClientActivity("batch_pdf_export_succeeded", { ...pdfMetadata, delivery });
    } catch (err: any) {
      trackClientActivity("batch_pdf_export_failed", {
        ...pdfMetadata,
        error: err.message || "Failed to download cards",
      });
      alert(err.message || "Failed to download cards");
    } finally {
      setBatchPdfLoading(null);
    }
  };

  const returnToCard = () => {
    setActiveTab("play");
    setBarExpanded(false);
    window.setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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
  const variant = normalizeBingoVariant(card.bingoVariant);
  const shape = getBingoGridShape(card);
  const totalCells = card.cells.filter((cell) => !isBlankClassicCell(cell, variant)).length;
  const markedCount = marked.size;
  const progressPercent = Math.round((markedCount / totalCells) * 100);
  const remainingSquares = Math.max(totalCells - markedCount, 0);
  const shareUrl = card.shareLink ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${card.shareLink}` : "";
  const qrCodeUrl = shareUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}` : "";

  const isPremiumBatchUser = Boolean(userPlan?.hasPremiumAccess);
  const shouldUseBatchForPdf = false;
  const selectedBatchPrice = formatBatchPackPrice(batchCount);
  const selectedPack = BATCH_PACKS[batchCount];
  const hasSelectedBatchPurchase = (availableBatchCounts[batchCount] || 0) > 0;
  const batchActionLabel = batchLoading
    ? `Generating ${batchCount} cards...`
    : batchCheckoutLoading
      ? "Redirecting to checkout..."
      : isPremiumBatchUser || hasSelectedBatchPurchase
        ? `Generate ${batchCount} Cards`
        : `Pay ${selectedBatchPrice} & Generate Cards`;
  const handleBatchPrimaryAction = isPremiumBatchUser || hasSelectedBatchPurchase
    ? handleBatchGenerate
    : handleBatchCheckout;
  const sharePanel = card.isPublic && card.shareLink ? (
    <SocialShare
      url={shareUrl}
      title={card.title}
      cardId={card._id}
      userPlanType={userPlan?.planType}
      openEmailTrigger={shareEmailOpenTrigger}
    />
  ) : (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Create a player link</p>
          <p className="text-xs text-slate-600">Players can open this card on any device and mark squares in their browser.</p>
        </div>
        <button
          onClick={() => generateShareLink("owner_share_panel")}
          disabled={generatingLink}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1" />
          </svg>
          {generatingLink ? "Creating..." : "Create player link"}
        </button>
      </div>
    </div>
  );

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
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center gap-2">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </Link>
              <Link href="/dashboard" className="hidden min-[390px]:inline text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                MyBingoCard
              </Link>
            </div>
            <div className="flex shrink-0 gap-1.5 sm:gap-2 items-center">
              <FavoriteButton cardId={card._id} />
              <Link href={`/create?cardId=${card._id}`} className="px-3 sm:px-4 py-2 text-sm border rounded-lg font-medium transition-colors border-slate-200 text-slate-700 hover:bg-slate-50">
                Edit
              </Link>
              <Link href="/dashboard/cards" className="hidden sm:inline px-4 py-2 text-sm transition-colors text-slate-500 hover:text-slate-700">
                My Cards
              </Link>
            </div>
          </div>

        </header>
      )}

      <main className={`container mx-auto px-4 py-4 sm:py-6 max-w-5xl ${isFullscreen ? "" : "pb-24 md:pb-6"}`}>
        {bingo && !isFullscreen && (
          <div className="mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl p-3 text-center font-black text-xl shadow-lg print:hidden">
            🎉 BINGO! You got it! 🎉
          </div>
        )}

        {entryNotice && !isFullscreen && (
          <section className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm print:hidden">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                  {entryNotice === "created" ? "Card created" : entryNotice === "saved" ? "Card saved" : "Continue"}
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900">{card.title}</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  onClick={() => {
                    trackNextStep("play");
                    setActiveTab("play");
                    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Play now
                </button>
                <StartGameButton cardId={card._id} label="Play with friends" compact />
                <button
                  onClick={() => {
                    trackNextStep("share");
                    setActiveTab("share");
                    sharePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    if (!card.shareLink) generateShareLink("post_save_notice");
                  }}
                  disabled={generatingLink}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:opacity-60"
                >
                  {generatingLink ? "Creating link..." : "Share"}
                </button>
                <button
                  onClick={() => {
                    trackNextStep("download_cards");
                    setActiveTab("download");
                    handleExportPDF();
                  }}
                  disabled={exporting !== null}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Download Cards
                </button>
                <Link
                  href="/create"
                  onClick={() => trackNextStep("create_another")}
                  className="rounded-xl bg-white px-4 py-2.5 text-center text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  New card
                </Link>
              </div>
            </div>
          </section>
        )}

        <div className={isFullscreen ? "" : "space-y-6"}>
          {!isFullscreen && (
            <div className="hidden md:flex flex-wrap gap-3 items-start print:hidden">
              <div className={`flex-1 min-w-[300px] rounded-2xl shadow-sm border overflow-hidden ${
                "bg-white border-slate-100"
              }`}>
                <div className={`flex border-b ${"border-slate-100"}`}>
                  <button
                    onClick={() => setActiveTab("play")}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "play" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    🎮 Play
                  </button>
                  <button
                    onClick={() => setActiveTab("share")}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "share" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    🔗 Share
                  </button>
                  <button
                    onClick={() => {
                      trackExportButtonClicked("desktop_tab", "download_cards");
                      trackBatchButtonClicked("open_panel", "desktop_tab");
                      setActiveTab("download");
                      loadBatchPurchases();
                    }}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "download" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    💳 Download Cards
                  </button>
                </div>

                {activeTab === "play" && (
                  <div className="p-4 space-y-4">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="mb-2 text-sm font-bold text-emerald-900">Play together live</p>
                      <StartGameButton cardId={card._id} label="Start room" />
                    </div>
                    <div>
                      <div className={`flex justify-between text-sm mb-1 ${"text-slate-500"}`}>
                        <span>Progress</span>
                        <span>{markedCount}/{totalCells} marked</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${"bg-slate-100"}`}>
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                    <p className={`text-xs ${"text-slate-400"}`}>Tap any cell on the card to mark it. Get a row, column, or diagonal to win!</p>
                    <div className="flex gap-2">
                      <button onClick={resetGame} className={`flex-1 py-2.5 text-sm font-semibold border-2 rounded-xl transition-all ${"border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50"}`}>
                        🔄 Reset
                      </button>
                      <button onClick={undoLast} disabled={undoStack.length === 0} className={`flex-1 py-2.5 text-sm font-semibold border-2 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed ${"border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-600 hover:bg-amber-50"}`}>
                        ↩ Undo
                      </button>
                    </div>
                    <button onClick={toggleFullscreen} className={`w-full py-2.5 text-sm font-semibold border-2 rounded-xl transition-all ${"border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50"}`}>
                      ⛶ Fullscreen
                    </button>
                    <button
                      onClick={() => card.shareLink ? copyShareLink("play_tab") : generateShareLink("play_tab")}
                      disabled={generatingLink}
                      className="w-full py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-60"
                    >
                      {generatingLink ? "Creating link..." : copied ? "Copied!" : card.shareLink ? "Copy Player Link" : "Create Player Link"}
                    </button>
                  </div>
                )}

                {activeTab === "share" && (
                  <div ref={sharePanelRef} className="p-4">
                    {sharePanel}
                  </div>
                )}

                {activeTab === "download" && (
                  <div className="p-4">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 bg-amber-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                              {isPremiumBatchUser ? "Premium PDF packs" : "Paid PDF packs"}
                            </p>
                            <h3 className="mt-1 text-lg font-black text-slate-950">
                              Generate printable cards
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">
                              Choose how many unique cards to generate, then download the PDF.
                            </p>
                          </div>
                          {!isPremiumBatchUser && (
                            <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-right shadow-sm ring-1 ring-amber-200">
                              <p className="text-[11px] font-black uppercase text-slate-500">
                                {hasSelectedBatchPurchase ? "Paid" : "Due today"}
                              </p>
                              <p className="text-2xl font-black text-slate-950">
                                {hasSelectedBatchPurchase ? "$0" : selectedBatchPrice}
                              </p>
                              <p className="text-[11px] font-bold text-slate-500">
                                {selectedPack.label}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4">
                        {!shouldUseBatchForPdf && (
                          <button onClick={handleExportPDF} disabled={exporting !== null} className="mb-4 w-full px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold text-sm">
                            {exporting === "pdf" ? (
                              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Generating...</span></>
                            ) : (
                              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 0 0 2-2V9.414a1 1 0 0 0-.293-.707l-5.414-5.414A1 1 0 0 0 12.586 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" /></svg><span>Download Cards</span></>
                            )}
                          </button>
                        )}

                        <div className="space-y-2">
                          {CARD_COUNT_OPTIONS.map((n) => {
                            const isSelected = batchCount === n;
                            const isReady = !isPremiumBatchUser && (availableBatchCounts[n] || 0) > 0;
                            const isPaidDue = !isPremiumBatchUser && !isReady;

                            return (
                              <button
                                key={n}
                                onClick={() => selectBatchCount(n, "card_page_desktop")}
                                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                                  isSelected
                                    ? isPremiumBatchUser || isReady
                                      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                                      : "border-amber-500 bg-amber-50 ring-1 ring-amber-500"
                                    : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40"
                                }`}
                              >
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                  isSelected
                                    ? isPremiumBatchUser || isReady
                                      ? "border-emerald-600 bg-emerald-600"
                                      : "border-amber-600 bg-amber-600"
                                    : "border-slate-300"
                                }`}>
                                  {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-black text-slate-950">{n} printable cards</span>
                                    {n === 500 && isPaidDue && (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">Best value</span>
                                    )}
                                    {isReady && (
                                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">Already paid</span>
                                    )}
                                    {isPaidDue && (
                                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black uppercase text-white">Paid</span>
                                    )}
                                  </span>
                                  <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                                    {isPremiumBatchUser ? "Included with Premium" : isReady ? "Ready to generate" : `${formatPerCard(n)} one-time`}
                                  </span>
                                </span>
                                <span className="text-right">
                                  <span className={`block text-lg font-black ${isPaidDue ? "text-amber-700" : "text-slate-950"}`}>
                                    {isPremiumBatchUser ? "Included" : isReady ? "$0" : BATCH_PACKS[n].label}
                                  </span>
                                  {isSelected && (
                                    <span className={`block text-[11px] font-black uppercase ${
                                      isPremiumBatchUser || isReady ? "text-emerald-700" : "text-amber-700"
                                    }`}>
                                      Selected
                                    </span>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {batchResult ? (
                          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                            <div>
                              <p className="text-sm font-black text-emerald-900">
                                {batchPdfDownloaded ? "Your PDF export started." : `${batchResult.count} cards are ready.`}
                              </p>
                              <p className="mt-1 text-xs text-emerald-700">
                                {batchPdfDownloaded
                                  ? "You can go back to the card or download the PDF again."
                                  : "Download the PDF now or create another set."}
                              </p>
                            </div>
                            <button
                              onClick={() => handleBatchPdfDownload(1)}
                              disabled={batchPdfLoading !== null}
                              className={`w-full rounded-xl py-3 text-sm font-black transition ${
                                batchPdfLoading === "pdf-1" ? "bg-red-700 text-white cursor-wait" : "bg-red-600 text-white hover:bg-red-700"
                              }`}
                            >
                              {batchPdfLoading === "pdf-1"
                                ? "Generating PDF..."
                                : batchPdfDownloaded
                                  ? "Download Again"
                                  : "Download Cards"}
                            </button>
                            {batchPdfDownloaded && (
                              <button
                                onClick={returnToCard}
                                className="w-full rounded-xl bg-emerald-700 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
                              >
                                Back to Card
                              </button>
                            )}
                            <button
                              onClick={() => setBatchResult(null)}
                              className="w-full py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                            >
                              Create More
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                  {isPremiumBatchUser || hasSelectedBatchPurchase ? "Ready to generate" : "Paid batch pack"}
                                </p>
                                <p className="mt-0.5 text-base font-black text-slate-950">{batchCount} cards</p>
                                <p className="text-xs text-slate-600">
                                  Generate now, then export as PDF.
                                </p>
                              </div>
                              {!isPremiumBatchUser && (
                                <div className="text-right">
                                  <p className="text-[11px] font-black uppercase text-slate-500">
                                    {hasSelectedBatchPurchase ? "Paid" : "Due today"}
                                  </p>
                                  <p className="text-3xl font-black text-slate-950">
                                    {hasSelectedBatchPurchase ? "$0" : selectedBatchPrice}
                                  </p>
                                  <p className="text-[11px] font-semibold text-slate-500">
                                    {hasSelectedBatchPurchase ? "Ready" : "One-time"}
                                  </p>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={handleBatchPrimaryAction}
                              disabled={batchLoading || batchCheckoutLoading}
                              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
                            >
                              {batchActionLabel}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Card grid */}
          <div className={isFullscreen ? "bingo-container w-full max-w-2xl mx-auto" : "w-full"}>
           <ThemedCardWrapper theme={card.style?.theme} title={card.title}>
            <div className={`rounded-2xl shadow-sm border p-3 md:p-6 print-card ${"bg-white border-slate-100"}`} ref={cardRef}>
              <div className="text-center mb-3 md:mb-6">
                <div className="flex flex-wrap items-center justify-center gap-2 mb-3 print:hidden">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wide">
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
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {variant === "classic75" && (
                <div className="mb-2 grid gap-1.5 md:gap-2 text-center text-sm font-black text-emerald-700" style={{ gridTemplateColumns: `repeat(${shape.columns}, 1fr)` }}>
                  {"BINGO".split("").map((letter) => (
                    <div key={letter} className="rounded-lg bg-emerald-50 py-1">{letter}</div>
                  ))}
                </div>
              )}
              <div ref={gridRef} className="grid gap-1.5 md:gap-2 w-full bingo-grid-print" style={{ gridTemplateColumns: `repeat(${shape.columns}, 1fr)` }}>
                {card.cells.map((cell, index) => {
                  const isFreeSpace = card.freeSpace && index === freeSpaceIdx;
                  const isBlank90 = isBlankClassicCell(cell, variant);
                  const isMarked = marked.has(index);

                  return (
                    <button
                      key={index}
                      onClick={() => toggleCell(index)}
                      className={`
                        aspect-square flex items-center justify-center text-center rounded-xl font-semibold transition-all duration-150 select-none touch-manipulation overflow-hidden
                        ${isBlank90
                          ? "bg-amber-50 border border-dashed border-amber-100 text-transparent cursor-default"
                          : isFreeSpace
                          ? "bg-emerald-600 text-white cursor-default shadow-md"
                          : isMarked
                            ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300"
                            : "bg-slate-50 text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 active:scale-95"
                        }
                      `}
                      style={{
                        fontSize: `clamp(0.5rem, ${card.size === 3 ? "3vw" : card.size === 4 ? "2.35vw" : "1.75vw"}, ${card.size === 3 ? "0.95rem" : card.size === 4 ? "0.82rem" : "0.72rem"})`,
                        padding: "4px",
                        fontFamily: card.style.fontFamily || "inherit",
                        ...(isMarked || isFreeSpace ? {} : {
                          backgroundColor: card.style.backgroundColor || undefined,
                          color: card.style.textColor || undefined,
                          borderColor: card.style.borderColor || undefined,
                        }),
                      }}
                      aria-label={isBlank90 ? "Blank" : isFreeSpace ? "Free space" : `${formatClassicCellLabel(cell, variant)} - ${isMarked ? "marked" : "not marked"}`}
                    >
                      {isBlank90 ? (
                        <span className="sr-only">Blank</span>
                      ) : isFreeSpace ? (
                        <span className="font-black text-xs">FREE</span>
                      ) : isMarked ? (
                        <span className="flex flex-col items-center gap-0.5">
                          <span className="text-base leading-none">✓</span>
                          {isImageCell(cell) ? (
                            parseImageCell(cell)?.fit === "cover" ? (
                              <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="absolute inset-0 w-full h-full object-cover rounded-lg md:rounded-xl opacity-60" />
                            ) : (
                              <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="max-w-[60%] max-h-[40%] object-contain opacity-60" />
                            )
                          ) : (
                            <span className="w-full min-w-0 max-w-full opacity-60 line-through leading-tight break-words text-center [overflow-wrap:anywhere]" style={{ fontSize: fittedSizes.has(index) ? `${fittedSizes.get(index)! * 0.55}px` : "0.6em" }}>{formatClassicCellLabel(cell, variant)}</span>
                          )}
                        </span>
                      ) : isImageCell(cell) ? (
                        parseImageCell(cell)?.fit === "cover" ? (
                          <span className="w-full h-full relative">
                            <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="absolute inset-0 w-full h-full object-cover rounded-lg md:rounded-xl" loading="lazy" />
                            {getCellDisplayText(cell) && <span className="absolute bottom-1 left-1 right-1 text-[0.55em] leading-tight text-center truncate bg-black/40 text-white px-1 py-0.5 rounded">{getCellDisplayText(cell)}</span>}
                          </span>
                        ) : (
                          <span className="flex flex-col items-center gap-0.5 w-full h-full justify-center p-1">
                            <img src={parseImageCell(cell)?.imageUrl} alt={getCellDisplayText(cell)} className="max-w-full max-h-[70%] object-contain" loading="lazy" />
                            {getCellDisplayText(cell) && <span className="text-[0.55em] leading-tight text-center w-full truncate">{getCellDisplayText(cell)}</span>}
                          </span>
                        )
                      ) : (
                        <span className="w-full min-w-0 max-w-full break-words leading-tight text-center [overflow-wrap:anywhere]" style={fittedSizes.has(index) ? { fontSize: `${Math.min(fittedSizes.get(index)!, card.size === 5 ? 13 : 16)}px` } : undefined}>{formatClassicCellLabel(cell, variant)}</span>
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
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={resetGame} className={`flex-1 py-2.5 text-sm font-semibold border-2 rounded-xl ${"border-slate-200 text-slate-600"}`}>🔄 Reset</button>
                      <button onClick={undoLast} disabled={undoStack.length === 0} className={`flex-1 py-2.5 text-sm font-semibold border-2 rounded-xl disabled:opacity-30 ${"border-slate-200 text-slate-600"}`}>↩ Undo</button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={toggleFullscreen} className={`flex-1 py-2.5 text-sm font-semibold border-2 rounded-xl ${"border-slate-200 text-slate-600"}`}>⛶ Fullscreen</button>
                      <button
                        onClick={openShareEmailFromMobile}
                        disabled={generatingLink}
                        className="flex-1 py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl disabled:opacity-60"
                      >
                        {generatingLink ? "..." : "Email share"}
                      </button>
                    </div>
                  </div>
                )}
                {activeTab === "share" && (
                  <div className="space-y-2">
                    {sharePanel}
                  </div>
                )}
                {activeTab === "download" && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-amber-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">
                            {isPremiumBatchUser ? "Premium PDF packs" : "Paid PDF packs"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-700">
                            {isPremiumBatchUser ? "Included with Premium." : `Selected: ${selectedBatchPrice}`}
                          </p>
                        </div>
                        {!isPremiumBatchUser && (
                          <div className="rounded-xl bg-white px-3 py-2 text-right text-slate-950 shadow-sm ring-1 ring-amber-200">
                            <p className="text-[11px] font-black uppercase">{hasSelectedBatchPurchase ? "Paid" : "Due today"}</p>
                            <p className="text-xl font-black">{hasSelectedBatchPurchase ? "$0" : selectedBatchPrice}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {!shouldUseBatchForPdf && (
                      <button onClick={handleExportPDF} disabled={exporting !== null} className="w-full py-2.5 bg-red-600 text-white rounded-xl disabled:opacity-50 font-semibold text-sm">
                        {exporting === "pdf" ? "..." : "📄 Download Cards"}
                      </button>
                    )}
                    <div className="space-y-2">
                      {CARD_COUNT_OPTIONS.map((n) => (
                        <button
                          key={n}
                          onClick={() => selectBatchCount(n, "card_page_mobile")}
                          className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left text-xs transition-all ${
                            batchCount === n
                              ? isPremiumBatchUser || (availableBatchCounts[n] || 0) > 0
                                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                                : "border-amber-600 bg-amber-50 text-amber-900"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                            batchCount === n
                              ? isPremiumBatchUser || (availableBatchCounts[n] || 0) > 0
                                ? "border-emerald-600 bg-emerald-600"
                                : "border-amber-600 bg-amber-600"
                              : "border-slate-300"
                          }`}>
                            {batchCount === n && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </span>
                          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                            <div>
                              <p className="font-black text-slate-900">{n} cards</p>
                              <p className="text-[11px] text-slate-500">
                                {isPremiumBatchUser
                                  ? "Included"
                                  : (availableBatchCounts[n] || 0) > 0
                                    ? "Already paid"
                                    : `${formatPerCard(n)} one-time`}
                              </p>
                              {n === 500 && !isPremiumBatchUser && (
                                <p className="mt-0.5 text-[10px] font-black uppercase text-amber-700">Best value</p>
                              )}
                            </div>
                            {!isPremiumBatchUser && (
                              <div className="text-right">
                                <p className={`font-black ${(availableBatchCounts[n] || 0) > 0 ? "text-slate-900" : "text-amber-700"}`}>
                                  {(availableBatchCounts[n] || 0) > 0 ? "$0" : BATCH_PACKS[n].label}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {batchCount === n ? "Selected" : (availableBatchCounts[n] || 0) > 0 ? "Paid" : "Paid"}
                                </p>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    {batchResult ? (
                      <div className="space-y-2">
                        {batchPdfDownloaded && (
                          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                            Download started. You can go back to the card or download again.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleBatchPdfDownload(1)}
                            disabled={batchPdfLoading !== null}
                            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl disabled:opacity-50 font-semibold text-sm"
                          >
                            {batchPdfLoading ? "..." : batchPdfDownloaded ? "Download Again" : "📄 Download Cards"}
                          </button>
                          <button
                            onClick={batchPdfDownloaded ? returnToCard : () => setBatchResult(null)}
                            className="py-2.5 px-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm"
                          >
                            {batchPdfDownloaded ? "Back" : "More"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                      {!isPremiumBatchUser && !hasSelectedBatchPurchase && (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                          Selected paid download: {selectedBatchPrice} due at checkout for {batchCount} printable cards.
                        </p>
                      )}
                      <button
                        onClick={handleBatchPrimaryAction}
                        disabled={batchLoading || batchCheckoutLoading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl disabled:opacity-50 font-black text-sm"
                      >
                        {batchActionLabel}
                      </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center px-3 py-2 gap-2">
              <button
                onClick={() => { setActiveTab("play"); setBarExpanded(v => activeTab === "play" ? !v : true); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "play" && barExpanded ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                🎮 Play · {markedCount}/{totalCells}
              </button>
              <button
                onClick={openShareEmailFromMobile}
                disabled={generatingLink}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "share" && barExpanded ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {generatingLink ? "..." : "🔗 Share"}
              </button>
              <button
                onClick={() => {
                  trackExportButtonClicked("mobile_tab", "download_cards");
                  trackBatchButtonClicked("open_panel", "mobile_tab");
                  setActiveTab("download");
                  setBarExpanded(v => activeTab === "download" ? !v : true);
                  loadBatchPurchases();
                }}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${activeTab === "download" && barExpanded ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                💳 Download
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
