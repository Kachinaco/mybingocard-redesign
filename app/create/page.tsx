"use client";

import { trackCardCreated } from "@/lib/analytics";
import { useAnalytics } from "@/lib/analytics/client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import AdUnit from "@/components/AdUnit";
import UpgradeModal from "@/components/UpgradeModal";
import CardUsageBadge from "@/components/CardUsageBadge";
import ImagePickerModal from "@/components/ImagePickerModal";
import BingoCell from "@/components/BingoCell";
import { isImageCell, parseImageCell, encodeImageCell } from "@/lib/cellContent";
import {
  BATCH_PACKS,
  formatBatchPackPrice,
  isBatchCount,
  type BatchCount,
} from "@/lib/batchPacks";
import { redirectToCheckout } from "@/lib/upgrade";

type GridSize = 3 | 4 | 5;
type PlanType = "FREE" | "PREMIUM";

interface CellStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  fontSize?: string;
  fontFamily?: string;
  headerText?: string;
  footerText?: string;
}

type AutoSaveState = "idle" | "saving" | "saved" | "error";
type BatchPdfOption = "pdf-1" | "pdf-2" | "pdf-4" | "pdf-gray" | null;
type AvailableBatchCounts = Partial<Record<BatchCount, number>>;

type CardPayload = {
  title: string;
  description: string;
  size: GridSize;
  cells: string[];
  freeSpace: boolean;
  isPublic: boolean;
  style: CellStyle;
};

function CreateCardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionData = useSession();
  const { track, trackOnce } = useAnalytics();
  const session = sessionData?.data;
  const searchParamsKey = searchParams.toString();
  const cardIdFromUrl = searchParams.get("cardId");
  const [size, setSize] = useState<GridSize>(3);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cells, setCells] = useState<string[]>(Array(9).fill(""));
  const [freeSpace, setFreeSpace] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [style, setStyle] = useState<CellStyle>({
    backgroundColor: "#ffffff",
    textColor: "#0f172a", // slate-900
    borderColor: "#e2e8f0", // slate-200
    fontSize: "16px",
    fontFamily: "Arial",
    headerText: "",
    footerText: "",
  });
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchCount, setBatchCount] = useState<BatchCount>(30);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{count: number; cardIds: string[]} | null>(null);
  const [batchPdfLoading, setBatchPdfLoading] = useState<BatchPdfOption>(null);
  const [availableBatchCounts, setAvailableBatchCounts] = useState<AvailableBatchCounts>({});
  const [batchCheckoutLoading, setBatchCheckoutLoading] = useState(false);
  const [loadingBatchPurchases, setLoadingBatchPurchases] = useState(false);
  const [currentCardId, setCurrentCardId] = useState<string | null>(cardIdFromUrl);
  const [isLoadingCard, setIsLoadingCard] = useState(Boolean(cardIdFromUrl));
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("idle");
  const [autoSaveError, setAutoSaveError] = useState("");
  const [permissionStatus, setPermissionStatus] = useState<{
    allowed: boolean;
    reason?: string;
    upgradeRequired?: boolean;
    cardsCreated?: number;
    cardsLimit?: number;
    planType?: PlanType;
  } | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [imagePickerCellIndex, setImagePickerCellIndex] = useState<number | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const currentCardIdRef = useRef<string | null>(cardIdFromUrl);
  const createInFlightRef = useRef(false);

  useEffect(() => {
    currentCardIdRef.current = currentCardId;
  }, [currentCardId]);

  // Check permissions on mount
  useEffect(() => {
    const checkPermission = async () => {
      if (session?.user) {
        try {
          const response = await fetch("/api/cards/can-create");
          const data = await response.json();
          setPermissionStatus(data);
        } catch (error) {
          console.error("Failed to check permissions:", error);
        } finally {
          setCheckingPermission(false);
        }
      } else {
        setCheckingPermission(false);
      }
    };
    checkPermission();
  }, [session]);

  const loadBatchPurchases = async (expectedBatchCount?: BatchCount) => {
    if (!session?.user || permissionStatus?.planType !== "FREE") {
      setAvailableBatchCounts({});
      return;
    }

    setLoadingBatchPurchases(true);

    try {
      const shouldPoll = searchParams.get("batchPurchase") === "success" && expectedBatchCount;
      const attempts = shouldPoll ? 5 : 1;

      for (let attempt = 0; attempt < attempts; attempt++) {
        const response = await fetch("/api/batch-purchases", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load batch purchases");
        }

        const nextCounts = Object.entries(data.availableByCount || {}).reduce<AvailableBatchCounts>(
          (acc, [key, value]) => {
            const numericKey = Number(key);
            if (isBatchCount(numericKey)) {
              acc[numericKey] = Number(value);
            }
            return acc;
          },
          {}
        );

        setAvailableBatchCounts(nextCounts);

        if (!shouldPoll || (expectedBatchCount && (nextCounts[expectedBatchCount] || 0) > 0)) {
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (loadError) {
      console.error("Failed to load batch purchases:", loadError);
    } finally {
      setLoadingBatchPurchases(false);
    }
  };

  useEffect(() => {
    const batchCountFromUrl = Number(searchParams.get("batchCount"));
    if (isBatchCount(batchCountFromUrl)) {
      setBatchCount(batchCountFromUrl);
    }
  }, [searchParamsKey]);

  useEffect(() => {
    if (!session?.user || checkingPermission) {
      return;
    }

    const batchCountFromUrl = Number(searchParams.get("batchCount"));
    loadBatchPurchases(isBatchCount(batchCountFromUrl) ? batchCountFromUrl : undefined);
  }, [session?.user, checkingPermission, permissionStatus?.planType, searchParamsKey]);

  // Update cells array when grid size changes
  useEffect(() => {
    const totalCells = size * size;
    setCells((prev) => {
      const newCells = Array(totalCells).fill("");
      // Copy existing values up to the new size
      for (let i = 0; i < Math.min(prev.length, totalCells); i++) {
        newCells[i] = prev[i];
      }
      return newCells;
    });
  }, [size]);

  useEffect(() => {
    let cancelled = false;

    const loadCard = async (cardId: string) => {
      setIsLoadingCard(true);
      try {
        const response = await fetch(`/api/cards/${cardId}`);
        if (!response.ok) {
          throw new Error("Failed to load card");
        }

        const data = await response.json();
        if (cancelled || !data.card) {
          return;
        }

        const nextStyle = {
          backgroundColor: "#ffffff",
          textColor: "#0f172a",
          borderColor: "#e2e8f0",
          fontSize: "16px",
          fontFamily: "Arial",
          ...(data.card.style || {}),
        };

        setCurrentCardId(data.card._id);
        setTitle(data.card.title || "");
        setDescription(data.card.description || "");
        setSize(data.card.size);
        setCells(Array.isArray(data.card.cells) ? data.card.cells : []);
        setFreeSpace(Boolean(data.card.freeSpace));
        setIsPublic(Boolean(data.card.isPublic));
        setStyle(nextStyle);
        setError("");
        setAutoSaveState("saved");
        setAutoSaveError("");
        lastSavedSnapshotRef.current = JSON.stringify({
          title: data.card.title || "",
          description: data.card.description || "",
          size: data.card.size,
          cells: Array.isArray(data.card.cells) ? data.card.cells : [],
          freeSpace: Boolean(data.card.freeSpace),
          isPublic: Boolean(data.card.isPublic),
          style: nextStyle,
        });
      } catch (loadError) {
        if (!cancelled) {
          console.error("Failed to load existing card:", loadError);
          setError("Failed to load the saved card.");
          setAutoSaveState("error");
          setAutoSaveError("Failed to load saved card");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCard(false);
        }
      }
    };

    const loadDraftOrTemplate = () => {
      try {
        const saved = localStorage.getItem("mybingo_card_draft");
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft.title) setTitle(draft.title);
          if (draft.description) setDescription(draft.description);
          if (draft.size) setSize(draft.size as GridSize);
          if (draft.cells) setCells(draft.cells);
          if (typeof draft.freeSpace === "boolean") setFreeSpace(draft.freeSpace);
          if (typeof draft.isPublic === "boolean") setIsPublic(draft.isPublic);
          if (draft.style) {
            setStyle((prev) => ({ ...prev, ...draft.style }));
          }
          // Draft kept in localStorage until successfully saved
        }
      } catch (draftError) {
        console.error("Failed to restore card draft:", draftError);
      }

      const urlTitle = searchParams.get("title");
      const urlSize = searchParams.get("size");
      const urlCells = searchParams.get("cells");
      const urlFreeSpace = searchParams.get("freeSpace");
      const urlStyle = searchParams.get("style");

      if (urlTitle) setTitle(urlTitle);
      if (urlSize) setSize(parseInt(urlSize) as GridSize);
      if (urlCells) {
        try {
          setCells(JSON.parse(urlCells));
        } catch (cellsError) {
          console.error("Failed to parse cells from URL:", cellsError);
        }
      }
      if (urlFreeSpace) setFreeSpace(urlFreeSpace === "true");
      if (urlStyle) {
        try {
          setStyle((prev) => ({ ...prev, ...JSON.parse(urlStyle) }));
        } catch (styleError) {
          console.error("Failed to parse style from URL:", styleError);
        }
      }

      setCurrentCardId(null);
      setAutoSaveState("idle");
      setAutoSaveError("");
      lastSavedSnapshotRef.current = "";
      setIsLoadingCard(false);
    };

    if (cardIdFromUrl && session?.user) {
      loadCard(cardIdFromUrl);
    } else {
      loadDraftOrTemplate();
    }

    // If user just signed in and has a pending draft, auto-save it
    const hasDraft = !!localStorage.getItem("mybingo_card_draft");
    if (session?.user && hasDraft && !cardIdFromUrl) {
      // Delay to let React state settle after draft load
      setTimeout(async () => {
        const stillHasDraft = !!localStorage.getItem("mybingo_card_draft");
        if (stillHasDraft) {
          const saved = await saveCard({ redirectAfterSave: false, suppressValidationErrors: false });
          if (saved) {
            localStorage.removeItem("mybingo_card_draft");
            router.replace("/dashboard");
          }
        } else if (searchParams.get("new") === "1") {
          router.replace("/dashboard");
        }
      }, 800);
    }

    return () => {
      cancelled = true;
    };
  }, [cardIdFromUrl, searchParamsKey, session?.user]);

  const hasSavableContent = () => {
    if (!title.trim()) {
      return false;
    }

    return cells.some((cell) => cell.trim().length > 0 || isImageCell(cell));
  };

  const getCardPayload = (): CardPayload => ({
    title: title.trim(),
    description,
    size,
    cells,
    freeSpace,
    isPublic,
    style,
  });

  const saveCard = async (options?: { redirectAfterSave?: boolean; suppressValidationErrors?: boolean }) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const payload = getCardPayload();

    if (!payload.title) {
      if (options?.suppressValidationErrors) {
        setAutoSaveState("idle");
        setAutoSaveError("");
      } else {
        setError("Card title is required");
        setAutoSaveState("error");
        setAutoSaveError("Add a title to save");
      }
      return false;
    }

    if (!hasSavableContent()) {
      if (options?.suppressValidationErrors) {
        setAutoSaveState("idle");
        setAutoSaveError("");
      } else {
        setError("Please fill in at least one cell");
        setAutoSaveState("error");
        setAutoSaveError("Add at least one filled cell to save");
      }
      return false;
    }

    setError("");
    setAutoSaveError("");
    setAutoSaveState("saving");

    try {
      let response: Response;

      if (currentCardIdRef.current) {
        response = await fetch(`/api/cards/${currentCardIdRef.current}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } else {
        if (createInFlightRef.current) {
          return false;
        }

        createInFlightRef.current = true;
        response = await fetch("/api/cards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          redirectToSignupForCreation();
          return false;
        }
        if (response.status === 403 && !currentCardIdRef.current) {
          setError(data.error || "Card limit reached. Please upgrade your plan.");
          setShowUpgradeModal(true);
          track("card_limit_reached", { plan_type: permissionStatus?.planType || "FREE" });
        } else {
          setError(data.error || "Failed to save card");
        }
        setAutoSaveState("error");
        setAutoSaveError(data.error || "Failed to save card");
        return false;
      }

      const savedCard = data.card;
      // Clean up draft from localStorage on successful save
      try { localStorage.removeItem("mybingo_card_draft"); } catch (e) {}
      if (savedCard?._id && !currentCardIdRef.current) {
        currentCardIdRef.current = savedCard._id;
        setCurrentCardId(savedCard._id);
        trackCardCreated(savedCard._id, payload.size, payload.isPublic);

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("cardId", savedCard._id);
        nextUrl.searchParams.delete("title");
        nextUrl.searchParams.delete("size");
        nextUrl.searchParams.delete("cells");
        nextUrl.searchParams.delete("freeSpace");
        nextUrl.searchParams.delete("style");
        window.history.replaceState({}, "", nextUrl.toString());
      }

      lastSavedSnapshotRef.current = JSON.stringify(payload);
      setAutoSaveState("saved");

      if (options?.redirectAfterSave) {
        router.push("/dashboard");
      }

      return true;
    } catch (saveError) {
      console.error("Save error:", saveError);
      setError("An error occurred while saving the card");
      setAutoSaveState("error");
      setAutoSaveError("Autosave failed");
      return false;
    } finally {
      createInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const canPersist =
      Boolean(session?.user) &&
      !isLoadingCard &&
      !checkingPermission &&
      (Boolean(currentCardId) || Boolean(permissionStatus?.allowed));

    if (!canPersist) {
      return;
    }

    if (!hasSavableContent()) {
      if (!currentCardId) {
        setAutoSaveState("idle");
        setAutoSaveError("");
      }
      return;
    }

    const snapshot = JSON.stringify(getCardPayload());
    if (snapshot === lastSavedSnapshotRef.current) {
      if (currentCardId) {
        setAutoSaveState("saved");
      }
      return;
    }

    setAutoSaveState("saving");
    autoSaveTimerRef.current = setTimeout(() => {
      saveCard({ suppressValidationErrors: true });
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    session?.user,
    currentCardId,
    isLoadingCard,
    checkingPermission,
    permissionStatus?.allowed,
    title,
    description,
    size,
    cells,
    freeSpace,
    isPublic,
    style,
  ]);

  const handleCellChange = (index: number, value: string) => {
    const newCells = [...cells];
    newCells[index] = value;
    setCells(newCells);
    if (value.trim()) {
      const filledCount = newCells.filter((c) => c.trim()).length;
      trackOnce("card_cells_added", { filled_count: filledCount, grid_size: size });
    }
  };

  const openImagePicker = (index: number) => {
    if (permissionStatus?.planType !== "PREMIUM") {
      setShowUpgradeModal(true);
      return;
    }
    setImagePickerCellIndex(index);
  };

  const handleImagePicked = (imageId: string, imageUrl: string, label: string) => {
    if (imagePickerCellIndex === null) return;
    const encoded = encodeImageCell({ imageId, imageUrl, label });
    handleCellChange(imagePickerCellIndex, encoded);
    setImagePickerCellIndex(null);
  };

  const handleClearImageCell = (index: number) => {
    handleCellChange(index, "");
  };

  const handleShuffleCells = () => {
    const totalCells = size * size;
    const freeIdx = freeSpace ? Math.floor(totalCells / 2) : -1;

    // Collect all non-empty, non-free-space cells
    const filledCells: string[] = [];
    const emptyCells: string[] = [];
    cells.forEach((cell, i) => {
      if (i === freeIdx) return; // skip free space
      if (cell.trim() || isImageCell(cell)) {
        filledCells.push(cell);
      } else {
        emptyCells.push(cell);
      }
    });

    // Fisher-Yates shuffle
    for (let i = filledCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = filledCells[i]; filledCells[i] = filledCells[j]!; filledCells[j] = tmp!;
    }

    // Rebuild the cells array
    const allShuffled = [...filledCells, ...emptyCells];
    const newCells: string[] = [];
    let idx = 0;
    for (let i = 0; i < totalCells; i++) {
      if (i === freeIdx) {
        newCells.push(""); // free space stays empty (rendered as FREE)
      } else {
        newCells.push(allShuffled[idx] || "");
        idx++;
      }
    }
    setCells(newCells);
  };

  const persistDraft = () => {
    try {
      localStorage.setItem("mybingo_card_draft", JSON.stringify({
        title,
        description,
        size,
        cells,
        freeSpace,
        isPublic,
        style,
      }));
    } catch (e) {
      console.error("Failed to save card draft:", e);
    }
  };

  const redirectToSignupForCreation = () => {
    persistDraft();
    setShowAuthModal(true);
  };

  const handleMagicLink = async () => {
    if (!magicEmail.trim()) return;
    setMagicLoading(true);
    try {
      track("magic_link_requested", { callbackUrl: "/create", context: "create_page" });
      await signIn("nodemailer", { email: magicEmail, callbackUrl: "/create", redirect: false });
      setMagicSent(true);
    } catch (e) {
      console.error(e);
    } finally {
      setMagicLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    track("card_save_attempted", { title, size, cells_filled: cells.filter((c) => c.trim()).length });

    try {
      await saveCard({ redirectAfterSave: true });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCheckout = async () => {
    if (!session?.user) {
      redirectToSignupForCreation();
      return;
    }

    setBatchCheckoutLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseType: "batch_pack",
          batchCount,
          successPath: `/create?batchPurchase=success&batchCount=${batchCount}`,
          cancelPath: `/create?batchPurchase=canceled&batchCount=${batchCount}`,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        redirectToSignupForCreation();
        return;
      }

      if (!response.ok) {
        setError(data.error || "Failed to start batch checkout");
        return;
      }

      // Free tier: no Stripe redirect needed, redirect with success params
      if (data.free) {
        setBatchCheckoutLoading(false);
        window.location.href = `/create?batchPurchase=success&batchCount=${batchCount}${currentCardId ? `&cardId=${currentCardId}` : ""}`;
        return;
      }

      if (!data.url) {
        setError("Failed to start batch checkout");
        return;
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      console.error("Batch checkout error:", checkoutError);
      setError("Failed to start batch checkout");
    } finally {
      setBatchCheckoutLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    setBatchLoading(true);
    setError("");
    setBatchResult(null);

    try {
      if (!title.trim()) {
        setError("Card title is required");
        setBatchLoading(false);
        return;
      }

      const filledCells = cells.filter((cell) => cell.trim()).length;
      const neededCells = freeSpace ? size * size - 1 : size * size;
      if (filledCells < neededCells) {
        setError(`Need at least ${neededCells} filled items for batch generation of ${size}x${size} cards`);
        setBatchLoading(false);
        return;
      }

      const response = await fetch("/api/cards/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          size,
          cells: cells.filter(c => c.trim()),
          freeSpace,
          style,
          count: batchCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          redirectToSignupForCreation();
          return;
        }
        if (response.status === 403 && data.batchPurchaseRequired) {
          await loadBatchPurchases(batchCount);
        }
        setError(data.error || "Failed to generate batch cards");
        setBatchLoading(false);
        return;
      }

      setBatchResult({
        count: data.count,
        cardIds: data.cards.map((c: any) => c._id),
      });

      await loadBatchPurchases();
    } catch (err) {
      console.error("Batch error:", err);
      setError("An error occurred during batch generation");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchPdfDownload = async (cardsPerPage: number = 1, grayscale: boolean = false) => {
    if (!batchResult) return;
    const loadingKey: Exclude<BatchPdfOption, null> = grayscale
      ? "pdf-gray"
      : cardsPerPage === 4
        ? "pdf-4"
        : cardsPerPage === 2
          ? "pdf-2"
          : "pdf-1";
    setBatchPdfLoading(loadingKey);

    try {
      const response = await fetch("/api/cards/batch/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardIds: batchResult.cardIds,
          cardsPerPage,
          grayscale,
          showCutLines: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to download PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      // Open in new tab for preview/printing, then also offer download
      const newTab = window.open(url, "_blank");
      if (!newTab) {
        // Popup blocked — fall back to direct download
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

  const getFreeSpaceIndex = () => {
    if (!freeSpace) return -1;
    return Math.floor((size * size) / 2);
  };

  const canUseGridSize = (gridSize: GridSize): boolean => {
    if (!permissionStatus) return true;

    // Map plan types to max grid sizes
    // All grid sizes available on all plans
    return true;
  };

  const getGridSizeTooltip = (gridSize: GridSize): string => {
    if (canUseGridSize(gridSize)) return "";

    if (gridSize === 5) {
      return "5×5 grids require Premium plan";
    } else if (gridSize === 4) {
      return "4×4 grids require Premium plan";
    }
    return "";
  };

  const isEditingExistingCard = Boolean(cardIdFromUrl || currentCardId);
  const editorUnlocked = Boolean(!permissionStatus || permissionStatus.allowed || isEditingExistingCard);
  const autoSaveLabel =
    autoSaveState === "saving"
      ? currentCardId
        ? "Saving changes..."
        : "Creating your card..."
      : autoSaveState === "saved"
        ? currentCardId
          ? "All changes saved"
          : "Draft ready"
        : autoSaveState === "error"
          ? autoSaveError || "Autosave failed"
        : session?.user
          ? "Changes save automatically"
          : "Sign in to save automatically";
  const isPremiumBatchUser = permissionStatus?.planType === "PREMIUM";
  const selectedBatchPrice = formatBatchPackPrice(batchCount);
  const selectedBatchPurchases = availableBatchCounts[batchCount] || 0;
  const hasSelectedBatchPurchase = selectedBatchPurchases > 0;
  const batchPurchaseStatus = searchParams.get("batchPurchase");
  const batchStatusMessage =
    batchPurchaseStatus === "success"
      ? hasSelectedBatchPurchase
        ? `${batchCount}-card batch purchased. It is ready to generate.`
        : `Payment received. If your ${batchCount}-card batch does not unlock within a few seconds, refresh this page.`
      : batchPurchaseStatus === "canceled"
        ? "Batch purchase canceled."
        : "";
  const availableBatchSummary = ([30, 100, 250, 500] as const)
    .filter((count) => (availableBatchCounts[count] || 0) > 0)
    .map((count) => `${count}-card x${availableBatchCounts[count]}`)
    .join(", ");
  const batchActionLabel = checkingPermission && session?.user
    ? "Checking your plan..."
    : batchLoading
      ? `Generating ${batchCount} cards...`
      : batchCheckoutLoading
        ? "Redirecting to checkout..."
        : isPremiumBatchUser || hasSelectedBatchPurchase
          ? `Generate ${batchCount} Unique Cards`
          : session?.user
            ? `Buy ${batchCount}-Card Batch • ${selectedBatchPrice}`
            : `Sign in to buy ${batchCount}-Card Batch • ${selectedBatchPrice}`;
  const batchActionDisabled =
    showPreview ||
    batchLoading ||
    batchCheckoutLoading ||
    (Boolean(session?.user) && checkingPermission) ||
    (permissionStatus?.planType === "FREE" && loadingBatchPurchases);
  const handleBatchPrimaryAction = isPremiumBatchUser || hasSelectedBatchPurchase
    ? handleBatchGenerate
    : handleBatchCheckout;

  return (
    <div className="min-h-screen bg-[#f2f2f7] selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-[#007AFF] rounded-xl flex items-center justify-center shadow-sm transition-all duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">
              MyBingoCard
            </span>
          </Link>
          
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm font-medium text-gray-600 hover:text-[#007AFF] transition-colors"
            >
              {showPreview ? "Back to Edit" : "Preview Card"}
            </button>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-all duration-200"
            >
              Cancel
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32 md:pb-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditingExistingCard ? "Edit Bingo Card" : "Create Bingo Card"}
              </h1>
              <p className="mt-2 text-sm text-gray-500">{autoSaveLabel}</p>
              {!checkingPermission && permissionStatus && permissionStatus.cardsCreated !== undefined && permissionStatus.cardsLimit !== undefined && permissionStatus.planType && (
                <div className="mt-2">
                  <CardUsageBadge
                    cardsCreated={permissionStatus.cardsCreated}
                    cardsLimit={permissionStatus.cardsLimit}
                    planType={permissionStatus.planType}
                  />
                </div>
              )}
            </div>
             {/* Usage Banner */}
            {!checkingPermission && permissionStatus && (
              <div className={`hidden md:flex items-center gap-4 px-4 py-2 rounded-full border ${
                permissionStatus.allowed || isEditingExistingCard
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                  : "bg-amber-50 border-amber-100 text-amber-800"
              }`}>
                  <span className="text-sm font-semibold">
                     {permissionStatus.planType || "FREE"} Plan
                  </span>
                  <span className="w-px h-4 bg-current opacity-20"></span>
                  <span className="text-sm opacity-90">
                     {permissionStatus.cardsLimit === -1
                      ? "Unlimited Cards"
                      : `${permissionStatus.cardsCreated}/${permissionStatus.cardsLimit} used`}
                  </span>
                   {permissionStatus.upgradeRequired && !isEditingExistingCard && (
                    <button
                      onClick={redirectToCheckout}
                      className="ml-2 px-3 py-1 bg-white rounded-full text-xs font-bold shadow-sm hover:shadow transition-all"
                    >
                      Upgrade
                    </button>
                  )}
              </div>
            )}
          </div>

          {/* Sign-in prompt for anonymous users */}
          {!session?.user && !checkingPermission && (
            <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-xl text-[#007AFF] flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                Build your card first. Sign up free when you&apos;re ready to save it.{" "}
                <Link href="/signup?callbackUrl=/create" className="font-semibold underline underline-offset-2 hover:text-[#007AFF]">
                  Sign up now
                </Link>{" "}
                or{" "}
                <Link href="/login?callbackUrl=/create" className="font-semibold underline underline-offset-2 hover:text-[#007AFF]">
                  log in
                </Link>{" "}
                if you already have an account.
              </span>
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {isLoadingCard && (
            <div className="mb-8 p-4 bg-white border border-gray-200 rounded-xl text-gray-600 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-[#007AFF] rounded-full animate-spin"></div>
              Loading saved card...
            </div>
          )}

          {/* Paywall - Free user card limit reached */}
          {permissionStatus && !permissionStatus.allowed && permissionStatus.upgradeRequired && !isEditingExistingCard && (
            <div className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[#007AFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;ve used your free card</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Upgrade to Premium for unlimited cards, all grid sizes, templates, and HD exports.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={redirectToCheckout}
                  className="bg-[#007AFF] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-sm transition-all"
                >
                  Upgrade to Premium — $4.99/mo
                </button>
                <Link
                  href="/dashboard"
                  className="px-6 py-4 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
              <p className="mt-4 text-xs text-gray-400">Billed at $4.99/month. Cancel anytime.</p>
            </div>
          )}

          {/* Ad placement for free users */}
          {(!permissionStatus?.planType || permissionStatus.planType === "FREE") && (
            <div className="mb-6">
              <AdUnit slot="create-page" format="horizontal" className="rounded-xl overflow-hidden" />
            </div>
          )}

          {editorUnlocked && !isLoadingCard && (
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Panel - Card Settings */}
            <div className="lg:col-span-4 space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                   <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#007AFF] flex items-center justify-center">1</span>
                   Card Details
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Card Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => {
                        if (title.trim()) {
                          trackOnce("card_title_entered", { title: title.trim() });
                        }
                      }}
                      placeholder="e.g., Wedding Bingo"
                      className="w-full px-4 py-3 bg-[#f2f2f7] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] outline-none transition-all duration-200 placeholder:text-gray-400"
                      disabled={showPreview}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description <span className="font-normal text-gray-500">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add some instructions for your players..."
                      rows={3}
                      className="w-full px-4 py-3 bg-[#f2f2f7] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] outline-none transition-all duration-200 placeholder:text-gray-400 resize-none"
                      disabled={showPreview}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Grid Size
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[3, 4, 5].map((s) => {
                        const gridSize = s as GridSize;
                        const isAllowed = canUseGridSize(gridSize);
                        const tooltip = getGridSizeTooltip(gridSize);

                        return (
                          <div key={s} className="relative group">
                            <button
                              onClick={() => isAllowed && setSize(gridSize)}
                              disabled={showPreview || !isAllowed}
                              className={`w-full py-2.5 rounded-xl border transition-all duration-200 font-medium text-sm ${
                                size === s
                                  ? "border-[#007AFF] bg-blue-50 text-[#007AFF] ring-1 ring-[#007AFF]"
                                  : isAllowed
                                  ? "border-gray-200 bg-white text-gray-600 hover:border-[#007AFF]/30 hover:bg-gray-50"
                                  : "border-gray-200 bg-[#f2f2f7] text-gray-300 cursor-not-allowed"
                              }`}
                            >
                              {s}×{s}
                            </button>
                            {!isAllowed && tooltip && (
                              <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-10 shadow-lg">
                                {tooltip}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                     <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={freeSpace}
                            onChange={(e) => setFreeSpace(e.target.checked)}
                            disabled={showPreview}
                            className="w-5 h-5 text-[#007AFF] border-gray-300 rounded focus:ring-[#007AFF]"
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Include free space</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleShuffleCells}
                      disabled={showPreview}
                      className="flex items-center gap-3 p-3 w-full border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-5 h-5 flex items-center justify-center text-[#007AFF]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700">Shuffle cells</span>
                    </button>

                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="relative flex items-center">
                         <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            disabled={showPreview}
                            className="w-5 h-5 text-[#007AFF] border-gray-300 rounded focus:ring-[#007AFF]"
                        />
                      </div>
                      <div>
                          <div className="text-sm font-medium text-gray-700">Make Public</div>
                          <div className="text-xs text-gray-500">Allow anyone with the link to view</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Style Customization */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                   <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#007AFF] flex items-center justify-center">2</span>
                   Style & Colors
                </h2>

                <div className="space-y-5">
                  {/* Theme Presets */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Quick Themes
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: "Classic", bg: "#ffffff", text: "#0f172a", border: "#e2e8f0", font: "Arial" },
                        { name: "Ocean", bg: "#eff6ff", text: "#1e3a5f", border: "#93c5fd", font: "Georgia" },
                        { name: "Sunset", bg: "#fff7ed", text: "#7c2d12", border: "#fdba74", font: "Georgia" },
                        { name: "Forest", bg: "#f0fdf4", text: "#14532d", border: "#86efac", font: "Verdana" },
                        { name: "Berry", bg: "#fdf2f8", text: "#701a75", border: "#f0abfc", font: "Arial" },
                        { name: "Gold", bg: "#fefce8", text: "#713f12", border: "#fde047", font: "Georgia" },
                        { name: "Slate", bg: "#f8fafc", text: "#334155", border: "#cbd5e1", font: "Verdana" },
                        { name: "Night", bg: "#1e293b", text: "#f1f5f9", border: "#475569", font: "Arial" },
                      ].map((theme) => (
                        <button
                          key={theme.name}
                          onClick={() => setStyle({
                            ...style,
                            backgroundColor: theme.bg,
                            textColor: theme.text,
                            borderColor: theme.border,
                            fontFamily: theme.font,
                          })}
                          disabled={showPreview}
                          className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                            style.backgroundColor === theme.bg && style.textColor === theme.text
                              ? "border-[#007AFF] ring-2 ring-[#007AFF]/20"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div
                            className="w-full h-8 rounded-lg border flex items-center justify-center"
                            style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                          >
                            <span className="text-[10px] font-bold" style={{ color: theme.text }}>B I N G O</span>
                          </div>
                          <span className="text-[10px] font-medium text-gray-600">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Colors (collapsed by default) */}
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-500 uppercase tracking-wide select-none hover:text-[#007AFF] transition-colors">
                      <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Custom Colors
                    </summary>
                    <div className="mt-3 space-y-3">
                      {[
                        { label: "Background", key: "backgroundColor" as const },
                        { label: "Text", key: "textColor" as const },
                        { label: "Borders", key: "borderColor" as const },
                      ].map(({ label, key }) => (
                        <div key={key} className="flex items-center gap-3">
                          <input
                            type="color"
                            value={style[key]}
                            onChange={(e) => setStyle({ ...style, [key]: e.target.value })}
                            disabled={showPreview}
                            className="w-9 h-9 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white flex-shrink-0"
                          />
                          <span className="text-sm text-gray-600 w-20">{label}</span>
                          <div
                            className="flex-1 h-6 rounded-md border border-gray-200"
                            style={{ backgroundColor: style[key] }}
                          ></div>
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* Font Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Font
                      </label>
                      <select
                        value={style.fontFamily}
                        onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
                        disabled={showPreview}
                        className="w-full px-3 py-2.5 bg-[#f2f2f7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                        style={{ fontFamily: style.fontFamily }}
                      >
                        <option value="Arial" style={{ fontFamily: "Arial" }}>Arial</option>
                        <option value="Georgia" style={{ fontFamily: "Georgia" }}>Georgia</option>
                        <option value="Times New Roman" style={{ fontFamily: "Times New Roman" }}>Times New Roman</option>
                        <option value="Courier New" style={{ fontFamily: "Courier New" }}>Courier New</option>
                        <option value="Verdana" style={{ fontFamily: "Verdana" }}>Verdana</option>
                        <option value="Comic Sans MS" style={{ fontFamily: "Comic Sans MS" }}>Comic Sans</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Text Size
                      </label>
                      <div className="flex items-center gap-1 bg-[#f2f2f7] border border-gray-200 rounded-xl p-1">
                        {[
                          { value: "12px", label: "S" },
                          { value: "14px", label: "M" },
                          { value: "16px", label: "L" },
                          { value: "18px", label: "XL" },
                        ].map((s) => (
                          <button
                            key={s.value}
                            onClick={() => setStyle({ ...style, fontSize: s.value })}
                            disabled={showPreview}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                              style.fontSize === s.value
                                ? "bg-white text-[#007AFF] shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Batch Generation */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                   <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#007AFF] flex items-center justify-center">3</span>
                   Batch Generate
                </h2>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors mb-4">
                  <input
                    type="checkbox"
                    checked={batchMode}
                    onChange={(e) => { setBatchMode(e.target.checked); setBatchResult(null); }}
                    className="w-5 h-5 text-[#007AFF] border-gray-300 rounded focus:ring-[#007AFF]"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Enable batch mode</div>
                    <div className="text-xs text-gray-500">Generate multiple unique cards from the same items</div>
                  </div>
                </label>

                {batchMode && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Number of Cards
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {([30, 100, 250, 500] as const).map((n) => (
                          <button
                            key={n}
                            onClick={() => setBatchCount(n)}
                            className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                              batchCount === n
                                ? "border-[#007AFF] bg-blue-50 text-[#007AFF] ring-1 ring-[#007AFF]"
                                : "border-gray-200 bg-white text-gray-600 hover:border-[#007AFF]/30"
                            }`}
                          >
                            <div className="font-semibold">{n}</div>
                            {!isPremiumBatchUser && (
                              <div className="mt-0.5 text-[11px] font-medium text-gray-500">
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

                    {batchStatusMessage && (
                      <div
                        className={`rounded-xl border px-3 py-2 text-xs ${
                          batchPurchaseStatus === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {batchStatusMessage}
                      </div>
                    )}

                    {isPremiumBatchUser ? (
                      <p className="text-xs text-gray-500">
                        Each card will have a unique random arrangement of your items. Premium batch generation is included in your plan.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">
                          Free accounts can buy one-time batch packs. Premium stays unchanged and still includes batch generation.
                        </p>
                        {availableBatchSummary && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                            Purchased and ready: {availableBatchSummary}
                          </div>
                        )}
                      </div>
                    )}

                    {batchResult && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-emerald-800">
                          {batchResult.count} cards generated!
                        </p>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleBatchPdfDownload(1)}
                            disabled={batchPdfLoading !== null}
                            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${
                              batchPdfLoading === "pdf-1"
                                ? "bg-red-700 text-white cursor-wait"
                                : "bg-red-600 text-white hover:bg-red-700"
                            } ${batchPdfLoading !== null && batchPdfLoading !== "pdf-1" ? "cursor-not-allowed" : ""}`}
                          >
                            {batchPdfLoading === "pdf-1" ? "Generating PDF..." : "Download PDF (1 per page)"}
                          </button>
                          <button
                            onClick={() => handleBatchPdfDownload(2)}
                            disabled={batchPdfLoading !== null}
                            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${
                              batchPdfLoading === "pdf-2"
                                ? "bg-red-600 text-white cursor-wait"
                                : "bg-red-500 text-white hover:bg-red-600"
                            } ${batchPdfLoading !== null && batchPdfLoading !== "pdf-2" ? "cursor-not-allowed" : ""}`}
                          >
                            {batchPdfLoading === "pdf-2" ? "Generating PDF..." : "Download PDF (2 per page)"}
                          </button>
                          <button
                            onClick={() => handleBatchPdfDownload(4)}
                            disabled={batchPdfLoading !== null}
                            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${
                              batchPdfLoading === "pdf-4"
                                ? "bg-red-500 text-white cursor-wait"
                                : "bg-red-400 text-white hover:bg-red-500"
                            } ${batchPdfLoading !== null && batchPdfLoading !== "pdf-4" ? "cursor-not-allowed" : ""}`}
                          >
                            {batchPdfLoading === "pdf-4" ? "Generating PDF..." : "Download PDF (4 per page)"}
                          </button>
                          <button
                            onClick={() => handleBatchPdfDownload(1, true)}
                            disabled={batchPdfLoading !== null}
                            className={`w-full py-2 rounded-lg text-sm font-semibold transition ${
                              batchPdfLoading === "pdf-gray"
                                ? "bg-slate-700 text-white cursor-wait"
                                : "bg-slate-600 text-white hover:bg-slate-700"
                            } ${batchPdfLoading !== null && batchPdfLoading !== "pdf-gray" ? "cursor-not-allowed" : ""}`}
                          >
                            {batchPdfLoading === "pdf-gray" ? "Generating..." : "Download Grayscale PDF"}
                          </button>
                        </div>
                        <button
                          onClick={() => router.push("/dashboard/cards")}
                          className="w-full py-2 text-sm text-[#007AFF] hover:text-[#007AFF] font-medium"
                        >
                          View all cards in dashboard
                        </button>
                      </div>
                    )}

                    {!batchResult && (
                      <button
                        onClick={handleBatchPrimaryAction}
                        disabled={batchActionDisabled}
                        className="w-full bg-[#007AFF] text-white px-4 py-3 rounded-xl hover:shadow-sm transition-all disabled:opacity-50 font-bold text-sm"
                      >
                        {batchActionLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Bingo Grid */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {showPreview ? "Card Preview" : "Edit Content"}
                  </h2>
                  {!showPreview && (
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
                      {size}×{size} grid • {size * size} cells
                    </span>
                  )}
                </div>

                {/* Bingo Grid */}
                <div className="flex-grow flex items-center justify-center bg-[#f2f2f7] rounded-xl border border-gray-200 p-3 md:p-6 mb-8">
                   <div className="w-full">
                      {/* Grid Header - matches grid columns */}
                      <div
                        className="grid mb-1.5 md:mb-2 text-center font-bold tracking-widest text-gray-900 opacity-90"
                        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gap: size === 5 ? "4px" : "8px" }}
                      >
                         <div
                           className="py-1.5 text-sm font-bold text-center text-[#007AFF] truncate px-2"
                           style={{ gridColumn: "1 / -1" }}
                         >
                           {title || "My Bingo Card"}
                         </div>
                      </div>

                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: `repeat(${size}, 1fr)`,
                          gap: size === 5 ? "4px" : size === 4 ? "6px" : "8px",
                        }}
                      >
                        {cells.map((cell, index) => {
                          const isFreeSpace = freeSpace && index === getFreeSpaceIndex();
                          const cellIsImage = isImageCell(cell);
                          const imageData = cellIsImage ? parseImageCell(cell) : null;

                          return (
                            <div
                              key={index}
                              className={`aspect-square relative group transition-all duration-200 ${
                                showPreview ? "shadow-sm" : "focus-within:ring-2 focus-within:ring-[#007AFF] focus-within:ring-offset-1"
                              }`}
                              style={{
                                backgroundColor: style.backgroundColor,
                                borderColor: style.borderColor,
                              }}
                            >
                              {isFreeSpace ? (
                                <div
                                  className="w-full h-full flex items-center justify-center border-2 rounded-lg md:rounded-xl font-bold p-1 text-center shadow-inner bg-opacity-90"
                                  style={{
                                    color: "#4338ca",
                                    fontSize: style.fontSize,
                                    fontFamily: style.fontFamily,
                                    borderColor: "#818cf8",
                                    background: "linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%)",
                                  }}
                                >
                                  FREE
                                </div>
                              ) : showPreview ? (
                                <BingoCell cell={cell} style={style} size={size} />
                              ) : cellIsImage && imageData ? (
                                /* Image cell in edit mode — shows image with swap/remove buttons */
                                <div
                                  className="w-full h-full flex flex-col items-center justify-center border rounded-lg md:rounded-xl p-1 overflow-hidden transition-colors"
                                  style={{ borderColor: style.borderColor, backgroundColor: style.backgroundColor }}
                                >
                                  <img
                                    src={imageData.imageUrl}
                                    alt={imageData.label || ""}
                                    className="max-w-full max-h-[60%] object-contain"
                                  />
                                  {imageData.label && (
                                    <span className="text-[9px] md:text-[10px] font-medium text-gray-700 mt-0.5 line-clamp-1 w-full text-center">
                                      {imageData.label}
                                    </span>
                                  )}
                                  {/* Hover overlay with swap & remove */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg md:rounded-xl flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                                    <button
                                      onClick={() => openImagePicker(index)}
                                      className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                                      title="Change image"
                                    >
                                      <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleClearImageCell(index)}
                                      className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                                      title="Remove image"
                                    >
                                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Text cell in edit mode — has camera button to add image */
                                <div className="relative w-full h-full flex flex-col">
                                  <div className="flex-1 flex items-center justify-center border rounded-lg md:rounded-xl overflow-hidden transition-colors hover:bg-gray-50/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#007AFF] focus-within:ring-offset-1"
                                    style={{ borderColor: style.borderColor }}
                                  >
                                    <textarea
                                      value={cell}
                                      onChange={(e) => handleCellChange(index, e.target.value)}
                                      placeholder={`${index + 1}`}
                                      rows={1}
                                      className={`w-full text-center bg-transparent resize-none focus:outline-none placeholder:text-gray-300 leading-tight p-1 ${size === 5 ? "text-xs md:text-sm" : "text-sm"}`}
                                      style={{
                                        color: style.textColor,
                                        fontFamily: style.fontFamily,
                                        height: "auto",
                                        maxHeight: "100%",
                                      }}
                                    />
                                  </div>
                                  {/* Camera button — always visible at bottom of cell */}
                                  <button
                                    onClick={() => openImagePicker(index)}
                                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-gray-200/80 hover:bg-[#007AFF] text-gray-400 hover:text-white flex items-center justify-center transition-all"
                                    title="Add image"
                                    type="button"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                   </div>
                </div>

                {/* Action Buttons - Hidden on mobile (replaced by sticky bar) */}
                <div className="hidden md:flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
                  <Link
                    href="/templates"
                    className="px-6 py-3.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Browse Templates
                  </Link>

                  {permissionStatus && !permissionStatus.allowed && !isEditingExistingCard ? (
                    <button
                      onClick={redirectToCheckout}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white px-6 py-3.5 rounded-xl hover:shadow-sm hover:shadow-orange-500/20 transition-all font-bold text-lg shadow-md shadow-orange-200 text-center"
                    >
                      Limit Reached — Upgrade Plan
                    </button>
                  ) : (
                  <button
                    onClick={handleSave}
                    disabled={
                      loading ||
                      showPreview ||
                      isLoadingCard
                    }
                    className="flex-1 bg-[#007AFF] text-white px-6 py-3.5 rounded-xl hover:shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none font-bold text-lg shadow-sm"
                  >
                    {loading ? "Saving..." : isEditingExistingCard ? "Save & Go to Dashboard" : "Create & Save Card"}
                  </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Mobile sticky bottom action bar */}
        {editorUnlocked && !isLoadingCard && (<div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex gap-2">
              <Link
                href="/templates"
                className="px-4 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm flex items-center justify-center"
              >
                📋 Templates
              </Link>
              {permissionStatus && !permissionStatus.allowed && !isEditingExistingCard ? (
                <button
                  onClick={redirectToCheckout}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white px-4 py-3 rounded-lg font-bold text-sm shadow-md text-center"
                >
                  Upgrade to Create
                </button>
              ) : (
              <button
                onClick={handleSave}
                disabled={loading || showPreview || isLoadingCard}
                className="flex-1 bg-[#007AFF] text-white px-4 py-3 rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed font-bold text-sm shadow-md"
              >
                {loading ? "Saving..." : isEditingExistingCard ? "Save" : "Create & Save"}
              </button>
              )}
            </div>
          </div>
        </div>
        )}
      </main>


      {/* Save Card Auth Modal */}
      {showAuthModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px"
          }}
        >
          <div style={{
            background: "white", borderRadius: "20px", padding: "36px 32px",
            maxWidth: "420px", width: "100%",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            position: "relative", textAlign: "center"
          }}>
            {/* Close */}
            <button
              onClick={() => setShowAuthModal(false)}
              style={{
                position: "absolute", top: "16px", right: "16px",
                background: "#f1f5f9", border: "none", borderRadius: "50%",
                width: "32px", height: "32px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", color: "#64748b", lineHeight: 1
              }}
            >×</button>

            {/* Card saved icon */}
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎯</div>

            <h2 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, color: "#1e293b", letterSpacing: "-0.5px" }}>
              Save your card
            </h2>
            {title && (
              <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#7c3aed", fontWeight: 600 }}>
                &ldquo;{title}&rdquo;
              </p>
            )}
            <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#64748b" }}>
              Free to join — takes 10 seconds
            </p>

            {!magicSent ? (
              <>
                {/* Google */}
                <button
                  onClick={() => signIn("google", { callbackUrl: "/create" })}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                    gap: "10px", padding: "13px 16px", borderRadius: "12px",
                    border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer",
                    fontSize: "15px", fontWeight: 600, color: "#1e293b",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "16px",
                    transition: "all 0.15s"
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "0 0 16px" }}>
                  <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>or use email</span>
                  <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
                </div>

                {/* Magic link email */}
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleMagicLink(); }}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: "10px",
                    border: "1.5px solid #e2e8f0", fontSize: "14px", marginBottom: "10px",
                    outline: "none", boxSizing: "border-box", color: "#1e293b"
                  }}
                />
                <button
                  onClick={handleMagicLink}
                  disabled={magicLoading || !magicEmail.trim()}
                  style={{
                    width: "100%", padding: "13px", borderRadius: "12px", border: "none",
                    background: magicEmail.trim() ? "#7c3aed" : "#e2e8f0",
                    color: magicEmail.trim() ? "white" : "#94a3b8",
                    fontWeight: 700, fontSize: "15px", cursor: magicEmail.trim() ? "pointer" : "default",
                    marginBottom: "16px", transition: "all 0.15s"
                  }}
                >
                  {magicLoading ? "Sending..." : "Send magic link"}
                </button>

                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                  Already have an account?{" "}
                  <a href={"/login?callbackUrl=/create"} style={{ color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>Sign in</a>
                </p>
              </>
            ) : (
              <div style={{ padding: "20px 0" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📬</div>
                <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>Check your inbox</h3>
                <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#64748b", lineHeight: 1.5 }}>
                  We sent a magic link to <strong>{magicEmail}</strong>.<br />Click it to sign in and save your card.
                </p>
                <button
                  onClick={() => { setMagicSent(false); setMagicEmail(""); }}
                  style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}
                >
                  ← Try a different email
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      <ImagePickerModal
        open={imagePickerCellIndex !== null}
        onClose={() => setImagePickerCellIndex(null)}
        onPick={handleImagePicked}
        isPremium={permissionStatus?.planType === "PREMIUM"}
      />
    </div>
  );
}

export default function CreateCardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center text-[#007AFF]">Loading editor...</div>}>
      <CreateCardContent />
    </Suspense>
  );
}
