"use client";

import { trackCardCreated } from "@/lib/analytics";
import { useAnalytics } from "@/lib/analytics/client";
import { trackClientActivity } from "@/lib/activity-client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import AdUnit from "@/components/AdUnit";
import UpgradeModal from "@/components/UpgradeModal";
import ImagePickerModal from "@/components/ImagePickerModal";
import BingoCell from "@/components/BingoCell";
import AiGenerateSection from "@/components/AiGenerateSection";
import { isImageCell, parseImageCell, encodeImageCell } from "@/lib/cellContent";
import {
  BATCH_PACKS,
  formatBatchPackPrice,
  isBatchCount,
  type BatchCount,
} from "@/lib/batchPacks";
import { redirectToCheckout } from "@/lib/upgrade";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { t } from "@/lib/i18n";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

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
    requiresCheckout?: boolean;
  } | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [mobileToast, setMobileToast] = useState("");
  const [mobileToastKey, setMobileToastKey] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"card_limit" | "image_picker" | "ai_generate" | "batch_generate">("card_limit");
  const [imagePickerCellIndex, setImagePickerCellIndex] = useState<number | null>(null);
  const [showNewUserTip, setShowNewUserTip] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const currentCardIdRef = useRef<string | null>(cardIdFromUrl);
  const createInFlightRef = useRef(false);

  // Tracking refs
  const firstCellAddedAtRef = useRef<number | null>(null);
  const pageLoadedAtRef = useRef<number>(Date.now());
  const styleChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStyleRef = useRef<CellStyle>(style);
  const draftLoadTrackedRef = useRef(false);
  const batchCancelTrackedRef = useRef(false);
  const trialCheckoutOpenedRef = useRef(false);

  useEffect(() => {
    currentCardIdRef.current = currentCardId;
  }, [currentCardId]);

  // Refresh session after trial checkout so JWT picks up new planType/subscriptionStatus
  useEffect(() => {
    if (searchParams.get("trial") === "started" && session?.user) {
      sessionData.update();
    }
  }, [searchParams, session?.user, sessionData]);

  // Show new user tip if they have 0 cards and haven't dismissed it
  useEffect(() => {
    if (!checkingPermission && permissionStatus?.cardsCreated === 0 && !cardIdFromUrl) {
      const dismissed = typeof window !== "undefined" && localStorage.getItem("new_user_tip_dismissed");
      if (!dismissed) setShowNewUserTip(true);
    }
  }, [checkingPermission, permissionStatus, cardIdFromUrl]);

  // Block new signups behind trial checkout — card info required
  const [trialClientSecret, setTrialClientSecret] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState("");
  const isNewSignup = !checkingPermission && session?.user && permissionStatus?.requiresCheckout && permissionStatus?.planType !== "PREMIUM";

  useEffect(() => {
    if (trialCheckoutOpenedRef.current) return;
    if (!isNewSignup) return;

    trialCheckoutOpenedRef.current = true;
    setTrialLoading(true);

    fetch("/api/stripe/embedded-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseType: "trial", returnPath: "/create?trial=started" }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 409) {
          // Already subscribed — let them through
          router.replace("/create");
          return;
        }
        if (!res.ok || !data.clientSecret) {
          setTrialError(data.error || "Failed to start trial. Please try again.");
          return;
        }
        setTrialClientSecret(data.clientSecret);
      })
      .catch(() => setTrialError("Something went wrong. Please try again."))
      .finally(() => setTrialLoading(false));
  }, [isNewSignup, router]);

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

  // Auto-show auth modal for guest users returning from successful batch checkout
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

  // Track batch checkout cancel when user returns with ?batchPurchase=canceled
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
      let draftSource: "localStorage" | "url_params" | "template" | "empty" = "empty";
      let draftCells: string[] = [];
      let draftHasTitle = false;
      let draftTemplateId: string | undefined;

      try {
        const saved = localStorage.getItem("mybingo_card_draft");
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft.title) { setTitle(draft.title); draftHasTitle = true; }
          if (draft.description) setDescription(draft.description);
          if (draft.size) setSize(draft.size as GridSize);
          if (draft.cells) { setCells(draft.cells); draftCells = draft.cells; }
          if (typeof draft.freeSpace === "boolean") setFreeSpace(draft.freeSpace);
          if (typeof draft.isPublic === "boolean") setIsPublic(draft.isPublic);
          if (draft.style) {
            setStyle((prev) => ({ ...prev, ...draft.style }));
          }
          draftSource = "localStorage";
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
      const templateId = searchParams.get("templateId");

      if (urlTitle) { setTitle(urlTitle); draftHasTitle = true; }
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
    // Skip draft-save redirect for new signups — they need to complete trial checkout first
    const isNewUser = searchParams.get("new") === "1";
    const draftRaw = localStorage.getItem("mybingo_card_draft");
    if (session?.user && draftRaw && !cardIdFromUrl && !isNewUser) {
      // Prevent auto-save from also firing a duplicate POST
      createInFlightRef.current = true;
      (async () => {
        try {
          const draft = JSON.parse(draftRaw);
          if (draft.title && draft.cells?.some((c: string) => c?.trim())) {
            const response = await fetch("/api/cards", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: draft.title,
                description: draft.description || "",
                size: draft.size || 3,
                cells: draft.cells,
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
              localStorage.removeItem("mybingo_card_draft");
              router.replace("/dashboard");
              return;
            }
          }
        } catch (e) {
          console.error("Failed to save draft after sign-in:", e);
        } finally {
          createInFlightRef.current = false;
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [cardIdFromUrl, searchParamsKey, session?.user]);

  const showMobileToast = (msg: string) => {
    setMobileToast(msg);
    setMobileToastKey((k) => k + 1);
    setTimeout(() => setMobileToast(""), 3500);
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

    const cellsFilledCount = cells.filter((c) => c.trim()).length;

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
          trackClientActivity("card_save_blocked", {
            reason: "not_logged_in",
            title: payload.title,
            size: payload.size,
            cells_filled: cellsFilledCount,
          });
          redirectToSignupForCreation();
          return false;
        }
        if (response.status === 403 && !currentCardIdRef.current) {
          trackClientActivity("card_save_blocked", {
            reason: "card_limit_reached",
            title: payload.title,
            size: payload.size,
            cells_filled: cellsFilledCount,
          });
          setError(data.error || "Card limit reached. Please upgrade your plan.");
          setUpgradeReason("card_limit");
          setShowUpgradeModal(true);
          track("card_limit_reached", { plan_type: permissionStatus?.planType || "FREE" });
        } else {
          trackClientActivity("card_save_blocked", {
            reason: "validation_error",
            title: payload.title,
            size: payload.size,
            cells_filled: cellsFilledCount,
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
        router.push("/dashboard");
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
    setCells(newCells);
    trackOnce("ai_cells_applied", { size, cell_count: newCells.filter(c => c.trim()).length });
  };

  const openImagePicker = (index: number) => {
    if (permissionStatus?.planType !== "PREMIUM") {
      setUpgradeReason("image_picker");
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
    draftTimerRef.current = setTimeout(() => {
      persistDraft();
    }, 1000);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [title, description, size, cells, freeSpace, isPublic, style, currentCardId, isLoadingCard]);

  // Track card_draft_lost on beforeunload (navigating away with unsaved changes)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const hasContent = title.trim() || cells.some((c) => c.trim());
      if (!hasContent) return;

      // If already saved and no changes, don't fire
      const snapshot = JSON.stringify(getCardPayload());
      if (snapshot === lastSavedSnapshotRef.current) return;

      const timeSpent = Math.round((Date.now() - pageLoadedAtRef.current) / 1000);
      trackClientActivity("card_draft_lost", {
        cells_filled: cells.filter((c) => c.trim()).length,
        has_title: Boolean(title.trim()),
        time_spent_seconds: timeSpent,
      }, { keepalive: true });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [title, cells, size, freeSpace, isPublic, style, description]);

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
    setBatchCheckoutLoading(true);
    setError("");

    try {
      if (!session?.user) {
        // Guest checkout: redirect to Stripe directly (no auth needed)
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

      // Authenticated checkout: use embedded modal
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
  const isGuestReturn = searchParams.get("guest") === "true";
  const batchStatusMessage =
    batchPurchaseStatus === "success"
      ? isGuestReturn && !session?.user
        ? `Payment received! Sign in with the email you used at checkout to access your ${batchCount}-card batch.`
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

  // Block new signups until card info is entered
  return (
    <>
    {/* Trial checkout popup — blocks interaction until card entered */}
    {isNewSignup && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Start Your 7-Day Free Trial</h2>
            <p className="text-slate-500 text-sm mt-1">You won't be charged for 7 days. Cancel anytime.</p>
          </div>

          {trialLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          )}

          {trialError && (
            <div className="text-center py-6">
              <p className="text-red-500 text-sm mb-3">{trialError}</p>
              <button
                onClick={() => {
                  trialCheckoutOpenedRef.current = false;
                  setTrialError("");
                  setTrialLoading(true);
                  fetch("/api/stripe/embedded-checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ purchaseType: "trial", returnPath: "/create?trial=started" }),
                  })
                    .then(async (res) => {
                      const data = await res.json();
                      if (!res.ok || !data.clientSecret) {
                        setTrialError(data.error || "Failed to start trial.");
                        return;
                      }
                      setTrialClientSecret(data.clientSecret);
                    })
                    .catch(() => setTrialError("Something went wrong."))
                    .finally(() => setTrialLoading(false));
                }}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {trialClientSecret && !trialLoading && (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret: trialClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </div>
    )}

    <div className="min-h-screen bg-[#f2f2f7] selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50">
        <div className="container mx-auto px-4 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-[#007AFF] rounded-lg flex items-center justify-center shadow-sm transition-all duration-300">
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
              onClick={() => {
                const nextPreview = !showPreview;
                setShowPreview(nextPreview);
                trackClientActivity("preview_toggled", { enabled: nextPreview });
              }}
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

      <main className="pt-16 pb-32 md:pb-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">
                {isEditingExistingCard ? "Edit Bingo Card" : "Create Bingo Card"}
              </h1>
              <span className="text-xs text-gray-400" title={autoSaveLabel}>
                {autoSaveState === "saving" ? "Saving..." : autoSaveState === "saved" ? "\u2713 Saved" : ""}
              </span>
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
              {t("label.loading")}
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

          {showNewUserTip && (
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 flex items-center justify-between gap-4 animate-fade-in-up">
              <p className="text-sm text-gray-600">
                First time? Type a title above and fill in the squares, or{" "}
                <Link href="/templates" className="text-[#007AFF] font-semibold hover:underline">
                  start from a template
                </Link>.
              </p>
              <button
                onClick={() => { setShowNewUserTip(false); localStorage.setItem("new_user_tip_dismissed", "1"); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                title="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {editorUnlocked && !isLoadingCard && (
          <div className="grid lg:grid-cols-[minmax(0,240px)_1fr_minmax(0,340px)] gap-4 lg:gap-5 items-start">
            {/* Left Panel - Card Details */}
            <div className="lg:order-1 space-y-5 min-w-0">
              {/* Basic Info */}
              <div className="bg-white/60 rounded-2xl border border-gray-200/50 p-4">
                <h2 className="text-base font-bold text-gray-900 mb-3">
                   Card Details
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                      className="w-full px-3 py-2 bg-[#f2f2f7] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] outline-none transition-all duration-200 placeholder:text-gray-400 text-sm"
                      disabled={showPreview}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Description <span className="font-normal text-gray-500">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add some instructions for your players..."
                      rows={2}
                      className="w-full px-3 py-2 bg-[#f2f2f7] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] outline-none transition-all duration-200 placeholder:text-gray-400 resize-none text-sm"
                      disabled={showPreview}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                     <label htmlFor="free-space-toggle" className={`flex items-center gap-3 p-3 border border-gray-200 rounded-xl transition-colors ${showPreview ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
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

                    <label htmlFor="public-toggle" className={`flex items-center gap-3 p-3 border border-gray-200 rounded-xl transition-colors ${showPreview ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}>
                      <div className="relative flex items-center">
                         <input
                            id="public-toggle"
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

            </div>

            {/* Right Panel - AI, Style & Batch */}
            <div className="lg:order-3 space-y-4 min-w-0">
              {/* AI Generate */}
              <AiGenerateSection
                size={size}
                freeSpace={freeSpace}
                title={title}
                onCellsGenerated={handleAiCellsGenerated}
                isPremium={permissionStatus?.planType === "PREMIUM"}
                disabled={showPreview}
                onUpgradeNeeded={() => {
                  setUpgradeReason("ai_generate");
                  setShowUpgradeModal(true);
                }}
              />

              {/* Style Customization */}
              <div className="bg-white/60 rounded-2xl border border-gray-200/50 p-4">
                <h2 className="text-base font-bold text-gray-900 mb-3">
                   Style & Colors
                </h2>

                <div className="space-y-4">
                  {/* Theme Presets */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
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
                              ? "border-[#007AFF] ring-2 ring-[#007AFF]/20"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div
                            className="w-full h-6 rounded border flex items-center justify-center"
                            style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                          >
                            <span className="text-[8px] font-bold" style={{ color: theme.text }}>BINGO</span>
                          </div>
                          <span className="text-[9px] font-medium text-gray-500 leading-none">{theme.name}</span>
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
                            className="w-9 h-9 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white flex-shrink-0"
                          />
                          <span className="text-sm text-gray-600 w-20">{label}</span>
                          <div
                            className="flex-1 h-6 rounded-md border border-gray-200"
                            style={{ backgroundColor: style[key] }}
                          ></div>
                        </div>
                      ))}
                      {/* Font Controls — inside collapsible */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Font</label>
                          <select
                            value={style.fontFamily}
                            onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
                            disabled={showPreview}
                            className="w-full px-2 py-2 bg-[#f2f2f7] border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
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
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Size</label>
                          <div className="flex items-center gap-0.5 bg-[#f2f2f7] border border-gray-200 rounded-lg p-0.5">
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
                  </details>

                </div>
              </div>

              {/* Batch Generation — Always visible, prominent */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-200/60 p-4">
                <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                   <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                     </svg>
                   </span>
                   Print Multiple Cards
                </h2>
                <p className="text-xs text-gray-500 mb-3">Generate up to 500 unique shuffled cards.</p>

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
                          });
                        }}
                        className={`relative py-1.5 px-1 rounded-lg border-2 text-center transition-all ${
                          isSelected
                            ? "border-blue-500 bg-white shadow-md ring-1 ring-blue-500/20"
                            : "border-gray-200/80 bg-white/70 hover:border-blue-300 hover:bg-white"
                        }`}
                      >
                        <div className="text-sm font-bold text-gray-900">{n}</div>
                        <div className="text-[10px] font-medium text-gray-500">cards</div>
                        {!isPremiumBatchUser && (
                          <div className="mt-1 text-xs font-bold text-blue-600">
                            {BATCH_PACKS[n].label}
                          </div>
                        )}
                        {isPremiumBatchUser && (
                          <div className="mt-1 text-[10px] font-semibold text-emerald-600">Included</div>
                        )}
                        {hasReady && (
                          <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
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
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {batchStatusMessage}
                  </div>
                )}

                {isPremiumBatchUser && batchMode && (
                  <p className="text-xs text-gray-500 mb-3">
                    Every card gets a unique shuffled arrangement. Included with Premium.
                  </p>
                )}

                {!isPremiumBatchUser && !session?.user && batchMode && (
                  <p className="text-xs text-gray-500 mb-3">
                    Sign up to purchase batch packs, or upgrade to Premium for unlimited batches.
                  </p>
                )}

                {availableBatchSummary && !isPremiumBatchUser && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 mb-3">
                    Purchased: {availableBatchSummary}
                  </div>
                )}

                {batchResult && (
                  <div className="bg-white border border-emerald-200 rounded-xl p-4 space-y-3 mb-3">
                    <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {batchResult.count} cards generated!
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleBatchPdfDownload(1)}
                        disabled={batchPdfLoading !== null}
                        className={`py-2.5 rounded-lg text-xs font-semibold transition ${
                          batchPdfLoading === "pdf-1" ? "bg-blue-700 text-white cursor-wait" : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {batchPdfLoading === "pdf-1" ? "..." : "1 per page"}
                      </button>
                      <button
                        onClick={() => handleBatchPdfDownload(2)}
                        disabled={batchPdfLoading !== null}
                        className={`py-2.5 rounded-lg text-xs font-semibold transition ${
                          batchPdfLoading === "pdf-2" ? "bg-blue-600 text-white cursor-wait" : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                      >
                        {batchPdfLoading === "pdf-2" ? "..." : "2 per page"}
                      </button>
                      <button
                        onClick={() => handleBatchPdfDownload(4)}
                        disabled={batchPdfLoading !== null}
                        className={`py-2.5 rounded-lg text-xs font-semibold transition ${
                          batchPdfLoading === "pdf-4" ? "bg-blue-500 text-white cursor-wait" : "bg-blue-400 text-white hover:bg-blue-500"
                        }`}
                      >
                        {batchPdfLoading === "pdf-4" ? "..." : "4 per page"}
                      </button>
                      <button
                        onClick={() => handleBatchPdfDownload(1, true)}
                        disabled={batchPdfLoading !== null}
                        className={`py-2.5 rounded-lg text-xs font-semibold transition ${
                          batchPdfLoading === "pdf-gray" ? "bg-slate-700 text-white cursor-wait" : "bg-slate-500 text-white hover:bg-slate-600"
                        }`}
                      >
                        {batchPdfLoading === "pdf-gray" ? "..." : "Grayscale"}
                      </button>
                    </div>
                    <button
                      onClick={() => router.push("/dashboard/cards")}
                      className="w-full py-2 text-sm text-[#007AFF] font-medium"
                    >
                      View all cards in dashboard
                    </button>
                  </div>
                )}

                {batchMode && !batchResult && (
                  <button
                    onClick={handleBatchPrimaryAction}
                    disabled={batchActionDisabled}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 hover:shadow-md transition-all disabled:opacity-50 font-bold text-sm"
                  >
                    {batchActionLabel}
                  </button>
                )}

                {!batchMode && (
                  <button
                    onClick={() => { setBatchMode(true); setBatchResult(null); }}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 hover:shadow-md transition-all font-bold text-sm flex items-center justify-center gap-2"
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
            <div className="lg:order-2 lg:sticky lg:top-24 lg:self-start min-w-0">
              <div className="bg-white rounded-2xl shadow-lg ring-1 ring-gray-200 p-3 lg:p-4 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-bold text-gray-900">
                    {showPreview ? "Card Preview" : "Edit Content"}
                  </h2>
                  {!showPreview && (
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
                      {size}×{size} grid • {size * size} cells
                    </span>
                  )}
                </div>

                {/* Bingo Grid */}
                <div className="flex-grow flex items-center justify-center bg-[#f2f2f7] rounded-xl border border-gray-200 p-2 lg:p-4 mb-3">
                   <div className="w-full">
                      {/* Grid Header - matches grid columns */}
                      <div
                        className="grid mb-1.5 md:mb-2 text-center font-bold tracking-widest text-gray-900 opacity-90"
                        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gap: size === 5 ? "3px" : "8px" }}
                      >
                         <div
                           className={`font-bold text-center text-[#007AFF] truncate px-2 ${size === 5 ? "py-1 text-xs md:text-sm" : "py-1.5 text-sm"}`}
                           style={{ gridColumn: "1 / -1" }}
                         >
                           {title || "My Bingo Card"}
                         </div>
                      </div>

                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: `repeat(${size}, 1fr)`,
                          gap: size === 5 ? "3px" : size === 4 ? "6px" : "8px",
                        }}
                      >
                        {cells.map((cell, index) => {
                          const isFreeSpace = freeSpace && index === getFreeSpaceIndex();
                          const cellIsImage = isImageCell(cell);
                          const imageData = cellIsImage ? parseImageCell(cell) : null;

                          return (
                            <div
                              key={index}
                              className={`relative group transition-all duration-200 ${
                                size === 5 ? "aspect-[1/1.1] md:aspect-square" : "aspect-square"
                              } ${
                                showPreview ? "shadow-sm" : "focus-within:ring-2 focus-within:ring-[#007AFF] focus-within:ring-offset-1"
                              }`}
                              style={{
                                backgroundColor: style.backgroundColor,
                                borderColor: style.borderColor,
                              }}
                            >
                              {isFreeSpace ? (
                                <div
                                  className={`w-full h-full flex items-center justify-center border-2 font-bold p-1 text-center shadow-inner bg-opacity-90 ${size === 5 ? "rounded-md md:rounded-xl text-xs md:text-base" : "rounded-lg md:rounded-xl"}`}
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
                                    <span className="text-[9px] md:text-[10px] font-medium text-gray-700 mt-0.5 line-clamp-1 w-full text-center">
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
                                      <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleToggleImageFit(index)}
                                      className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                                      title={imageData.fit === "cover" ? "Original size" : "Fill square"}
                                    >
                                      <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
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
                                  <div className={`flex-1 flex items-center justify-center border overflow-y-auto transition-colors hover:bg-gray-50/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#007AFF] focus-within:ring-offset-1 ${size === 5 ? "rounded-md md:rounded-xl" : "rounded-lg md:rounded-xl"}`}
                                    style={{ borderColor: style.borderColor }}
                                  >
                                    <textarea
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
                                      className={`w-full text-center bg-transparent resize-none focus:outline-none placeholder:text-gray-300 leading-tight ${size === 5 ? "text-[11px] md:text-sm p-0.5 md:p-1" : "text-sm p-1"}`}
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
                                    className={`absolute bottom-0.5 md:bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-gray-200/80 hover:bg-[#007AFF] text-gray-400 hover:text-white flex items-center justify-center transition-all ${size === 5 ? "opacity-0 group-focus-within:opacity-100 md:opacity-100" : ""}`}
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
                <div className="hidden md:block fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                  <div className="container mx-auto max-w-xl px-4 py-3 flex flex-col items-center gap-1.5">
                    {!session?.user && !isEditingExistingCard && (
                      <p className="text-xs text-gray-500 font-medium">Free to create — no credit card needed</p>
                    )}
                    {permissionStatus && !permissionStatus.allowed && !isEditingExistingCard ? (
                      <button
                        onClick={redirectToCheckout}
                        className="w-full max-w-md bg-gradient-to-r from-orange-500 to-pink-600 text-white px-8 py-4 rounded-xl hover:shadow-lg hover:shadow-orange-500/20 transition-all font-bold text-lg shadow-md shadow-orange-200 text-center"
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
                      className="w-full max-w-md bg-[#007AFF] text-white px-8 py-4 rounded-xl hover:bg-[#0066DD] hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none font-bold text-lg shadow-md"
                    >
                      {loading ? t("btn.saving") : isEditingExistingCard ? t("btn.save_dashboard") : session?.user ? t("btn.create_save_full") : t("btn.signup_to_save_full")}
                    </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Mobile sticky bottom action bar */}
        {editorUnlocked && !isLoadingCard && (<div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          {/* Mobile toast for validation errors */}
          {mobileToast && (
            <div
              key={mobileToastKey}
              className="mx-4 mb-2 p-3 bg-red-600 text-white rounded-xl text-sm font-semibold text-center shadow-lg animate-[slideUp_0.25s_ease-out,fadeOut_0.4s_ease-in_3s_forwards]"
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
          {/* Upgrade nudge for free authenticated users */}
          {session?.user && permissionStatus?.planType === "FREE" && !isEditingExistingCard && (
            <div className="mx-3 mb-1">
              <button
                onClick={() => { setUpgradeReason("batch_generate"); setShowUpgradeModal(true); }}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Get Premium — AI, Batch, Unlimited Cards — $14.99 lifetime
              </button>
            </div>
          )}
          {/* Signup nudge for anonymous users */}
          {!session?.user && (
            <div className="mx-3 mb-1">
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-xs font-semibold text-center">
                Free to create — no credit card needed
              </div>
            </div>
          )}
          <div className="bg-white border-t border-gray-200 shadow-lg">
            <div className="container mx-auto px-4 py-3">
                {permissionStatus && !permissionStatus.allowed && !isEditingExistingCard ? (
                  <button
                    onClick={redirectToCheckout}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white px-4 py-3.5 rounded-lg font-bold text-base shadow-md text-center"
                  >
                    {t("btn.upgrade")}
                  </button>
                ) : (
                <button
                  onClick={handleSave}
                  disabled={loading || showPreview || isLoadingCard}
                  className="w-full bg-[#007AFF] text-white px-4 py-3.5 rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed font-bold text-base shadow-md"
                >
                  {loading ? t("btn.saving") : isEditingExistingCard ? t("btn.save") : session?.user ? t("btn.create_save") : t("btn.signup_to_save")}
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
              Your card is ready!
            </h2>
            {title && (
              <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#7c3aed", fontWeight: 600 }}>
                &ldquo;{title}&rdquo;
              </p>
            )}
            <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#64748b" }}>
              Sign up to save, share, and download your card.
            </p>
            <p style={{ margin: "0 0 24px", fontSize: "13px", color: "#94a3b8" }}>
              Free — takes 10 seconds. Your card will be waiting.
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

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason={upgradeReason} triggerContext={{ cards_created: permissionStatus?.cardsCreated ?? null, cards_limit: permissionStatus?.cardsLimit ?? null }} />
      <ImagePickerModal
        open={imagePickerCellIndex !== null}
        onClose={() => setImagePickerCellIndex(null)}
        onPick={handleImagePicked}
        isPremium={permissionStatus?.planType === "PREMIUM"}
        context="cell_image"
        cellIndex={imagePickerCellIndex ?? undefined}
      />
    </div>
    </>
  );
}

export default function CreateCardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center text-[#007AFF]">Loading editor...</div>}>
      <CreateCardContent />
    </Suspense>
  );
}
