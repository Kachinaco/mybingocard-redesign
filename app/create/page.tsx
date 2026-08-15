"use client";

import { trackCardCreated } from "@/lib/analytics";
import { useAnalytics } from "@/lib/analytics/client";
import { trackClientActivity } from "@/lib/activity-client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import AdUnit from "@/components/AdUnit";
import UpgradeModal from "@/components/UpgradeModal";
import ImagePickerModal from "@/components/ImagePickerModal";
import BingoCell from "@/components/BingoCell";
import AiGenerateSection from "@/components/AiGenerateSection";
import ShareBatchButton from "@/components/ShareBatchButton";
import StartGameButton from "@/components/StartGameButton";
import { isImageCell, parseImageCell, encodeImageCell } from "@/lib/cellContent";
import {
  BATCH_PACKS,
  formatBatchPackPrice,
  isBatchCount,
  type BatchCount,
} from "@/lib/batchPacks";
import { redirectToCheckout } from "@/lib/upgrade";
import { t } from "@/lib/i18n";
import {
  formatClassicCellLabel,
  generateClassicBingoCard,
  getBingoGridShape,
  getFreeSpaceIndexForGrid,
  normalizeBingoVariant,
  type BingoVariant,
} from "@/lib/classic-bingo";
import {
  getBrowserStorageItem,
  removeBrowserStorageItem,
  setBrowserStorageItem,
} from "@/lib/browser-storage";

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
  rows: number;
  columns: number;
  bingoVariant: BingoVariant;
  cells: string[];
  freeSpace: boolean;
  isPublic: boolean;
  style: CellStyle;
};

const pendingSaveCheckoutIntentKey = "mybingo_pending_save_checkout_intent";
const saveCheckoutCallbackUrl = "/create?checkout=save";
const premiumCheckoutCallbackUrl = "/create?checkout=premium";
type AuthModalIntent = "draft_only" | "save_checkout";

function CreateCardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionData = useSession();
  const appleSignInEnabled = process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === "true";
  const { track, trackOnce } = useAnalytics();
  const session = sessionData?.data;
  const searchParamsKey = searchParams.toString();
  const cardIdFromUrl = searchParams.get("cardId");
  const startNativeOAuth = (provider: "google" | "apple", targetCallbackUrl: string) => {
    if (typeof window === "undefined") return false;

    const nativeHandler = (window as any).webkit?.messageHandlers?.mybingocardOAuth;
    const nativeAppFlag = getBrowserStorageItem("localStorage", "mybingocard-ios-app") === "1";

    if (searchParams.get("app") !== "1" && !nativeAppFlag && !nativeHandler) {
      return false;
    }

    if (nativeHandler) {
      nativeHandler.postMessage({
        provider,
        callbackUrl: targetCallbackUrl || "/dashboard",
      });
      return true;
    }

    window.location.href = `/api/native/oauth/${provider}/start?callbackUrl=${encodeURIComponent(targetCallbackUrl || "/dashboard")}`;
    return true;
  };
  const [size, setSize] = useState<GridSize>(3);
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [bingoVariant, setBingoVariant] = useState<BingoVariant>("custom");
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
  const [authModalIntent, setAuthModalIntent] = useState<AuthModalIntent>("draft_only");
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchCount, setBatchCount] = useState<BatchCount>(30);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchCheckoutLoading, setBatchCheckoutLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{count: number; cardIds: string[]} | null>(null);
  const [batchPdfLoading, setBatchPdfLoading] = useState<BatchPdfOption>(null);
  const [availableBatchCounts, setAvailableBatchCounts] = useState<AvailableBatchCounts>({});
  const [loadingBatchPurchases, setLoadingBatchPurchases] = useState(false);
  const [currentCardId, setCurrentCardId] = useState<string | null>(cardIdFromUrl);
  const [isLoadingCard, setIsLoadingCard] = useState(Boolean(cardIdFromUrl));
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("idle");
  const [autoSaveError, setAutoSaveError] = useState("");
  const [localDraftSaveState, setLocalDraftSaveState] = useState<AutoSaveState>("idle");
  const [permissionStatus, setPermissionStatus] = useState<{
    allowed: boolean;
    reason?: string;
    upgradeRequired?: boolean;
    cardsCreated?: number;
    cardsLimit?: number;
    planType?: PlanType;
    legacyFreeAccess?: boolean;
    hasPremiumAccess?: boolean;
  } | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [mobileToast, setMobileToast] = useState("");
  const [mobileToastKey, setMobileToastKey] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"card_limit" | "ai_generate" | "batch_generate">("card_limit");
  const [imagePickerCellIndex, setImagePickerCellIndex] = useState<number | null>(null);
  const [showNewUserTip, setShowNewUserTip] = useState(false);
  const [showCreatePageAd, setShowCreatePageAd] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const currentCardIdRef = useRef<string | null>(cardIdFromUrl);
  const createInFlightRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const cellTextareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);

  // Tracking refs
  const firstCellAddedAtRef = useRef<number | null>(null);
  const pageLoadedAtRef = useRef<number>(Date.now());
  const styleChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStyleRef = useRef<CellStyle>(style);
  const draftLoadTrackedRef = useRef(false);
  const batchCancelTrackedRef = useRef(false);
  const autoCheckoutStartedRef = useRef(false);
  const autoSaveAfterAuthRef = useRef(false);

  useEffect(() => {
    currentCardIdRef.current = currentCardId;
  }, [currentCardId]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setShowCreatePageAd(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Show new user tip if they have 0 cards and haven't dismissed it
  useEffect(() => {
    if (!checkingPermission && permissionStatus?.cardsCreated === 0 && !cardIdFromUrl) {
      const dismissed = getBrowserStorageItem("localStorage", "new_user_tip_dismissed");
      if (!dismissed) setShowNewUserTip(true);
    }
  }, [checkingPermission, permissionStatus, cardIdFromUrl]);

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
    const requestedBatchMode = searchParams.get("batchMode") === "1" || searchParams.get("batchMode") === "true";
    if (isBatchCount(batchCountFromUrl)) {
      setBatchCount(batchCountFromUrl);
    }
    if (requestedBatchMode) {
      setBatchMode(true);
      setBatchResult(null);
    }
  }, [searchParamsKey]);

  useEffect(() => {
    if (!session?.user || checkingPermission) {
      return;
    }

    const batchCountFromUrl = Number(searchParams.get("batchCount"));
    loadBatchPurchases(isBatchCount(batchCountFromUrl) ? batchCountFromUrl : undefined);
  }, [session?.user, checkingPermission, permissionStatus?.planType, searchParamsKey]);

  // Auto-show auth modal for old guest checkout return URLs.
  useEffect(() => {
    if (
      searchParams.get("batchPurchase") === "success" &&
      searchParams.get("guest") === "true" &&
      !session?.user
    ) {
      setBatchMode(true);
      setShowAuthModal(true);
    }
  }, [searchParams, session?.user]);

  // Track old batch checkout cancel return URLs for analytics continuity.
  useEffect(() => {
    if (batchCancelTrackedRef.current) return;
    if (searchParams.get("batchPurchase") !== "canceled") return;
    batchCancelTrackedRef.current = true;

    const batchCountFromUrl = Number(searchParams.get("batchCount"));
    trackClientActivity("checkout_cancel_clicked", {
      plan: "batch_pack",
      batch_count: isBatchCount(batchCountFromUrl) ? batchCountFromUrl : null,
      session_id: searchParams.get("session_id") || null,
      source: "stripe_redirect",
    });
  }, [searchParams]);

  // Update cells array when grid size changes
  useEffect(() => {
    if (bingoVariant !== "custom") return;
    const totalCells = size * size;
    setRows(size);
    setColumns(size);
    setCells((prev) => {
      const newCells = Array(totalCells).fill("");
      // Copy existing values up to the new size
      for (let i = 0; i < Math.min(prev.length, totalCells); i++) {
        newCells[i] = prev[i];
      }
      return newCells;
    });
  }, [size, bingoVariant]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.requestAnimationFrame(() => {
      cellTextareaRefs.current.forEach((textarea) => {
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      });
    });
  }, [cells, showPreview]);

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
        const nextVariant = normalizeBingoVariant(data.card.bingoVariant);
        const nextShape = getBingoGridShape({
          size: data.card.size,
          rows: data.card.rows,
          columns: data.card.columns,
          bingoVariant: nextVariant,
        });
        setBingoVariant(nextVariant);
        setSize(data.card.size);
        setRows(nextShape.rows);
        setColumns(nextShape.columns);
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
          rows: nextShape.rows,
          columns: nextShape.columns,
          bingoVariant: nextVariant,
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
      let draftSource: "localStorage" | "url_params" | "template" | "empty" = "empty";
      let draftCells: string[] = [];
      let draftHasTitle = false;
      let draftTemplateId: string | undefined;

      try {
        const saved = getBrowserStorageItem("localStorage", "mybingo_card_draft");
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft.title) { setTitle(draft.title); draftHasTitle = true; }
          if (draft.description) setDescription(draft.description);
          const draftVariant = normalizeBingoVariant(draft.bingoVariant);
          const draftShape = getBingoGridShape({
            size: draft.size,
            rows: draft.rows,
            columns: draft.columns,
            bingoVariant: draftVariant,
          });
          setBingoVariant(draftVariant);
          if (draft.size) setSize(draft.size as GridSize);
          setRows(draftShape.rows);
          setColumns(draftShape.columns);
          if (draft.cells) { setCells(draft.cells); draftCells = draft.cells; }
          if (typeof draft.freeSpace === "boolean") setFreeSpace(draft.freeSpace);
          if (typeof draft.isPublic === "boolean") setIsPublic(draft.isPublic);
          if (draft.style) {
            setStyle((prev) => ({ ...prev, ...draft.style }));
          }
          draftSource = "localStorage";
          setLocalDraftSaveState("saved");
          // Draft kept in localStorage until successfully saved
        }
      } catch (draftError) {
        console.error("Failed to restore card draft:", draftError);
      }

      const urlTitle = searchParams.get("title");
      const urlSize = searchParams.get("size");
      const urlVariant = normalizeBingoVariant(searchParams.get("bingoVariant"));
      const urlCells = searchParams.get("cells");
      const urlFreeSpace = searchParams.get("freeSpace");
      const urlStyle = searchParams.get("style");
      const templateId = searchParams.get("templateId");

      if (urlTitle) { setTitle(urlTitle); draftHasTitle = true; }
      if (urlVariant !== "custom") {
        const nextShape = getBingoGridShape({ size: urlVariant === "classic90" ? 3 : 5, bingoVariant: urlVariant });
        setBingoVariant(urlVariant);
        setSize(urlVariant === "classic90" ? 3 : 5);
        setRows(nextShape.rows);
        setColumns(nextShape.columns);
        setFreeSpace(urlVariant === "classic75");
        setCells(generateClassicBingoCard(urlVariant));
      }
      if (urlSize) setSize(parseInt(urlSize) as GridSize);
      if (urlCells) {
        try {
          const parsedCells = JSON.parse(urlCells);
          setCells(parsedCells);
          draftCells = parsedCells;
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

      // Determine draft source for tracking
      if (templateId) {
        draftSource = "template";
        draftTemplateId = templateId;
      } else if (urlTitle || urlCells) {
        draftSource = "url_params";
      }

      // Track card_draft_loaded
      if (!draftLoadTrackedRef.current) {
        draftLoadTrackedRef.current = true;
        const filledCount = (draftCells.length > 0 ? draftCells : []).filter((c: string) => c?.trim()).length;
        trackClientActivity("card_draft_loaded", {
          source: draftSource,
          cells_filled: filledCount,
          has_title: draftHasTitle,
          ...(draftTemplateId ? { templateId: draftTemplateId } : {}),
        });
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

    // If user just signed in and has a pending draft, save it directly from localStorage
    // (avoids race condition where React state hasn't settled yet)
    const draftRaw = getBrowserStorageItem("localStorage", "mybingo_card_draft");
    const pendingDraftSaveLockKey = "mybingo_pending_draft_save_in_progress";
    if (
      session?.user &&
      permissionStatus?.allowed &&
      draftRaw &&
      !cardIdFromUrl &&
      !createInFlightRef.current &&
      getBrowserStorageItem("sessionStorage", pendingDraftSaveLockKey) !== "1"
    ) {
      // Prevent auto-save and duplicate effect runs from also firing POSTs.
      createInFlightRef.current = true;
      setBrowserStorageItem("sessionStorage", pendingDraftSaveLockKey, "1");
      (async () => {
        try {
          const draft = JSON.parse(draftRaw);
          const draftCells = Array.isArray(draft.cells) ? draft.cells : [];
          if (draft.title && draftCells.some((c: string) => c?.trim())) {
            const cellsForDraft = await uploadDataUrlImages(draftCells);
            if (cellsForDraft !== draftCells) {
              setBrowserStorageItem(
                "localStorage",
                "mybingo_card_draft",
                JSON.stringify({ ...draft, cells: cellsForDraft })
              );
            }
            const response = await fetch("/api/cards", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: draft.title,
                description: draft.description || "",
                size: draft.size || 3,
                rows: draft.rows || draft.size || 3,
                columns: draft.columns || draft.size || 3,
                bingoVariant: normalizeBingoVariant(draft.bingoVariant),
                cells: cellsForDraft,
                freeSpace: draft.freeSpace ?? true,
                isPublic: draft.isPublic ?? false,
                style: draft.style || {},
              }),
            });
            if (response.ok) {
              const data = await response.json();
              if (data.card?._id) {
                currentCardIdRef.current = data.card._id;
              }
              removeBrowserStorageItem("localStorage", "mybingo_card_draft");
              router.replace(`/cards/${data.card._id}?created=1`);
              return;
            }
          }
        } catch (e) {
          console.error("Failed to save draft after sign-in:", e);
        } finally {
          createInFlightRef.current = false;
          removeBrowserStorageItem("sessionStorage", pendingDraftSaveLockKey);
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [cardIdFromUrl, searchParamsKey, session?.user, permissionStatus?.allowed]);

  const showMobileToast = (msg: string) => {
    setMobileToast(msg);
    setMobileToastKey((k) => k + 1);
    setTimeout(() => setMobileToast(""), 3500);
  };

  const focusAndRevealTitleInput = () => {
    const input = titleInputRef.current;
    if (!input) return;

    input.focus({ preventScroll: true });
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => {
      input.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
    });
  };

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
    rows,
    columns,
    bingoVariant,
    cells,
    freeSpace: bingoVariant === "classic90" ? false : freeSpace,
    isPublic,
    style,
  });

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex === -1) {
      throw new Error("Invalid data URL");
    }

    const header = dataUrl.slice(0, commaIndex);
    const body = dataUrl.slice(commaIndex + 1);
    const mimeType = /^data:([^;,]+)/.exec(header)?.[1] || "application/octet-stream";

    if (header.includes(";base64")) {
      const binary = window.atob(body);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) {
        bytes[j] = binary.charCodeAt(j);
      }
      return new Blob([bytes], { type: mimeType });
    }

    return new Blob([decodeURIComponent(body)], { type: mimeType });
  };

  // Convert data URL images to server uploads before saving
  const uploadDataUrlImages = async (cellsToProcess: string[]): Promise<string[]> => {
    const updatedCells = [...cellsToProcess];

    for (let i = 0; i < updatedCells.length; i++) {
      const cell = updatedCells[i] ?? "";
      const imgData = parseImageCell(cell);

      // Check if this is a data URL image (temp_ prefix)
      if (imgData && imgData.imageId.startsWith("temp_") && imgData.imageUrl.startsWith("data:")) {
        try {
          // Convert data URL to blob
          const blob = dataUrlToBlob(imgData.imageUrl);

          // Upload to server
          const formData = new FormData();
          formData.append("image", blob, imgData.imageId + ".webp");

          const uploadRes = await fetch("/api/images/upload", {
            method: "POST",
            body: formData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            // Update cell with server URL
            updatedCells[i] = encodeImageCell({
              imageId: uploadData.imageId,
              imageUrl: uploadData.imageUrl,
              label: imgData.label,
              fit: imgData.fit,
            });
          }
          // If upload fails, keep the data URL (card still works)
        } catch {
          // Keep original data URL on error
        }
      }
    }

    return updatedCells;
  };

  const saveCard = async (options?: {
    redirectAfterSave?: boolean;
    suppressValidationErrors?: boolean;
    recoverTitleInput?: boolean;
  }) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // Upload any data URL images to server before saving
    const hasDataUrlImages = cells.some((cell) => {
      const imgData = parseImageCell(cell);
      return imgData && imgData.imageId.startsWith("temp_");
    });

    let cellsToSave = cells;
    if (hasDataUrlImages && session?.user) {
      cellsToSave = await uploadDataUrlImages(cells);
      // Update local state with server URLs
      setCells(cellsToSave);
    }

    const payload = { ...getCardPayload(), cells: cellsToSave };

    const cellsFilledCount = cellsToSave.filter((c) => c.trim()).length;

    if (!payload.title) {
      if (options?.suppressValidationErrors) {
        setAutoSaveState("idle");
        setAutoSaveError("");
      } else {
        trackClientActivity("card_save_blocked", {
          reason: "no_title",
          title: payload.title,
          size: payload.size,
          cells_filled: cellsFilledCount,
        });
        setError(t("error.title_required"));
        setAutoSaveState("error");
        setAutoSaveError(t("autosave.add_title"));
        showMobileToast(t("error.title_required"));
        if (options?.recoverTitleInput) {
          focusAndRevealTitleInput();
        }
      }
      return false;
    }

    if (!session?.user && !currentCardIdRef.current) {
      trackClientActivity("card_save_blocked", {
        reason: "not_logged_in",
        title: payload.title,
        size: payload.size,
        cells_filled: cellsFilledCount,
        status: 401,
        server_error: "client_redirect_to_signup",
        is_update: false,
      });
      trackClientActivity("save_blocked_auth_required", {
        source: "save_card",
        title: payload.title,
        size: payload.size,
        cells_filled: cellsFilledCount,
        next_step: "auth_then_free_save",
      });
      setAutoSaveState("idle");
      setAutoSaveError("");
      redirectToSignupForCreation();
      return false;
    }

    if (session?.user && permissionStatus && !permissionStatus.allowed) {
      persistDraft();
      trackClientActivity("card_save_blocked", {
        reason: "upgrade_required",
        title: payload.title,
        size: payload.size,
        cells_filled: cellsFilledCount,
        status: 403,
        server_error: "client_upgrade_required",
        is_update: Boolean(currentCardIdRef.current),
      });
      setAutoSaveState("error");
      setAutoSaveError(permissionStatus.reason || "Free card limit reached");
      setError(permissionStatus.reason || "This account cannot save new cards right now.");
      setUpgradeReason("card_limit");
      setShowUpgradeModal(true);
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

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        const failureMetadata = {
          title: payload.title,
          size: payload.size,
          cells_filled: cellsFilledCount,
          status: response.status,
          server_error: typeof data?.error === "string" ? data.error.substring(0, 200) : "",
          is_update: Boolean(currentCardIdRef.current),
        };

        if (response.status === 401) {
          trackClientActivity("card_save_blocked", {
            reason: "not_logged_in",
            ...failureMetadata,
          });
          redirectToSignupForCreation();
          return false;
        }
        if (response.status === 403 && !currentCardIdRef.current) {
          trackClientActivity("card_save_blocked", {
            reason: "card_limit_reached",
            ...failureMetadata,
          });
          setError(data.error || "Card could not be saved.");
          setUpgradeReason("card_limit");
          setShowUpgradeModal(true);
          track("card_limit_reached", { plan_type: permissionStatus?.planType || "FREE" });
        } else {
          trackClientActivity("card_save_blocked", {
            reason: "validation_error",
            ...failureMetadata,
          });
          setError(data.error || "Failed to save card");
        }
        setAutoSaveState("error");
        setAutoSaveError(data.error || "Failed to save card");
        return false;
      }

      const savedCard = data.card;
      const isNewCard = !currentCardIdRef.current;
      // Clean up draft from localStorage on successful save
      removeBrowserStorageItem("localStorage", "mybingo_card_draft");
      if (hasDataUrlImages) {
        removeBrowserStorageItem("localStorage", "mybingo_anon_uploads");
      }
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

      // Track card_save_succeeded
      const timeToSave = firstCellAddedAtRef.current
        ? Math.round((Date.now() - firstCellAddedAtRef.current) / 1000)
        : 0;
      trackClientActivity("card_save_succeeded", {
        cardId: savedCard?._id || currentCardIdRef.current || "",
        title: payload.title,
        size: payload.size,
        cells_filled: cellsFilledCount,
        is_new: isNewCard,
        time_to_save_seconds: timeToSave,
      });

      lastSavedSnapshotRef.current = JSON.stringify(payload);
      setAutoSaveState("saved");

      if (options?.redirectAfterSave) {
        router.push(`/cards/${savedCard?._id || currentCardIdRef.current}?${isNewCard ? "created" : "saved"}=1`);
      }

      return true;
    } catch (saveError) {
      console.error("Save error:", saveError);
      setError(t("error.save_failed"));
      setAutoSaveState("error");
      setAutoSaveError(t("autosave.failed"));
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
    rows,
    columns,
    bingoVariant,
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
      // Record the first time a cell is filled (for time_to_save_seconds)
      if (!firstCellAddedAtRef.current) {
        firstCellAddedAtRef.current = Date.now();
      }
      const filledCount = newCells.filter((c) => c.trim()).length;
      trackOnce("card_cells_added", { filled_count: filledCount, grid_size: size });
    }
  };

  const handleAiCellsGenerated = (newCells: string[]) => {
    if (bingoVariant !== "custom") return;
    setCells(newCells);
    trackOnce("ai_cells_applied", { size, cell_count: newCells.filter(c => c.trim()).length });
  };

  const openImagePicker = (index: number) => {
    setImagePickerCellIndex(index);
  };

  const handleImagePicked = (imageId: string, imageUrl: string, label: string) => {
    if (imagePickerCellIndex === null) return;
    const encoded = encodeImageCell({ imageId, imageUrl, label });
    handleCellChange(imagePickerCellIndex, encoded);
    setImagePickerCellIndex(null);
  };

  const handleToggleImageFit = (index: number) => {
    const cellValue = cells[index];
    if (!cellValue) return;
    const data = parseImageCell(cellValue);
    if (!data) return;
    const newFit = data.fit === "cover" ? "contain" : "cover";
    handleCellChange(index, encodeImageCell({ ...data, fit: newFit }));
  };

  const handleClearImageCell = (index: number) => {
    handleCellChange(index, "");
  };

  const handleShuffleCells = () => {
    if (bingoVariant === "classic75" || bingoVariant === "classic90") {
      setCells(generateClassicBingoCard(bingoVariant));
      return;
    }

    const totalCells = rows * columns;
    const freeIdx = getFreeSpaceIndexForGrid({ freeSpace, rows, columns, bingoVariant });

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

  const persistDraft = (options?: { updateState?: boolean }): boolean => {
    const shouldUpdateState = options?.updateState !== false;

    try {
      const persisted = setBrowserStorageItem("localStorage", "mybingo_card_draft", JSON.stringify({
        title,
        description,
        size,
        rows,
        columns,
        bingoVariant,
        cells,
        freeSpace: bingoVariant === "classic90" ? false : freeSpace,
        isPublic,
        style,
      }));

      if (!persisted) {
        console.error("Failed to save card draft: localStorage is unavailable");
        if (shouldUpdateState) setLocalDraftSaveState("error");
        return false;
      }

      if (shouldUpdateState) setLocalDraftSaveState("saved");
      return true;
    } catch (e) {
      console.error("Failed to save card draft:", e);
      if (shouldUpdateState) setLocalDraftSaveState("error");
      return false;
    }
  };

  // Track style_changed with 2-second debounce
  useEffect(() => {
    const prev = prevStyleRef.current;
    const changedProps: Array<{ property: string; from?: string; to: string }> = [];

    for (const key of Object.keys(style) as Array<keyof CellStyle>) {
      if (style[key] !== prev[key]) {
        changedProps.push({
          property: key,
          from: prev[key] || undefined,
          to: style[key] || "",
        });
      }
    }

    if (changedProps.length === 0) return;

    if (styleChangeTimerRef.current) {
      clearTimeout(styleChangeTimerRef.current);
    }

    styleChangeTimerRef.current = setTimeout(() => {
      for (const change of changedProps) {
        trackClientActivity("style_changed", change);
      }
      prevStyleRef.current = { ...style };
    }, 2000);

    return () => {
      if (styleChangeTimerRef.current) {
        clearTimeout(styleChangeTimerRef.current);
      }
    };
  }, [style]);

  // Auto-save draft to localStorage on every change (debounced)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Don't auto-save if editing an existing saved card or still loading
    if (currentCardId || isLoadingCard) return;
    // Only save if user has started entering content
    const hasContent = title.trim() || cells.some((c) => c.trim());
    if (!hasContent) return;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    setLocalDraftSaveState("saving");
    draftTimerRef.current = setTimeout(() => {
      persistDraft();
      draftTimerRef.current = null;
    }, 1000);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [title, description, size, rows, columns, bingoVariant, cells, freeSpace, isPublic, style, currentCardId, isLoadingCard]);

  // Flush the latest anonymous draft and report account-unsaved exits.
  useEffect(() => {
    const handlePageHide = (event: PageTransitionEvent) => {
      const hasContent = title.trim() || cells.some((c) => c.trim());
      if (!hasContent) return;

      // If already saved and no changes, don't fire
      const snapshot = JSON.stringify(getCardPayload());
      if (snapshot === lastSavedSnapshotRef.current) return;

      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }

      const shouldPersistLocally = !currentCardIdRef.current && !isLoadingCard;
      const persistedLocally = shouldPersistLocally
        ? persistDraft({ updateState: false })
        : false;
      const timeSpent = Math.round((Date.now() - pageLoadedAtRef.current) / 1000);
      trackClientActivity("card_draft_left_unsaved", {
        cells_filled: cells.filter((c) => c.trim()).length,
        has_title: Boolean(title.trim()),
        time_spent_seconds: timeSpent,
        local_persistence_status: shouldPersistLocally
          ? persistedLocally
            ? "saved"
            : "failed"
          : "not_applicable",
        persisted_locally: persistedLocally,
        page_cached: event.persisted,
      }, { keepalive: true });
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [title, cells, size, rows, columns, bingoVariant, freeSpace, isPublic, style, description, isLoadingCard]);

  const redirectToSignupForCreation = (options?: { autoCheckoutAfterAuth?: boolean }) => {
    persistDraft();
    const shouldAutoCheckout = Boolean(options?.autoCheckoutAfterAuth);
    trackClientActivity("builder_save_clicked", {
      authenticated: false,
      intent: shouldAutoCheckout ? "save_then_checkout" : "save_draft",
      title_present: Boolean(title.trim()),
      cells_filled: cells.filter((c) => c.trim()).length,
      size,
      rows,
      columns,
    });
    setAuthModalIntent(shouldAutoCheckout ? "save_checkout" : "draft_only");
    if (shouldAutoCheckout) {
      setBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey, "1");
    } else {
      removeBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey);
    }
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    trackClientActivity("builder_continue_without_saving_clicked", {
      surface: "save_auth_modal",
      title_present: Boolean(title.trim()),
      cells_filled: cells.filter((c) => c.trim()).length,
    });
    setShowAuthModal(false);
    setAuthModalIntent("draft_only");
    removeBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey);
  };

  const handleMagicLink = async () => {
    if (!magicEmail.trim()) return;
    setMagicLoading(true);
    const callbackUrl = authModalIntent === "save_checkout" ? saveCheckoutCallbackUrl : "/create";
    try {
      if (authModalIntent === "save_checkout") {
        setBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey, "1");
      }
      trackClientActivity("auth_magic_link_requested", {
        surface: "create_save_modal",
        method: "magic_link",
        callbackUrl,
      });
      track("magic_link_requested", { callbackUrl, context: "create_page" });
      const response = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: magicEmail, callbackUrl }),
      });
      if (!response.ok) throw new Error("magic_link_failed");
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
    trackClientActivity("builder_save_clicked", {
      authenticated: Boolean(session?.user),
      intent: session?.user ? "save_card" : "save_draft",
      title_present: Boolean(title.trim()),
      cells_filled: cells.filter((c) => c.trim()).length,
      size,
      rows,
      columns,
    });
    track("card_save_attempted", { title, size, cells_filled: cells.filter((c) => c.trim()).length });

    try {
      await saveCard({ redirectAfterSave: true, recoverTitleInput: true });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCheckout = async () => {
    trackClientActivity("batch_primary_clicked", {
      action: "buy",
      source: "create_page",
      batch_count: batchCount,
      price: formatBatchPackPrice(batchCount),
      plan_type: permissionStatus?.planType || "GUEST",
      context: "create_page",
    });
    setBatchCheckoutLoading(true);
    setError("");

    try {
      if (!session?.user) {
        persistDraft();
        const res = await fetch("/api/stripe/guest-batch-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchCount }),
        });
        const data = await res.json();
        if (!res.ok || !data.url) {
          setError(data.error || "Failed to start checkout");
          return;
        }
        window.location.href = data.url;
        return;
      }

      await redirectToCheckout({
        purchaseType: "batch_pack",
        batchCount,
        label: `${batchCount} Card Batch`,
        successPath: `/create?batchPurchase=success&batchCount=${batchCount}`,
      });
    } catch (checkoutError) {
      console.error("Batch checkout error:", checkoutError);
      setError("Failed to start batch checkout");
    } finally {
      setBatchCheckoutLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    trackClientActivity("batch_primary_clicked", {
      action: "generate",
      source: "create_page",
      batch_count: batchCount,
      price: formatBatchPackPrice(batchCount),
      plan_type: permissionStatus?.planType || "GUEST",
      has_ready_purchase: hasSelectedBatchPurchase,
      is_premium_batch_user: isPremiumBatchUser,
      context: "create_page",
    });
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
      const neededCells = bingoVariant === "classic90" ? 15 : freeSpace ? rows * columns - 1 : rows * columns;
      if (bingoVariant === "custom" && filledCells < neededCells) {
        setError(`Need at least ${neededCells} filled items for batch generation of ${rows}x${columns} cards`);
        setBatchLoading(false);
        return;
      }

      if (!session?.user) {
        redirectToSignupForCreation();
        return;
      }

      let cellsToBatch = cells.filter(c => c.trim());
      const filledCellIndexes = cells.reduce<number[]>((indexes, cell, index) => {
        if (cell.trim()) indexes.push(index);
        return indexes;
      }, []);
      const hasDataUrlImages = cellsToBatch.some((cell) => {
        const imgData = parseImageCell(cell);
        return imgData && imgData.imageId.startsWith("temp_") && imgData.imageUrl.startsWith("data:");
      });

      if (hasDataUrlImages && session?.user) {
        cellsToBatch = await uploadDataUrlImages(cellsToBatch);
        setCells((prev) => {
          const next = [...prev];
          filledCellIndexes.forEach((cellIndex, idx) => {
            next[cellIndex] = cellsToBatch[idx] ?? next[cellIndex] ?? "";
          });
          return next;
        });
      }

      const response = await fetch("/api/cards/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          size,
          rows,
          columns,
          bingoVariant,
          cells: bingoVariant === "custom" ? cellsToBatch : cells,
          freeSpace: bingoVariant === "classic90" ? false : freeSpace,
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

    const pdfMetadata = {
      source: "create_page",
      action: "pdf_layout",
      batch_count: batchResult.count,
      price: isPremiumBatchUser ? "premium" : formatBatchPackPrice(batchCount),
      plan_type: permissionStatus?.planType || "GUEST",
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
      let delivery: "new_tab" | "download" = "new_tab";
      if (!newTab) {
        // Popup blocked — fall back to direct download
        delivery = "download";
        const a = document.createElement("a");
        a.href = url;
        a.download = `bingo-batch-${batchResult.count}-cards.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      trackClientActivity("batch_pdf_export_succeeded", { ...pdfMetadata, delivery });
    } catch (err: any) {
      trackClientActivity("batch_pdf_export_failed", {
        ...pdfMetadata,
        error: err.message || "Failed to download batch PDF",
      });
      alert(err.message || "Failed to download batch PDF");
    } finally {
      setBatchPdfLoading(null);
    }
  };

  const getFreeSpaceIndex = () => {
    return getFreeSpaceIndexForGrid({ freeSpace, rows, columns, bingoVariant });
  };

  const applyBingoVariant = (nextVariant: BingoVariant) => {
    setBingoVariant(nextVariant);
    setBatchResult(null);

    if (nextVariant === "classic75") {
      setSize(5);
      setRows(5);
      setColumns(5);
      setFreeSpace(true);
      if (!title.trim() || title === "90-Ball Bingo Ticket") setTitle("75-Ball Bingo Card");
      setCells(generateClassicBingoCard("classic75"));
      trackClientActivity("classic_bingo_mode_selected", { bingoVariant: nextVariant });
      return;
    }

    if (nextVariant === "classic90") {
      setSize(3);
      setRows(3);
      setColumns(9);
      setFreeSpace(false);
      if (!title.trim() || title === "75-Ball Bingo Card") setTitle("90-Ball Bingo Ticket");
      setCells(generateClassicBingoCard("classic90"));
      trackClientActivity("classic_bingo_mode_selected", { bingoVariant: nextVariant });
      return;
    }

    setRows(size);
    setColumns(size);
    setCells((prev) => {
      const nextCells = Array(size * size).fill("");
      for (let index = 0; index < Math.min(prev.length, nextCells.length); index++) {
        nextCells[index] = prev[index];
      }
      return nextCells;
    });
    trackClientActivity("classic_bingo_mode_selected", { bingoVariant: nextVariant });
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
      return "5x5 grids are available";
    } else if (gridSize === 4) {
      return "4x4 grids are available";
    }
    return "";
  };

  const isEditingExistingCard = Boolean(cardIdFromUrl || currentCardId);
  const editorUnlocked = Boolean(!permissionStatus || permissionStatus.allowed || isEditingExistingCard);
  const isPremiumGateActive = Boolean(
    permissionStatus && !permissionStatus.allowed && permissionStatus.upgradeRequired && !isEditingExistingCard
  );
  const continueAnonymousDraft = async () => {
    removeBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey);
    trackClientActivity("premium_gate_keep_drafting_clicked", undefined, { keepalive: true });
    await signOut({ callbackUrl: "/create" });
  };

  useEffect(() => {
    if (autoCheckoutStartedRef.current) return;
    if (autoSaveAfterAuthRef.current) return;
    if (!session?.user || checkingPermission || !permissionStatus) {
      return;
    }
    // For the free path, only proceed if permission is allowed
    // For the Premium checkout path, redirect to Stripe regardless of current limits
    const isPremiumCheckoutPath = searchParams.get("checkout") === "premium";
    const isSavePath = searchParams.get("checkout") === "save" ||
      getBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey) === "1";

    if (!isPremiumCheckoutPath && !isSavePath) return;
    if (isEditingExistingCard) return;

    autoCheckoutStartedRef.current = true;
    autoSaveAfterAuthRef.current = true;
    removeBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey);

    // Clean checkout param from URL
    if (typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("checkout");
      window.history.replaceState(null, "", nextUrl.pathname + nextUrl.search + nextUrl.hash);
    }

    if (isPremiumCheckoutPath) {
      // Premium subscription: redirect to Stripe checkout for monthly plan
      trackClientActivity("checkout_auto_started_after_auth", {
        source: "save_card",
        plan: "premium",
        intent: "subscription",
      });
      redirectToCheckout({
        purchaseType: "monthly",
        successPath: "/create?checkout=save",
      });
      return;
    }

    // Free path: auto-save the restored draft, redirect to saved card on success
    if (permissionStatus.allowed && title.trim() && cells.some((c) => c.trim())) {
      trackClientActivity("checkout_auto_started_after_auth", {
        source: "save_card",
        plan: "free",
        cards_created: permissionStatus.cardsCreated ?? null,
        cards_limit: permissionStatus.cardsLimit ?? null,
      });
      saveCard({ redirectAfterSave: true }).catch(() => {
        router.push("/dashboard");
      });
    } else {
      router.push("/dashboard");
    }
  }, [
    session?.user,
    checkingPermission,
    permissionStatus,
    permissionStatus?.allowed,
    permissionStatus?.cardsCreated,
    permissionStatus?.cardsLimit,
    isEditingExistingCard,
    searchParams,
  ]);
  const accountAutoSaveLabel =
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
          : "Changes save automatically";
  const anonymousDraftSaveLabel =
    localDraftSaveState === "saving"
      ? "Saving draft on this device..."
      : localDraftSaveState === "saved"
        ? "Draft saved on this device. Sign in to save it to your account."
        : localDraftSaveState === "error"
          ? "Draft could not be saved on this device. Check your browser storage settings."
          : "Drafts save on this device. Sign in to save them to your account.";
  const autoSaveLabel = session?.user ? accountAutoSaveLabel : anonymousDraftSaveLabel;
  const isPremiumBatchUser = Boolean(permissionStatus?.hasPremiumAccess);
  const canUploadImages = Boolean(session?.user);
  const selectedBatchPrice = formatBatchPackPrice(batchCount);
  const selectedBatchPurchases = availableBatchCounts[batchCount] || 0;
  const hasSelectedBatchPurchase = selectedBatchPurchases > 0;
  const batchPurchaseStatus = searchParams.get("batchPurchase");
  const isGuestReturn = searchParams.get("guest") === "true";
  const batchStatusMessage =
    batchPurchaseStatus === "success"
      ? isGuestReturn && !session?.user
        ? `Payment received. Sign in with the email you used at checkout to access your ${batchCount}-card batch.`
        : hasSelectedBatchPurchase
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
          : `Buy ${batchCount}-Card Batch • ${selectedBatchPrice}`;
  const batchActionDisabled =
    showPreview ||
    batchLoading ||
    batchCheckoutLoading ||
    (Boolean(session?.user) && checkingPermission) ||
    (permissionStatus?.planType === "FREE" && loadingBatchPurchases);
  const handleBatchPrimaryAction = isPremiumBatchUser || hasSelectedBatchPurchase
    ? handleBatchGenerate
    : handleBatchCheckout;
  const batchShareBatchId = batchResult?.cardIds[0] || "";
  const batchResultTitle = title.trim() || `${batchCount}-card bingo batch`;

  return (
    <>
    <div className="playful-create" translate="no">
      <a className="skip-link" href="#main">Skip to card maker</a>
      <header className="app-header">
        <div className="app-header-in">
          <div className="brand-group">
            <Link href="/" className="logo" aria-label="MyBingoCard home">
              My<span>Bingo</span>Card
            </Link>
          </div>

          <ol className="progress" aria-label="Card creation progress">
            <li className="is-current" aria-current="step"><span className="progress-dot">1</span><span>Content</span></li>
            <li><span className="progress-dot">2</span><span>Style</span></li>
            <li><span className="progress-dot">3</span><span>Review</span></li>
          </ol>

          <Link href="/" className="back-link">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to home
          </Link>
        </div>
      </header>

      <main className="pt-16 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-16 px-3 sm:px-4 lg:px-5">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-[#33312e]">
                  {isEditingExistingCard ? "Edit Bingo Card" : "Create Bingo Cards Online"}
                </h1>
                {!isEditingExistingCard ? (
                  <p className="hidden text-xs text-[#6b6459] sm:block">
                    Customize a printable bingo card, start from a template, or prepare an online game.
                  </p>
                ) : null}
              </div>
              <span className="text-xs text-[#6b6459]" title={autoSaveLabel}>
                {session?.user
                  ? autoSaveState === "saving"
                    ? "Saving..."
                    : autoSaveState === "saved"
                      ? "\u2713 Saved"
                      : ""
                  : localDraftSaveState === "saving"
                    ? "Saving on this device..."
                    : localDraftSaveState === "saved"
                      ? "\u2713 Saved on this device"
                      : localDraftSaveState === "error"
                        ? "Local draft save failed"
                        : ""}
              </span>
            </div>
             {/* Usage Banner */}
            {!checkingPermission && permissionStatus && (
              <div className={`hidden md:flex items-center gap-4 px-4 py-2 rounded-full border ${
                permissionStatus.allowed || isEditingExistingCard
                  ? "bg-[#2ec4b6]/10 border-[#2ec4b6]/15 text-[#2ec4b6]"
                  : "bg-[#ffb800]/10 border-[#ffb800]/15 text-[#ffb800]"
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

          {error && (
            <div id="create-card-error" role="alert" className="mb-4 p-4 bg-[#ff5d8f]/10 border border-[#ff5d8f]/15 rounded-xl text-[#ff5d8f] flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {isLoadingCard && (
            <div className="mb-4 p-4 bg-white border border-[#a39a88] rounded-xl text-[#33312e] flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#a39a88] border-t-[#7c5cff] rounded-full animate-spin"></div>
              {t("label.loading")}
            </div>
          )}

          {/* Fallback account gate */}
          {isPremiumGateActive && (
            <div className="mb-6 bg-[#7c5cff]/10 border-2 border-[#7c5cff] rounded-2xl p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#7c5cff]/15 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[#7c5cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-[#33312e] mb-2">Sign in to keep creating</h2>
              <p className="text-[#33312e] mb-6 max-w-md mx-auto">
                The free plan includes one saved card, templates, images, AI ideas, and individual PDF/PNG exports. Printable batch packs, share links, and hosted bingo events are paid tools.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-[#7c5cff] text-white px-6 py-3 rounded-xl font-bold text-base shadow-sm transition-all"
                >
                  Sign in
                </button>
                <button
                      type="button"
                      onClick={continueAnonymousDraft}
                  className="px-6 py-4 text-[#33312e] hover:text-[#33312e] font-semibold transition-colors"
                >
                  Keep drafting
                </button>
              </div>
            </div>
          )}

          {editorUnlocked && !isLoadingCard && (
          <>
          <div className="grid lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,300px)] xl:grid-cols-[minmax(0,240px)_minmax(500px,520px)_minmax(0,320px)] 2xl:grid-cols-[minmax(0,240px)_minmax(520px,560px)_minmax(0,340px)] gap-3 lg:gap-4 xl:justify-center items-start">
            {/* Left Panel - Card Details */}
            <div className="order-2 lg:order-1 space-y-4 lg:sticky lg:top-16 lg:max-h-[calc(100vh-11.5rem)] lg:space-y-3 lg:overflow-y-auto lg:overscroll-contain lg:pr-1 min-w-0">
              {!session?.user && !checkingPermission && (
                <div className="px-3 py-2.5 bg-[#7c5cff]/10 border border-[#7c5cff]/15 rounded-lg text-[#7c5cff] flex items-start gap-2.5">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs leading-5">
                    Build first. Sign in when you&apos;re ready to save.{" "}
                    <Link href="/signup?callbackUrl=/create" className="font-semibold underline underline-offset-2 hover:text-[#7c5cff]">
                      Sign up
                    </Link>{" "}
                    or{" "}
                    <Link href="/login?callbackUrl=/create" className="font-semibold underline underline-offset-2 hover:text-[#7c5cff]">
                      log in
                    </Link>.
                  </span>
                </div>
              )}
              {showNewUserTip && !isPremiumGateActive && (
                <div className="bg-[#fff7ed] border border-[#a39a88] rounded-xl px-4 py-3 flex items-start justify-between gap-3 animate-fade-in-up">
                  <p className="text-sm text-[#33312e] leading-snug">
                    First time? Type a title above and fill in the squares, or{" "}
                    <Link href="/templates" className="text-[#7c5cff] font-semibold hover:underline">
                      start from a template
                    </Link>.
                  </p>
                  <button
                    onClick={() => { setShowNewUserTip(false); setBrowserStorageItem("localStorage", "new_user_tip_dismissed", "1"); }}
                    className="p-1.5 text-[#6b6459] hover:text-[#33312e] transition-colors flex-shrink-0"
                    title="Dismiss"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              {/* Basic Info */}
              <div className="bg-white/60 rounded-2xl border border-[#a39a88]/50 p-4 lg:p-3">
                <h2 className="text-base font-bold text-[#33312e] mb-3 lg:mb-2">
                   Card Details
                </h2>

                <div className="space-y-3 lg:space-y-2.5">
                  <div>
                    <label htmlFor="card-title" className="block text-xs font-semibold text-[#33312e] mb-1">
                      Card Title <span className="text-[#ff5d8f]">*</span>
                    </label>
                    <input
                      ref={titleInputRef}
                      id="card-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => {
                        if (title.trim()) {
                          trackOnce("card_title_entered", { title: title.trim() });
                        }
                      }}
                      placeholder="e.g., Wedding Bingo"
                      aria-invalid={Boolean(error && !title.trim())}
                      aria-describedby={error && !title.trim() ? "create-card-error" : undefined}
                      className="w-full px-3 py-2 bg-[#fff7ed] border border-[#a39a88] rounded-xl focus:ring-2 focus:ring-[#7c5cff]/20 focus:border-[#7c5cff] outline-none transition-all duration-200 placeholder:text-[#6b6459] text-sm"
                      disabled={showPreview}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#33312e] mb-1">
                      Description <span className="font-normal text-[#6b6459]">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add some instructions for your players..."
                      rows={2}
                      className="w-full px-3 py-2 bg-[#fff7ed] border border-[#a39a88] rounded-xl focus:ring-2 focus:ring-[#7c5cff]/20 focus:border-[#7c5cff] outline-none transition-all duration-200 placeholder:text-[#6b6459] resize-none text-sm"
                      disabled={showPreview}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#33312e] mb-1">
                      Bingo Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ["custom", "Custom"],
                        ["classic75", "75-Ball"],
                        ["classic90", "90-Ball"],
                      ] as [BingoVariant, string][]).map(([variant, label]) => (
                        <button
                          key={variant}
                          type="button"
                          onClick={() => applyBingoVariant(variant)}
                          disabled={showPreview}
                          className={`w-full rounded-lg border px-2 py-2 text-sm font-semibold transition-all duration-200 ${
                            bingoVariant === variant
                              ? "border-[#7c5cff] bg-[#7c5cff]/10 text-[#7c5cff] ring-1 ring-[#7c5cff]"
                              : "border-[#a39a88] bg-white text-[#33312e] hover:border-[#7c5cff]/30 hover:bg-[#fff7ed]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-[#6b6459]">
                      {bingoVariant === "classic75" && "Strict B-I-N-G-O columns, 1-75 call pool, center FREE."}
                      {bingoVariant === "classic90" && "Traditional 3x9 ticket, 15 numbers, 1-90 call pool."}
                      {bingoVariant === "custom" && "Use your own words, images, numbers, or prompts."}
                    </p>
                  </div>

                  {bingoVariant === "custom" && (
                  <div>
                    <label className="block text-xs font-semibold text-[#33312e] mb-1">
                      Grid Size
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[3, 4, 5].map((s) => {
                        const gridSize = s as GridSize;
                        const isAllowed = canUseGridSize(gridSize);
                        const tooltip = getGridSizeTooltip(gridSize);

                        return (
                          <div key={s} className="relative group">
                            <button
                              onClick={() => {
                                if (isAllowed && gridSize !== size) {
                                  trackClientActivity("grid_size_changed", {
                                    from: size,
                                    to: gridSize,
                                    cells_filled_before: cells.filter((c) => c.trim()).length,
                                  });
                                  setSize(gridSize);
                                }
                              }}
                              disabled={showPreview || !isAllowed}
                              className={`w-full py-1.5 rounded-lg border transition-all duration-200 font-medium text-sm ${
                                size === s
                                  ? "border-[#7c5cff] bg-[#7c5cff]/10 text-[#7c5cff] ring-1 ring-[#7c5cff]"
                                  : isAllowed
                                  ? "border-[#a39a88] bg-white text-[#33312e] hover:border-[#7c5cff]/30 hover:bg-[#fff7ed]"
                                  : "border-[#a39a88] bg-[#fff7ed] text-[#a39a88] cursor-not-allowed"
                              }`}
                            >
                              {s}×{s}
                            </button>
                            {!isAllowed && tooltip && (
                              <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#33312e] text-white text-xs rounded-lg whitespace-nowrap z-10 shadow-lg">
                                {tooltip}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  )}

                  <div className="space-y-3 pt-2 lg:space-y-2.5 lg:pt-1">
                    {bingoVariant !== "custom" && (
                      <button
                        type="button"
                        onClick={handleShuffleCells}
                        disabled={showPreview}
                        className="flex items-center gap-3 p-3 w-full border border-[#a39a88] rounded-xl cursor-pointer hover:bg-[#fff7ed] transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-5 h-5 flex items-center justify-center text-[#7c5cff]">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-[#33312e]">Regenerate classic card</span>
                      </button>
                    )}
                    {bingoVariant === "custom" && (
                     <label htmlFor="free-space-toggle" className={`flex items-center gap-3 p-3 lg:p-2.5 border border-[#a39a88] rounded-xl transition-colors ${showPreview ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-[#fff7ed]"}`}>
                      <div className="relative flex items-center">
                        <input
                            id="free-space-toggle"
                            type="checkbox"
                            checked={freeSpace}
                            onChange={(e) => {
                              setFreeSpace(e.target.checked);
                              trackClientActivity("free_space_toggled", { enabled: e.target.checked });
                            }}
                            disabled={showPreview}
                            className="w-5 h-5 text-[#7c5cff] border-[#a39a88] rounded focus:ring-[#7c5cff]"
                        />
                      </div>
                      <span className="text-sm font-medium text-[#33312e]">Include free space</span>
                    </label>
                    )}

                    {bingoVariant === "custom" && (
                    <button
                      type="button"
                      onClick={handleShuffleCells}
                      disabled={showPreview}
                      className="flex items-center gap-3 p-3 lg:p-2.5 w-full border border-[#a39a88] rounded-xl cursor-pointer hover:bg-[#fff7ed] transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-5 h-5 flex items-center justify-center text-[#7c5cff]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-[#33312e]">Shuffle cells</span>
                    </button>
                    )}

                    <label htmlFor="public-toggle" className={`flex items-center gap-3 p-3 lg:p-2.5 border border-[#a39a88] rounded-xl transition-colors ${showPreview ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-[#fff7ed]"}`}>
                      <div className="relative flex items-center">
                         <input
                            id="public-toggle"
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            disabled={showPreview}
                            className="w-5 h-5 text-[#7c5cff] border-[#a39a88] rounded focus:ring-[#7c5cff]"
                        />
                      </div>
                      <div>
                          <div className="text-sm font-medium text-[#33312e]">Make Public</div>
                          <div className="text-xs text-[#6b6459]">Allow anyone with the link to view</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Panel - AI, Style & Batch */}
            <div className="order-3 lg:order-3 space-y-4 lg:sticky lg:top-16 lg:max-h-[calc(100vh-11.5rem)] lg:space-y-3 lg:overflow-y-auto lg:overscroll-contain lg:pr-1 min-w-0">
              {/* AI Generate */}
              {bingoVariant === "custom" && (
                <AiGenerateSection
                  size={size}
                  freeSpace={freeSpace}
                  title={title}
                  onCellsGenerated={handleAiCellsGenerated}
                  isPremium={true}
                  disabled={showPreview}
                  onUpgradeNeeded={() => {
                    setUpgradeReason("ai_generate");
                    setShowUpgradeModal(true);
                  }}
                />
              )}

              {/* Style Customization */}
              <div className="bg-white/60 rounded-2xl border border-[#a39a88]/50 p-4 lg:p-3">
                <h2 className="text-base font-bold text-[#33312e] mb-3 lg:mb-2">
                   Style & Colors
                </h2>

                <div className="space-y-4 lg:space-y-3">
                  {/* Theme Presets */}
                  <div>
                    <label className="block text-xs font-semibold text-[#6b6459] uppercase tracking-wide mb-2">
                      Quick Themes
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
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
                          title={theme.name}
                          className={`group relative flex flex-col items-center gap-0.5 p-1.5 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                            style.backgroundColor === theme.bg && style.textColor === theme.text
                              ? "border-[#7c5cff] ring-2 ring-[#7c5cff]/20"
                              : "border-[#a39a88] hover:border-[#a39a88]"
                          }`}
                        >
                          <div
                            className="w-full h-6 rounded border flex items-center justify-center"
                            style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                          >
                            <span className="text-[8px] font-bold" style={{ color: theme.text }}>BINGO</span>
                          </div>
                          <span className="text-[9px] font-medium text-[#6b6459] leading-none">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Colors (collapsed by default) */}
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#6b6459] uppercase tracking-wide select-none hover:text-[#7c5cff] transition-colors">
                      <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Custom Colors & Font
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
                            className="w-9 h-9 rounded-lg cursor-pointer border border-[#a39a88] p-0.5 bg-white flex-shrink-0"
                          />
                          <span className="text-sm text-[#33312e] w-20">{label}</span>
                          <div
                            className="flex-1 h-6 rounded-md border border-[#a39a88]"
                            style={{ backgroundColor: style[key] }}
                          ></div>
                        </div>
                      ))}
                      {/* Font Controls — inside collapsible */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#fff7ed]">
                        <div>
                          <label className="block text-xs font-semibold text-[#6b6459] uppercase tracking-wide mb-1.5">Font</label>
                          <select
                            value={style.fontFamily}
                            onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
                            disabled={showPreview}
                            className="w-full px-2 py-2 bg-[#fff7ed] border border-[#a39a88] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#7c5cff]/20 focus:border-[#7c5cff]"
                            style={{ fontFamily: style.fontFamily }}
                          >
                            <option value="Arial" style={{ fontFamily: "Arial" }}>Arial</option>
                            <option value="Georgia" style={{ fontFamily: "Georgia" }}>Georgia</option>
                            <option value="Times New Roman" style={{ fontFamily: "Times New Roman" }}>Times</option>
                            <option value="Courier New" style={{ fontFamily: "Courier New" }}>Courier</option>
                            <option value="Verdana" style={{ fontFamily: "Verdana" }}>Verdana</option>
                            <option value="Comic Sans MS" style={{ fontFamily: "Comic Sans MS" }}>Comic Sans</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#6b6459] uppercase tracking-wide mb-1.5">Size</label>
                          <div className="flex items-center gap-0.5 bg-[#fff7ed] border border-[#a39a88] rounded-lg p-0.5">
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
                                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                                  style.fontSize === s.value
                                    ? "bg-white text-[#7c5cff] shadow-sm"
                                    : "text-[#6b6459] hover:text-[#33312e]"
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>

                </div>
              </div>

              {/* Batch Generation — Always visible, prominent */}
              <div className="bg-gradient-to-br from-[#7c5cff]/10 to-[#7c5cff]/10 rounded-2xl shadow-sm border border-[#7c5cff]/60 p-4 lg:p-3">
                <h2 className="text-base font-bold text-[#33312e] mb-2 flex items-center gap-2">
                   <span className="w-7 h-7 rounded-lg bg-[#7c5cff] text-white flex items-center justify-center text-sm">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                     </svg>
                   </span>
                   Print Multiple Cards
                </h2>
                <p className="text-xs text-[#6b6459] mb-3">Generate up to 500 unique shuffled cards.</p>

                {/* Tier selection — always visible */}
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {([30, 100, 250, 500] as const).map((n) => {
                    const isSelected = batchCount === n && batchMode;
                    const hasReady = !isPremiumBatchUser && (availableBatchCounts[n] || 0) > 0;
                    return (
                      <button
                        key={n}
                        onClick={() => {
                          setBatchMode(true); setBatchCount(n); setBatchResult(null);
                          trackClientActivity("batch_tier_selected", {
                            batch_count: n,
                            price: BATCH_PACKS[n].label,
                            plan_type: permissionStatus?.planType || "GUEST",
                            source: "create_page",
                          });
                        }}
                        className={`relative py-1.5 px-1 rounded-lg border-2 text-center transition-all ${
                          isSelected
                            ? "border-[#7c5cff] bg-white shadow-md ring-1 ring-[#7c5cff]/20"
                            : "border-[#a39a88]/80 bg-white/70 hover:border-[#7c5cff] hover:bg-white"
                        }`}
                      >
                        <div className="text-sm font-bold text-[#33312e]">{n}</div>
                        <div className="text-[10px] font-medium text-[#6b6459]">cards</div>
                        {!isPremiumBatchUser && (
                          <div className="mt-1 text-xs font-bold text-[#7c5cff]">
                            {BATCH_PACKS[n].label}
                          </div>
                        )}
                        {isPremiumBatchUser && (
                          <div className="mt-1 text-[10px] font-semibold text-[#2ec4b6]">Included</div>
                        )}
                        {hasReady && (
                          <div className="absolute -top-1.5 -right-1.5 bg-[#2ec4b6] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            Ready
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {batchStatusMessage && (
                  <div
                    className={`rounded-xl border px-3 py-2 text-xs mb-3 ${
                      batchPurchaseStatus === "success"
                        ? "border-[#2ec4b6] bg-[#2ec4b6]/10 text-[#2ec4b6]"
                        : "border-[#ffb800] bg-[#ffb800]/10 text-[#ffb800]"
                    }`}
                  >
                    {batchStatusMessage}
                    {batchPurchaseStatus === "success" && (
                      <p className="mt-1 font-medium text-[#2ec4b6]">
                        Next: generate the batch, then send players unique cards or host a live game. Use PDFs only when you need paper copies.
                      </p>
                    )}
                  </div>
                )}

                {isPremiumBatchUser && batchMode && (
                  <p className="text-xs text-[#6b6459] mb-3">
                    Every card gets a unique shuffled arrangement. Included with Premium.
                  </p>
                )}

                {!isPremiumBatchUser && !session?.user && batchMode && (
                  <p className="text-xs text-[#6b6459] mb-3">
                    Sign up to purchase batch packs, or upgrade to Premium for included batches.
                  </p>
                )}

                {availableBatchSummary && !isPremiumBatchUser && (
                  <div className="rounded-xl border border-[#2ec4b6] bg-[#2ec4b6]/10 px-3 py-2 text-xs text-[#2ec4b6] mb-3">
                    Purchased: {availableBatchSummary}
                  </div>
                )}

                {batchResult && (
                  <div className="bg-white border border-[#2ec4b6] rounded-xl p-4 space-y-3 mb-3">
                    <p className="text-sm font-bold text-[#2ec4b6] flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {batchResult.count} cards generated!
                    </p>
                    {batchShareBatchId && (
                      <div className="rounded-xl border border-[#7c5cff]/15 bg-[#7c5cff]/10 p-3 space-y-3">
                        <div>
                          <p className="text-sm font-bold text-[#7c5cff]">
                            Make the batch playable before you print.
                          </p>
                          <p className="text-xs text-[#7c5cff] mt-1">
                            Each player gets a unique card link they can open on their phone. PDF is still here for paper backups.
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <ShareBatchButton
                            batchId={batchShareBatchId}
                            cardCount={batchResult.count}
                            batchTitle={batchResultTitle}
                            variant="primary"
                            className="w-full"
                          />
                          <StartGameButton
                            cardId={batchShareBatchId}
                            label="Host Live Game"
                            className="w-full"
                            compact
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6459] mb-2">
                        Need paper copies?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleBatchPdfDownload(1)}
                        disabled={batchPdfLoading !== null}
                        className={`py-2.5 rounded-lg text-xs font-semibold transition ${
                          batchPdfLoading === "pdf-1" ? "bg-[#7c5cff] text-white cursor-wait" : "bg-[#7c5cff] text-white hover:bg-[#7c5cff]"
                        }`}
                      >
                        {batchPdfLoading === "pdf-1" ? "..." : "1 per page"}
                      </button>
                      <button
                        onClick={() => handleBatchPdfDownload(2)}
                        disabled={batchPdfLoading !== null}
                        className={`py-2.5 rounded-lg text-xs font-semibold transition ${
                          batchPdfLoading === "pdf-2" ? "bg-[#7c5cff] text-white cursor-wait" : "bg-[#7c5cff] text-white hover:bg-[#7c5cff]"
                        }`}
                      >
                        {batchPdfLoading === "pdf-2" ? "..." : "2 per page"}
                      </button>
                      <button
                        onClick={() => handleBatchPdfDownload(4)}
                        disabled={batchPdfLoading !== null}
                        className={`py-2.5 rounded-lg text-xs font-semibold transition ${
                          batchPdfLoading === "pdf-4" ? "bg-[#7c5cff] text-white cursor-wait" : "bg-[#7c5cff] text-white hover:bg-[#7c5cff]"
                        }`}
                      >
                        {batchPdfLoading === "pdf-4" ? "..." : "4 per page"}
                      </button>
                      <button
                        onClick={() => handleBatchPdfDownload(1, true)}
                        disabled={batchPdfLoading !== null}
                        className={`py-2.5 rounded-lg text-xs font-semibold transition ${
                          batchPdfLoading === "pdf-gray" ? "bg-[#33312e] text-white cursor-wait" : "bg-[#6b6459] text-white hover:bg-[#33312e]"
                        }`}
                      >
                        {batchPdfLoading === "pdf-gray" ? "..." : "Grayscale"}
                      </button>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push("/dashboard/cards")}
                      className="w-full py-2 text-sm text-[#7c5cff] font-medium"
                    >
                      View all cards in dashboard
                    </button>
                  </div>
                )}

                {batchMode && !batchResult && (
                  <button
                    onClick={handleBatchPrimaryAction}
                    disabled={batchActionDisabled}
                    className="w-full bg-[#7c5cff] text-white px-4 py-3 rounded-xl hover:bg-[#7c5cff] hover:shadow-md transition-all disabled:opacity-50 font-bold text-sm"
                  >
                    {batchActionLabel}
                  </button>
                )}

                {!batchMode && (
                  <button
                    onClick={() => {
                      trackClientActivity("batch_button_clicked", {
                        action: "open_panel",
                        source: "create_page_select_batch_size",
                        batch_count: batchCount,
                        price: formatBatchPackPrice(batchCount),
                        plan_type: permissionStatus?.planType || "GUEST",
                        context: "create_page",
                      });
                      setBatchMode(true);
                      setBatchResult(null);
                    }}
                    className="w-full bg-[#7c5cff] text-white px-4 py-3 rounded-xl hover:bg-[#7c5cff] hover:shadow-md transition-all font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Select a Batch Size
                  </button>
                )}
              </div>
            </div>

            {/* Center Panel - Bingo Grid */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-16 lg:self-start min-w-0">
              <div className="bg-white rounded-2xl shadow-lg ring-1 ring-[#a39a88] p-3 lg:max-w-[500px] 2xl:max-w-[540px] lg:mx-auto flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-bold text-[#33312e]">
                    {showPreview ? "Card Preview" : "Edit Content"}
                  </h2>
                  {!showPreview && (
                    <span className="text-xs font-semibold text-[#6b6459] uppercase tracking-wider bg-[#fff7ed] px-3 py-1 rounded-full">
                      {rows}×{columns} grid • {cells.length} cells
                    </span>
                  )}
                </div>

                {/* Bingo Grid */}
                <div className="flex-grow flex items-center justify-center bg-[#fff7ed] rounded-xl border border-[#a39a88] p-2 lg:p-3 mb-2">
                   <div className="w-full">
                      {/* Grid Header - matches grid columns */}
                      <div
                        className="grid mb-1.5 md:mb-2 text-center font-bold tracking-widest text-[#33312e] opacity-90"
                        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: columns >= 5 ? "3px" : "8px" }}
                      >
                         <div
                           className={`font-bold text-center text-[#7c5cff] truncate px-2 ${size === 5 ? "py-1 text-xs md:text-sm" : "py-1.5 text-sm"}`}
                           style={{ gridColumn: "1 / -1" }}
                         >
                           {title || "My Bingo Card"}
                         </div>
                         {bingoVariant === "classic75" && "BINGO".split("").map((letter) => (
                           <div key={letter} className="rounded-md bg-[#7c5cff]/10 py-1 text-xs font-black text-[#7c5cff]">
                             {letter}
                           </div>
                         ))}
                         {bingoVariant === "classic90" && ["1-9", "10s", "20s", "30s", "40s", "50s", "60s", "70s", "80-90"].map((label) => (
                           <div key={label} className="rounded-md bg-[#ffb800]/10 py-1 text-[10px] font-black text-[#ffb800]">
                             {label}
                           </div>
                         ))}
                      </div>

                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: `repeat(${columns}, 1fr)`,
                          gap: columns >= 5 ? "3px" : size === 4 ? "6px" : "8px",
                        }}
                      >
                        {cells.map((cell, index) => {
                          const isFreeSpace = freeSpace && index === getFreeSpaceIndex();
                          const isBlank90 = bingoVariant === "classic90" && !cell.trim();
                          const cellIsImage = isImageCell(cell);
                          const imageData = cellIsImage ? parseImageCell(cell) : null;

                          return (
                            <div
                              key={index}
                              className={`relative group transition-all duration-200 ${
                                size === 5 ? "aspect-[1/1.1] md:aspect-square" : "aspect-square"
                              } ${
                                showPreview ? "shadow-sm" : "focus-within:ring-2 focus-within:ring-[#7c5cff] focus-within:ring-offset-1"
                              }`}
                              style={{
                                backgroundColor: style.backgroundColor,
                                borderColor: style.borderColor,
                              }}
                            >
                              {isBlank90 ? (
                                <div className="w-full h-full rounded-md md:rounded-lg border border-dashed border-[#ffb800]/15 bg-[#ffb800]/50" />
                              ) : isFreeSpace ? (
                                <div
                                  className={`w-full h-full flex items-center justify-center border-2 font-bold p-1 text-center shadow-inner bg-opacity-90 ${size === 5 ? "rounded-md md:rounded-xl text-xs md:text-base" : "rounded-lg md:rounded-xl"}`}
                                  style={{
                                    color: "#4338ca",
                                    fontSize: style.fontSize,
                                    fontFamily: style.fontFamily,
                                    borderColor: "#818cf8",
                                    background: "linear-gradient(135deg, #ede9fe 0%, #7c5cff/15 100%)",
                                  }}
                                >
                                  FREE
                                </div>
                              ) : showPreview || bingoVariant !== "custom" ? (
                                <BingoCell cell={formatClassicCellLabel(cell, bingoVariant)} style={style} size={size} />
                              ) : cellIsImage && imageData ? (
                                /* Image cell in edit mode — shows image with swap/remove/fit buttons */
                                <div
                                  className="w-full h-full flex flex-col items-center justify-center border rounded-lg md:rounded-xl overflow-hidden transition-colors"
                                  style={{ borderColor: style.borderColor, backgroundColor: style.backgroundColor, padding: imageData.fit === "cover" ? 0 : "4px" }}
                                >
                                  {imageData.fit === "cover" ? (
                                    <img
                                      src={imageData.imageUrl}
                                      alt={imageData.label || ""}
                                      className="absolute inset-0 w-full h-full object-cover rounded-lg md:rounded-xl"
                                    />
                                  ) : (
                                    <img
                                      src={imageData.imageUrl}
                                      alt={imageData.label || ""}
                                      className="max-w-full max-h-[60%] object-contain"
                                    />
                                  )}
                                  {imageData.label && imageData.fit !== "cover" && (
                                    <span className="text-[9px] md:text-[10px] font-medium text-[#33312e] mt-0.5 line-clamp-1 w-full text-center">
                                      {imageData.label}
                                    </span>
                                  )}
                                  {imageData.label && imageData.fit === "cover" && (
                                    <span className="relative z-10 mt-auto mb-1 text-[9px] md:text-[10px] font-medium bg-black/40 text-white px-1 py-0.5 rounded line-clamp-1 text-center">
                                      {imageData.label}
                                    </span>
                                  )}
                                  {/* Hover overlay with swap, fit & remove */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg md:rounded-xl flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                                    <button
                                      onClick={() => openImagePicker(index)}
                                      className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                                      title="Change image"
                                    >
                                      <svg className="w-3.5 h-3.5 text-[#33312e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleToggleImageFit(index)}
                                      className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                                      title={imageData.fit === "cover" ? "Original size" : "Fill square"}
                                    >
                                      <svg className="w-3.5 h-3.5 text-[#33312e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleClearImageCell(index)}
                                      className="w-7 h-7 bg-[#ff5d8f] rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
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
                                  <div className={`flex-1 flex items-center justify-center border overflow-y-auto transition-colors hover:bg-[#fff7ed]/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7c5cff] focus-within:ring-offset-1 ${size === 5 ? "rounded-md md:rounded-xl" : "rounded-lg md:rounded-xl"}`}
                                    style={{ borderColor: style.borderColor }}
                                  >
                                    <textarea
                                      ref={(el) => {
                                        cellTextareaRefs.current[index] = el;
                                      }}
                                      value={cell}
                                      onChange={(e) => {
                                        handleCellChange(index, e.target.value);
                                        // Auto-resize textarea to fit content
                                        const el = e.target;
                                        el.style.height = "auto";
                                        el.style.height = el.scrollHeight + "px";
                                      }}
                                      onFocus={(e) => {
                                        const el = e.target;
                                        el.style.height = "auto";
                                        el.style.height = el.scrollHeight + "px";
                                      }}
                                      placeholder={`${index + 1}`}
                                      rows={1}
                                      className={`w-full text-center bg-transparent resize-none focus:outline-none placeholder:text-[#a39a88] leading-tight ${size === 5 ? "text-[11px] md:text-sm p-0.5 md:p-1" : "text-sm p-1"}`}
                                      style={{
                                        color: style.textColor,
                                        fontFamily: style.fontFamily,
                                        height: "auto",
                                        overflow: "hidden",
                                        wordBreak: "break-word",
                                      }}
                                    />
                                  </div>
                                  {/* Camera button — hidden on mobile 5x5 until focused, always visible otherwise */}
                                  <button
                                    onClick={() => openImagePicker(index)}
                                    className={`absolute bottom-0.5 md:bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#a39a88]/80 hover:bg-[#7c5cff] text-[#6b6459] hover:text-white flex items-center justify-center transition-all ${size === 5 ? "opacity-0 group-focus-within:opacity-100 md:opacity-100" : ""}`}
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

                {/* Desktop sticky bottom CTA bar */}
                <div className="hidden md:block fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-[#a39a88] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                  <div className="container mx-auto max-w-xl px-4 py-3 flex items-center justify-center">
                    {permissionStatus && !permissionStatus.allowed && !isEditingExistingCard ? (
                      <button
                        onClick={redirectToCheckout}
                        className="w-full max-w-md bg-gradient-to-r from-[#ff8a3d] to-[#ff5d8f] text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-[#ff8a3d]/20 transition-all font-bold text-base shadow-md shadow-[#ff8a3d] text-center"
                      >
                        {t("btn.limit_reached")}
                      </button>
                    ) : (
                    <button
                      onClick={handleSave}
                      disabled={
                        loading ||
                        showPreview ||
                        isLoadingCard
                      }
                      className="w-full max-w-md bg-[#7c5cff] text-white px-6 py-3 rounded-xl hover:bg-[#0066DD] hover:shadow-lg hover:shadow-[#7c5cff]/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none font-bold text-base shadow-md"
                    >
                      {loading ? t("btn.saving") : isEditingExistingCard ? t("btn.save_dashboard") : session?.user ? "Save Card" : "Save This Card Free"}
                    </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {showCreatePageAd && (!permissionStatus?.planType || permissionStatus.planType === "FREE") && (
            <div className="mt-4 hidden lg:block">
              <AdUnit slot="create-page" format="horizontal" className="rounded-xl overflow-hidden" />
            </div>
          )}
          </>
          )}
        </div>

        {/* Mobile sticky bottom action bar */}
        {editorUnlocked && !isLoadingCard && (<div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          {/* Mobile toast for validation errors */}
          {mobileToast && (
            <div
              key={mobileToastKey}
              className="mx-4 mb-2 p-3 bg-[#ff5d8f] text-white rounded-xl text-sm font-semibold text-center shadow-lg animate-[slideUp_0.25s_ease-out,fadeOut_0.4s_ease-in_3s_forwards]"
              style={{ animation: "slideUp 0.25s ease-out, fadeOut 0.4s ease-in 3s forwards" }}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {mobileToast}
              </div>
            </div>
          )}
          <div className="bg-white border-t border-[#a39a88] shadow-lg">
            <div className="container mx-auto px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                {permissionStatus && !permissionStatus.allowed && !isEditingExistingCard ? (
                  <button
                    onClick={redirectToCheckout}
                    className="w-full bg-gradient-to-r from-[#ff8a3d] to-[#ff5d8f] text-white px-4 py-3.5 rounded-lg font-bold text-base shadow-md text-center"
                  >
                    {t("btn.upgrade")}
                  </button>
                ) : (
                <button
                  onClick={handleSave}
                  disabled={loading || showPreview || isLoadingCard}
                  className="w-full bg-[#7c5cff] text-white px-4 py-3.5 rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed font-bold text-base shadow-md"
                >
                  {loading ? t("btn.saving") : isEditingExistingCard ? t("btn.save") : session?.user ? "Save Card" : "Save This Card Free"}
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
          onClick={(e) => { if (e.target === e.currentTarget) closeAuthModal(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px"
          }}
        >
          <div style={{
            background: "white", borderRadius: "20px", padding: "32px 28px",
            maxWidth: "440px", width: "100%",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            position: "relative", textAlign: "center"
          }}>
            {/* Close */}
            <button
              onClick={closeAuthModal}
              style={{
                position: "absolute", top: "16px", right: "16px",
                background: "#f1f5f9", border: "none", borderRadius: "50%",
                width: "32px", height: "32px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", color: "#64748b", lineHeight: 1
              }}
            >×</button>

            {!magicSent ? (
              <>
                {/* Card ready icon */}
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>🎯</div>

                <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 800, color: "#1e293b", letterSpacing: "-0.5px" }}>
                  Save your card
                </h2>
                {title && (
                  <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#7c3aed", fontWeight: 600 }}>
                    &ldquo;{title}&rdquo;
                  </p>
                )}
                <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b" }}>
                  {localDraftSaveState === "error"
                    ? "This browser could not save your local draft. Check your browser storage settings before leaving this page."
                    : "Your draft is saved on this device. Sign in to save it to your account. Free accounts get one saved bingo card."}
                </p>

                {/* === Free path === */}
                <div style={{
                  background: "#f8fafc", borderRadius: "14px", padding: "16px",
                  marginBottom: "16px", border: "1px solid #e2e8f0"
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: "6px", marginBottom: "12px"
                  }}>
                    <span style={{
                      background: "#7c5cff/15", color: "#1e40af", fontSize: "11px",
                      fontWeight: 700, padding: "2px 8px", borderRadius: "6px",
                      letterSpacing: "0.5px", textTransform: "uppercase"
                    }}>Free</span>
                    <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>1 card</span>
                  </div>

                  {/* Google */}
                  <button
                    data-mybingocard-oauth-provider="google"
                    onClick={() => {
                      const callbackUrl = saveCheckoutCallbackUrl;
                      setBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey, "1");
                      trackClientActivity("signup_google_clicked", {
                        provider: "google",
                        callbackUrl,
                        surface: "create_save_modal",
                        intent: "draft_only",
                      });
                      trackClientActivity("oauth_signup_started", { provider: "google", callbackUrl });
                      if (startNativeOAuth("google", callbackUrl)) return;
                      signIn("google", { callbackUrl });
                    }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                      gap: "10px", padding: "12px 16px", borderRadius: "10px",
                      border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer",
                      fontSize: "14px", fontWeight: 600, color: "#1e293b",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.06)", marginBottom: "8px",
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

                  {appleSignInEnabled && (
                    <button
                      data-mybingocard-oauth-provider="apple"
                      onClick={() => {
                        const callbackUrl = saveCheckoutCallbackUrl;
                        setBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey, "1");
                        trackClientActivity("signup_apple_clicked", {
                          provider: "apple",
                          callbackUrl,
                          surface: "create_save_modal",
                          intent: "draft_only",
                        });
                        trackClientActivity("oauth_signup_started", { provider: "apple", callbackUrl });
                        if (startNativeOAuth("apple", callbackUrl)) return;
                        signIn("apple", { callbackUrl });
                      }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                        gap: "10px", padding: "12px 16px", borderRadius: "10px",
                        border: "1.5px solid #000", background: "#000", cursor: "pointer",
                        fontSize: "14px", fontWeight: 600, color: "white",
                        marginBottom: "8px", transition: "all 0.15s"
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M16.37 1.51c0 1.14-.42 2.14-1.25 3-.9.92-1.95 1.45-3.08 1.36-.14-1.1.43-2.28 1.25-3.12.86-.88 2.25-1.55 3.08-1.24ZM20.5 17.38c-.47 1.07-.7 1.55-1.3 2.5-.84 1.29-2.02 2.9-3.48 2.91-1.3.01-1.64-.85-3.4-.84-1.77.01-2.14.85-3.44.84-1.46-.01-2.57-1.46-3.41-2.75-2.35-3.61-2.6-7.85-1.15-10.1 1.03-1.6 2.65-2.53 4.18-2.53 1.55 0 2.53.86 3.82.86 1.25 0 2.02-.86 3.83-.86 1.37 0 2.82.75 3.84 2.04-3.37 1.85-2.82 6.67.01 7.93Z" />
                      </svg>
                      Continue with Apple
                    </button>
                  )}

                  {/* Magic link */}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleMagicLink(); }}
                      style={{
                        flex: 1, padding: "10px 12px", borderRadius: "10px",
                        border: "1.5px solid #e2e8f0", fontSize: "13px",
                        outline: "none", color: "#1e293b"
                      }}
                    />
                    <button
                      onClick={handleMagicLink}
                      disabled={magicLoading || !magicEmail.trim()}
                      style={{
                        padding: "10px 16px", borderRadius: "10px", border: "none",
                        background: magicEmail.trim() ? "#7c3aed" : "#e2e8f0",
                        color: magicEmail.trim() ? "white" : "#94a3b8",
                        fontWeight: 600, fontSize: "13px", cursor: magicEmail.trim() ? "pointer" : "default",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {magicLoading ? "Sending..." : "Send link"}
                    </button>
                  </div>
                </div>

                {/* === Premium path === */}
                <div style={{
                  background: "linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)",
                  borderRadius: "14px", padding: "16px", border: "1.5px solid #c4b5fd"
                }}>
                  <p style={{
                    margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "#5b21b6"
                  }}>
                    Want more than one card?
                  </p>
                  <p style={{
                    margin: "0 0 12px", fontSize: "12px", color: "#7c3aed", lineHeight: 1.5
                  }}>
                    Subscribe for $7.99/month to unlock unlimited cards, live hosting, share links, and PDF batches.
                  </p>

                  <button
                    data-mybingocard-oauth-provider="google"
                    onClick={() => {
                      const callbackUrl = premiumCheckoutCallbackUrl;
                      setBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey, "1");
                      trackClientActivity("signup_google_clicked", {
                        provider: "google",
                        callbackUrl,
                        surface: "create_save_modal",
                        intent: "subscription",
                      });
                      trackClientActivity("oauth_signup_started", { provider: "google", callbackUrl });
                      if (startNativeOAuth("google", callbackUrl)) return;
                      signIn("google", { callbackUrl });
                    }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                      gap: "8px", padding: "12px 16px", borderRadius: "10px",
                      border: "none", background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "white",
                      boxShadow: "0 2px 8px rgba(124,58,237,0.3)", marginBottom: "8px",
                      transition: "all 0.15s"
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Subscribe with Google
                  </button>

                  {appleSignInEnabled && (
                    <button
                      data-mybingocard-oauth-provider="apple"
                      onClick={() => {
                        const callbackUrl = premiumCheckoutCallbackUrl;
                        setBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey, "1");
                        trackClientActivity("signup_apple_clicked", {
                          provider: "apple",
                          callbackUrl,
                          surface: "create_save_modal",
                          intent: "subscription",
                        });
                        trackClientActivity("oauth_signup_started", { provider: "apple", callbackUrl });
                        if (startNativeOAuth("apple", callbackUrl)) return;
                        signIn("apple", { callbackUrl });
                      }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                        gap: "8px", padding: "12px 16px", borderRadius: "10px",
                        border: "none", background: "#000", cursor: "pointer",
                        fontSize: "14px", fontWeight: 700, color: "white",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)", transition: "all 0.15s"
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M16.37 1.51c0 1.14-.42 2.14-1.25 3-.9.92-1.95 1.45-3.08 1.36-.14-1.1.43-2.28 1.25-3.12.86-.88 2.25-1.55 3.08-1.24ZM20.5 17.38c-.47 1.07-.7 1.55-1.3 2.5-.84 1.29-2.02 2.9-3.48 2.91-1.3.01-1.64-.85-3.4-.84-1.77.01-2.14.85-3.44.84-1.46-.01-2.57-1.46-3.41-2.75-2.35-3.61-2.6-7.85-1.15-10.1 1.03-1.6 2.65-2.53 4.18-2.53 1.55 0 2.53.86 3.82.86 1.25 0 2.02-.86 3.83-.86 1.37 0 2.82.75 3.84 2.04-3.37 1.85-2.82 6.67.01 7.93Z" />
                      </svg>
                      Subscribe with Apple
                    </button>
                  )}

                  <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#a78bfa" }}>
                    $7.99/month. Cancel anytime.
                  </p>
                </div>

                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "14px 0 0" }}>
                  Already have an account?{" "}
                  <a href={"/login?callbackUrl=/create"} style={{ color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>Sign in</a>
                </p>
              </>
            ) : (
              <div style={{ padding: "20px 0" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📬</div>
                <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>Check your inbox</h3>
                <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#64748b", lineHeight: 1.5 }}>
                  We sent a magic link to <strong>{magicEmail}</strong>.<br />Click it to sign in and return to your draft.
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


      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason={upgradeReason} triggerContext={{ cards_created: permissionStatus?.cardsCreated ?? null, cards_limit: permissionStatus?.cardsLimit ?? null }} />
      <ImagePickerModal
        open={imagePickerCellIndex !== null}
        onClose={() => setImagePickerCellIndex(null)}
        onPick={handleImagePicked}
        canUploadImages={canUploadImages}
        isLoggedIn={Boolean(session?.user)}
        context="cell_image"
        cellIndex={imagePickerCellIndex ?? undefined}
      />
    </div>
    </>
  );
}

function CreatePageSkeleton() {
  return (
    <div className="playful-create" translate="no">
      <a className="skip-link" href="#main">Skip to card maker</a>
      <header className="app-header">
        <div className="app-header-in">
          <div className="brand-group">
            <Link href="/" className="logo" aria-label="MyBingoCard home">
              My<span>Bingo</span>Card
            </Link>
          </div>
          <ol className="progress" aria-label="Card creation progress">
            <li className="is-current" aria-current="step"><span className="progress-dot">1</span><span>Content</span></li>
            <li><span className="progress-dot">2</span><span>Style</span></li>
            <li><span className="progress-dot">3</span><span>Review</span></li>
          </ol>
          <Link href="/" className="back-link">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to home
          </Link>
        </div>
      </header>

      <main className="pt-16 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-16 px-3 sm:px-4 lg:px-5">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-2">
            <h1 className="text-xl font-bold text-[#33312e]">Create Bingo Cards Online</h1>
            <p className="mt-1 text-xs text-[#6b6459]">
              Customize a printable bingo card, start from a template, or prepare an online game.
            </p>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,300px)] xl:grid-cols-[minmax(0,240px)_minmax(500px,520px)_minmax(0,320px)] 2xl:grid-cols-[minmax(0,240px)_minmax(520px,560px)_minmax(0,340px)] gap-3 lg:gap-4 xl:justify-center items-start">
            <div className="order-2 lg:order-1 hidden lg:block rounded-2xl border border-[#a39a88]/50 bg-white/60 p-3">
              <div className="mb-3 h-5 w-28 rounded bg-[#a39a88]" />
              <div className="space-y-3">
                <div className="h-10 rounded-xl bg-[#a39a88]/80" />
                <div className="h-16 rounded-xl bg-[#a39a88]/80" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-9 rounded-lg bg-[#7c5cff]/15" />
                  <div className="h-9 rounded-lg bg-[#a39a88]/80" />
                  <div className="h-9 rounded-lg bg-[#a39a88]/80" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-8 rounded-lg bg-[#7c5cff]/15" />
                  <div className="h-8 rounded-lg bg-[#a39a88]/80" />
                  <div className="h-8 rounded-lg bg-[#a39a88]/80" />
                </div>
              </div>
            </div>

            <div className="order-3 lg:order-3 hidden lg:block space-y-3">
              <div className="rounded-2xl border border-[#a39a88]/50 bg-white/60 p-3">
                <div className="mb-3 h-5 w-28 rounded bg-[#a39a88]" />
                <div className="h-10 rounded-xl bg-[#a39a88]/80" />
                <div className="mt-3 h-10 rounded-xl bg-[#7c5cff]" />
              </div>
              <div className="rounded-2xl border border-[#a39a88]/50 bg-white/60 p-3">
                <div className="mb-3 h-5 w-32 rounded bg-[#a39a88]" />
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-12 rounded-lg bg-[#a39a88]/80" />
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 min-w-0">
              <div className="bg-white rounded-2xl shadow-lg ring-1 ring-[#a39a88] p-3 lg:max-w-[500px] 2xl:max-w-[540px] lg:mx-auto flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <div className="h-5 w-28 rounded bg-[#a39a88]" />
                  <div className="h-6 w-28 rounded-full bg-[#fff7ed]" />
                </div>
                <div className="flex-grow bg-[#fff7ed] rounded-xl border border-[#a39a88] p-2 lg:p-3 mb-2">
                  <div className="mb-2 h-7 rounded-md bg-[#7c5cff]/15" />
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <div key={index} className="aspect-square rounded-xl border border-[#a39a88] bg-white" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-[#a39a88] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="container mx-auto max-w-xl px-4 py-3">
          <div className="mx-auto h-12 max-w-md rounded-xl bg-[#7c5cff]/80" />
        </div>
      </div>
    </div>
  );
}

export default function CreateCardPage() {
  return (
    <Suspense fallback={<CreatePageSkeleton />}>
      <CreateCardContent />
    </Suspense>
  );
}
