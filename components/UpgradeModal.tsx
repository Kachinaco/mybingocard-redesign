"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { trackClientActivity } from "@/lib/activity-client";
import { getBrowserStorageItem, setBrowserStorageItem } from "@/lib/browser-storage";

const DISMISS_COUNT_KEY = "upgrade_dismiss_count";
const HAS_DISMISSED_KEY = "upgrade_has_dismissed";

function getSessionDismissCount(): number {
  return parseInt(getBrowserStorageItem("sessionStorage", DISMISS_COUNT_KEY) || "0", 10);
}

function incrementSessionDismissCount(): number {
  const count = getSessionDismissCount() + 1;
  setBrowserStorageItem("sessionStorage", DISMISS_COUNT_KEY, String(count));
  return count;
}

function markSessionDismissed(): void {
  setBrowserStorageItem("sessionStorage", HAS_DISMISSED_KEY, "1");
}

function hasSessionDismissed(): boolean {
  return getBrowserStorageItem("sessionStorage", HAS_DISMISSED_KEY) === "1";
}

export type UpgradeReason = "card_limit" | "premium_template" | "ai_generate" | "batch_generate" | "modal";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: UpgradeReason;
  triggerContext?: Record<string, unknown>;
}

export default function UpgradeModal({ isOpen, onClose, reason = "modal", triggerContext }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const openedAt = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      openedAt.current = Date.now();
      trackClientActivity("upgrade_prompt_shown", { source: reason, ...triggerContext });
    } else {
      openedAt.current = null;
      setError("");
      setLoading(false);
    }
  }, [isOpen, reason]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss("escape");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, reason]);

  const dismiss = useCallback((method: "x_button" | "backdrop" | "escape") => {
    const durationMs = openedAt.current ? Date.now() - openedAt.current : 0;
    const durationSeconds = Math.round(durationMs / 1000);
    const dismissCount = incrementSessionDismissCount();
    markSessionDismissed();

    trackClientActivity("upgrade_dismissed", {
      source: reason,
      dismiss_method: method,
      duration_seconds: durationSeconds,
      session_dismiss_count: dismissCount,
      ...triggerContext,
    });
    onClose();
  }, [reason, onClose]);

  if (!isOpen) return null;

  const reasonContent = {
    card_limit: {
      title: "Activate Premium Tools",
      description: "Printable batches, direct player sharing, and hosted live bingo events unlock after account activation.",
      features: ["Printable batches up to 500 cards", "Live bingo event rooms", "Direct player links and email sharing", "Unique shuffled card per viewer"],
    },
    premium_template: {
      title: "Activate Premium Tools",
      description: "Templates, printable batches, direct player sharing, and hosted live bingo events unlock after account activation.",
      features: ["Printable batches up to 500 cards", "Live bingo event rooms", "Direct player links and email sharing", "Unique shuffled card per viewer"],
    },
    ai_generate: {
      title: "Activate Premium Tools",
      description: "AI generation, direct player sharing, and hosted live bingo events unlock after account activation.",
      features: ["Live bingo event rooms", "Direct player links and email sharing", "Unique shuffled card per viewer", "Cleaner shared card experience"],
    },
    batch_generate: {
      title: "Activate Premium Tools",
      description: "Printable batches, direct player sharing, and hosted live bingo events unlock after account activation.",
      features: ["Printable batches up to 500 cards", "Live bingo event rooms", "Direct player links and email sharing", "Unique shuffled card per viewer"],
    },
    modal: {
      title: "Activate Premium Tools",
      description: "Creation, saving, exports, templates, images, AI, batches, direct sharing, and hosted bingo events unlock after account activation.",
      features: ["Printable batches up to 500 cards", "Live bingo event rooms", "Direct player links and email sharing", "Unique shuffled card per viewer"],
    },
  }[reason];

  const handleLifetime = async () => {
    const previouslyDismissed = hasSessionDismissed();
    const durationMs = openedAt.current ? Date.now() - openedAt.current : 0;
    const durationSeconds = Math.round(durationMs / 1000);

    trackClientActivity("upgrade_prompt_clicked", {
      source: reason,
      duration_seconds: durationSeconds,
      converted_after_dismiss: previouslyDismissed,
      purchase_type: "lifetime",
      ...triggerContext,
    });

    trackClientActivity("plan_selected", {
      plan: "lifetime",
      price: 0,
      source: "upgrade_modal",
    });

    window.location.href = "/create?free=1";
  };

  const handleUpgrade = async () => {
    const previouslyDismissed = hasSessionDismissed();
    const durationMs = openedAt.current ? Date.now() - openedAt.current : 0;
    const durationSeconds = Math.round(durationMs / 1000);

    trackClientActivity("upgrade_prompt_clicked", {
      source: reason,
      duration_seconds: durationSeconds,
      converted_after_dismiss: previouslyDismissed,
      ...triggerContext,
    });

    trackClientActivity("plan_selected", {
      plan: "premium",
      price: 0,
      source: "upgrade_modal",
    });

    window.location.href = "/create?free=1";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => dismiss("backdrop")}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full relative animate-fade-in-up max-w-md max-h-[90dvh] overflow-y-auto p-5 sm:p-8"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={() => dismiss("x_button")} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <>
            <div className="text-center mb-5">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{reasonContent.title}</h2>
              <p className="text-slate-500 mt-2">{reasonContent.description}</p>
            </div>

            <ul className="space-y-2.5 mb-5">
              {reasonContent.features.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-slate-700">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {error && (
              <p className="text-red-500 text-sm text-center mb-3">{error}</p>
            )}

            <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-slate-100 bg-white/95 px-5 pb-5 pt-4 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8 sm:pb-8">
              <div className="space-y-3">
              <button
                onClick={handleLifetime}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-70"
              >
                {loading ? "Loading..." : "Start Creating"}
              </button>
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all disabled:opacity-70 border border-slate-200"
              >
                {loading ? "Loading..." : "Use Premium Tools"}
              </button>
              </div>
              <p className="text-center text-xs text-slate-400 mt-3">No trial, card, or payment is needed while checkout is disabled.</p>
            </div>
        </>
      </div>
    </div>
  );
}
