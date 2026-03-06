"use client";

import { trackCardCreated } from "@/lib/analytics";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import AdUnit from "@/components/AdUnit";

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

function CreateCardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionData = useSession();
  const session = sessionData?.data;
  const [size, setSize] = useState<GridSize>(5);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cells, setCells] = useState<string[]>(Array(25).fill(""));
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
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchCount, setBatchCount] = useState<10 | 25 | 50 | 100>(10);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{count: number; cardIds: string[]} | null>(null);
  const [batchPdfLoading, setBatchPdfLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<{
    allowed: boolean;
    reason?: string;
    upgradeRequired?: boolean;
    cardsCreatedThisMonth?: number;
    cardsLimit?: number;
    planType?: PlanType;
  } | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(true);

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

  // Restore saved card draft from localStorage (after signup/login redirect)
  useEffect(() => {
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
        if (draft.style) setStyle(draft.style);
        localStorage.removeItem("mybingo_card_draft");
      }
    } catch (e) {
      console.error("Failed to restore card draft:", e);
    }
  }, []);

  // Load template data from URL parameters
  useEffect(() => {
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
      } catch (e) {
        console.error("Failed to parse cells from URL:", e);
      }
    }
    if (urlFreeSpace) setFreeSpace(urlFreeSpace === "true");
    if (urlStyle) {
      try {
        setStyle(JSON.parse(urlStyle));
      } catch (e) {
        console.error("Failed to parse style from URL:", e);
      }
    }
  }, [searchParams]);

  const handleCellChange = (index: number, value: string) => {
    const newCells = [...cells];
    newCells[index] = value;
    setCells(newCells);
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");

    try {
      // Validate required fields
      if (!title.trim()) {
        setError("Card title is required");
        setLoading(false);
        return;
      }

      // Check if at least some cells have content
      const filledCells = cells.filter((cell) => cell.trim()).length;
      if (filledCells === 0) {
        setError("Please fill in at least one cell");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          size,
          cells,
          freeSpace,
          isPublic,
          style,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          try {
            localStorage.setItem("mybingo_card_draft", JSON.stringify({
              title, description, size, cells, freeSpace, isPublic, style,
            }));
          } catch (e) {
            console.error("Failed to save card draft:", e);
          }
          router.push("/signup?callbackUrl=/create&reason=save");
          return;
        } else if (response.status === 403) {
          setError(data.error || "Card limit reached. Please upgrade your plan.");
        } else {
          setError(data.error || "Failed to create card");
        }
        setLoading(false);
        return;
      }

      // Track card creation
      if (data.card?._id) {
        trackCardCreated(data.card._id, size, isPublic);
      }
      // Success - redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Save error:", err);
      setError("An error occurred while saving the card");
      setLoading(false);
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
        setError(data.error || "Failed to generate batch cards");
        setBatchLoading(false);
        return;
      }

      setBatchResult({
        count: data.count,
        cardIds: data.cards.map((c: any) => c._id),
      });
    } catch (err) {
      console.error("Batch error:", err);
      setError("An error occurred during batch generation");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchPdfDownload = async (cardsPerPage: number = 1, grayscale: boolean = false) => {
    if (!batchResult) return;
    setBatchPdfLoading(true);

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
      const a = document.createElement("a");
      a.href = url;
      a.download = `bingo-batch-${batchResult.count}-cards.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Failed to download batch PDF");
    } finally {
      setBatchPdfLoading(false);
    }
  };

  const getFreeSpaceIndex = () => {
    if (!freeSpace) return -1;
    return Math.floor((size * size) / 2);
  };

  const canUseGridSize = (gridSize: GridSize): boolean => {
    if (!permissionStatus) return true;

    // Map plan types to max grid sizes
    const maxGridSizes: Record<PlanType, number> = {
      FREE: 3,
      PREMIUM: 5,
    };

    const planType = (permissionStatus.planType === "PREMIUM" ? "PREMIUM" : "FREE") as PlanType;
    return gridSize <= maxGridSizes[planType];
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

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              MyBingoCard
            </span>
          </Link>
          
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
            >
              {showPreview ? "Back to Edit" : "Preview Card"}
            </button>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all duration-200"
            >
              Cancel
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32 md:pb-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">Create Bingo Card</h1>
             {/* Usage Banner */}
            {!checkingPermission && permissionStatus && (
              <div className={`hidden md:flex items-center gap-4 px-4 py-2 rounded-full border ${
                permissionStatus.allowed
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
                      : `${permissionStatus.cardsCreatedThisMonth}/${permissionStatus.cardsLimit} used`}
                  </span>
                   {permissionStatus.upgradeRequired && (
                    <Link
                      href="/pricing"
                      className="ml-2 px-3 py-1 bg-white rounded-full text-xs font-bold shadow-sm hover:shadow transition-all"
                    >
                      Upgrade
                    </Link>
                  )}
              </div>
            )}
          </div>

          {/* Sign-in prompt for anonymous users */}
          {!session?.user && !checkingPermission && (
            <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                You&apos;ll need an account to save your card.{" "}
                <Link href="/signup?callbackUrl=/create" className="font-semibold underline underline-offset-2 hover:text-indigo-900">
                  Sign up free
                </Link>{" "}
                or{" "}
                <Link href="/login?callbackUrl=/create" className="font-semibold underline underline-offset-2 hover:text-indigo-900">
                  log in
                </Link>{" "}
                to get started.
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

          {/* Ad placement for free users */}
          {(!permissionStatus?.planType || permissionStatus.planType === "FREE") && (
            <div className="mb-6">
              <AdUnit slot="create-page" format="horizontal" className="rounded-xl overflow-hidden" />
            </div>
          )}

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Panel - Card Settings */}
            <div className="lg:col-span-4 space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                   <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">1</span>
                   Card Details
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Card Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Wedding Bingo"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 placeholder:text-slate-400"
                      disabled={showPreview}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Description <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add some instructions for your players..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200 placeholder:text-slate-400 resize-none"
                      disabled={showPreview}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600"
                                  : isAllowed
                                  ? "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50"
                                  : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
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
                     <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={freeSpace}
                            onChange={(e) => setFreeSpace(e.target.checked)}
                            disabled={showPreview}
                            className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700">Include free space</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="relative flex items-center">
                         <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            disabled={showPreview}
                            className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                          <div className="text-sm font-medium text-slate-700">Make Public</div>
                          <div className="text-xs text-slate-500">Allow anyone with the link to view</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Style Customization */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                   <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">2</span>
                   Style & Colors
                </h2>

                <div className="space-y-5">
                  {/* Theme Presets */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
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
                              ? "border-indigo-500 ring-2 ring-indigo-500/20"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div
                            className="w-full h-8 rounded-lg border flex items-center justify-center"
                            style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                          >
                            <span className="text-[10px] font-bold" style={{ color: theme.text }}>B I N G O</span>
                          </div>
                          <span className="text-[10px] font-medium text-slate-600">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Colors (collapsed by default) */}
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-500 uppercase tracking-wide select-none hover:text-indigo-600 transition-colors">
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
                            className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white flex-shrink-0"
                          />
                          <span className="text-sm text-slate-600 w-20">{label}</span>
                          <div
                            className="flex-1 h-6 rounded-md border border-slate-200"
                            style={{ backgroundColor: style[key] }}
                          ></div>
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* Font Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Font
                      </label>
                      <select
                        value={style.fontFamily}
                        onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
                        disabled={showPreview}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Text Size
                      </label>
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
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
                                ? "bg-white text-indigo-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
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
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                   <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">3</span>
                   Batch Generate
                </h2>

                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors mb-4">
                  <input
                    type="checkbox"
                    checked={batchMode}
                    onChange={(e) => { setBatchMode(e.target.checked); setBatchResult(null); }}
                    className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-700">Enable batch mode</div>
                    <div className="text-xs text-slate-500">Generate multiple unique cards from the same items</div>
                  </div>
                </label>

                {batchMode && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Number of Cards
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {([10, 25, 50, 100] as const).map((n) => (
                          <button
                            key={n}
                            onClick={() => setBatchCount(n)}
                            className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                              batchCount === n
                                ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600"
                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      Each card will have a unique random arrangement of your items. Requires Premium plan.
                    </p>

                    {batchResult && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-emerald-800">
                          {batchResult.count} cards generated!
                        </p>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleBatchPdfDownload(1)}
                            disabled={batchPdfLoading}
                            className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
                          >
                            {batchPdfLoading ? "Generating PDF..." : "Download PDF (1 per page)"}
                          </button>
                          <button
                            onClick={() => handleBatchPdfDownload(2)}
                            disabled={batchPdfLoading}
                            className="w-full py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
                          >
                            {batchPdfLoading ? "Generating PDF..." : "Download PDF (2 per page)"}
                          </button>
                          <button
                            onClick={() => handleBatchPdfDownload(4)}
                            disabled={batchPdfLoading}
                            className="w-full py-2.5 bg-red-400 text-white rounded-lg text-sm font-semibold hover:bg-red-500 transition disabled:opacity-50"
                          >
                            {batchPdfLoading ? "Generating PDF..." : "Download PDF (4 per page)"}
                          </button>
                          <button
                            onClick={() => handleBatchPdfDownload(1, true)}
                            disabled={batchPdfLoading}
                            className="w-full py-2 bg-slate-600 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-50"
                          >
                            {batchPdfLoading ? "Generating..." : "Download Grayscale PDF"}
                          </button>
                        </div>
                        <button
                          onClick={() => router.push("/dashboard/cards")}
                          className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          View all cards in dashboard
                        </button>
                      </div>
                    )}

                    {!batchResult && (
                      <button
                        onClick={handleBatchGenerate}
                        disabled={batchLoading || showPreview}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 font-bold text-sm"
                      >
                        {batchLoading
                          ? `Generating ${batchCount} cards...`
                          : `Generate ${batchCount} Unique Cards`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Bingo Grid */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900">
                    {showPreview ? "Card Preview" : "Edit Content"}
                  </h2>
                  {!showPreview && (
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
                      {size}×{size} grid • {size * size} cells
                    </span>
                  )}
                </div>

                {/* Bingo Grid */}
                <div className="flex-grow flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100 p-3 md:p-6 mb-8">
                   <div className="w-full">
                      {/* Grid Header - matches grid columns */}
                      <div
                        className="grid mb-1.5 md:mb-2 text-center font-black tracking-widest text-slate-900 opacity-90"
                        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gap: size === 5 ? "4px" : "8px" }}
                      >
                         {['B','I','N','G','O'].slice(0, size).map((char, i) => (
                           <div key={i} className={`${size === 5 ? "py-1 text-lg md:text-2xl" : size === 4 ? "py-1.5 text-xl md:text-3xl" : "py-2 text-2xl md:text-4xl"} text-transparent bg-clip-text bg-gradient-to-br from-violet-600 to-indigo-600`}>
                             {char}
                           </div>
                         ))}
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
                          const cellHeight = size === 5 ? "h-16 md:h-20" : size === 4 ? "h-20 md:h-24" : "h-24 md:h-28";

                          return (
                            <div
                              key={index}
                              className={`${cellHeight} relative group transition-all duration-200 ${
                                showPreview ? "shadow-sm" : "focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-1"
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
                                    color: style.textColor,
                                    fontSize: style.fontSize,
                                    fontFamily: style.fontFamily,
                                    borderColor: style.borderColor,
                                    background: `linear-gradient(135deg, ${style.backgroundColor}, ${style.backgroundColor}ee)`
                                  }}
                                >
                                  FREE
                                </div>
                              ) : showPreview ? (
                                <div
                                  className="w-full h-full flex items-center justify-center border border-opacity-50 rounded-lg md:rounded-xl p-1.5 text-center break-words overflow-hidden shadow-sm"
                                  style={{
                                    color: style.textColor,
                                    fontSize: size === 5 ? "12px" : style.fontSize,
                                    fontFamily: style.fontFamily,
                                    borderColor: style.borderColor,
                                    backgroundColor: style.backgroundColor,
                                  }}
                                >
                                  {cell || <span className="text-slate-300 italic text-xs">Empty</span>}
                                </div>
                              ) : (
                                <textarea
                                  value={cell}
                                  onChange={(e) => handleCellChange(index, e.target.value)}
                                  placeholder={`${index + 1}`}
                                  className={`w-full h-full p-1.5 border rounded-lg md:rounded-xl resize-none focus:outline-none text-center bg-transparent transition-colors hover:bg-slate-50/50 focus:bg-white placeholder:text-slate-300 ${size === 5 ? "text-xs md:text-sm" : "text-sm"}`}
                                  style={{
                                    color: style.textColor,
                                    fontFamily: style.fontFamily,
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                   </div>
                </div>

                {/* Action Buttons - Hidden on mobile (replaced by sticky bar) */}
                <div className="hidden md:flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
                  <Link
                    href="/templates"
                    className="px-6 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Browse Templates
                  </Link>

                  {permissionStatus && !permissionStatus.allowed ? (
                    <Link
                      href="/pricing"
                      className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white px-6 py-3.5 rounded-xl hover:shadow-lg hover:shadow-orange-500/20 hover:-translate-y-0.5 transition-all font-bold text-lg shadow-md shadow-orange-200 text-center"
                    >
                      Limit Reached — Upgrade Plan
                    </Link>
                  ) : (
                  <button
                    onClick={handleSave}
                    disabled={
                      loading ||
                      showPreview
                    }
                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3.5 rounded-xl hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none font-bold text-lg shadow-md shadow-indigo-200"
                  >
                    {loading ? "Creating Card..." : "Create Bingo Card"}
                  </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky bottom action bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex gap-2">
              <Link
                href="/templates"
                className="px-4 py-3 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-semibold text-sm flex items-center justify-center"
              >
                📋 Templates
              </Link>
              {permissionStatus && !permissionStatus.allowed ? (
                <Link
                  href="/pricing"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white px-4 py-3 rounded-lg font-bold text-sm shadow-md text-center"
                >
                  Upgrade to Create
                </Link>
              ) : (
              <button
                onClick={handleSave}
                disabled={loading || showPreview}
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed font-bold text-sm shadow-md"
              >
                {loading ? "Creating..." : "Create Card"}
              </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CreateCardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-indigo-600">Loading editor...</div>}>
      <CreateCardContent />
    </Suspense>
  );
}