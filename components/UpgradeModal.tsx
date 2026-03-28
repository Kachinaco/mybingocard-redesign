"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { trackClientActivity } from "@/lib/activity-client";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

const DISMISS_COUNT_KEY = "upgrade_dismiss_count";
const HAS_DISMISSED_KEY = "upgrade_has_dismissed";

function getSessionDismissCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(sessionStorage.getItem(DISMISS_COUNT_KEY) || "0", 10);
}

function incrementSessionDismissCount(): number {
  const count = getSessionDismissCount() + 1;
  sessionStorage.setItem(DISMISS_COUNT_KEY, String(count));
  return count;
}

function markSessionDismissed(): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(HAS_DISMISSED_KEY, "1");
  }
}

function hasSessionDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(HAS_DISMISSED_KEY) === "1";
}

export type UpgradeReason = "card_limit" | "premium_template" | "image_picker" | "modal";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: UpgradeReason;
  triggerContext?: Record<string, unknown>;
}

export default function UpgradeModal({ isOpen, onClose, reason = "modal", triggerContext }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState("");
  const openedAt = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      openedAt.current = Date.now();
      trackClientActivity("upgrade_prompt_shown", { source: reason, ...triggerContext });
    } else {
      openedAt.current = null;
      // Reset checkout state when modal closes
      setShowCheckout(false);
      setClientSecret(null);
      setError("");
      setLoading(false);
    }
  }, [isOpen, reason]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showCheckout) {
        dismiss("escape");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, reason, showCheckout]);

  const dismiss = useCallback((method: "x_button" | "backdrop" | "escape") => {
    if (showCheckout) {
      // If checkout is showing, go back to info view
      setShowCheckout(false);
      setClientSecret(null);
      return;
    }
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
  }, [reason, onClose, showCheckout]);

  if (!isOpen) return null;

  const reasonContent = {
    card_limit: {
      title: "Upgrade to Premium",
      description: "You\u2019ve reached your free card limit. Unlock unlimited bingo cards and premium features.",
      features: ["Unlimited bingo cards", "All grid sizes (3x3, 4x4, 5x5)", "HD PDF & PNG export", "All premium templates", "Custom colors & fonts", "Ad-free experience"],
    },
    image_picker: {
      title: "Add Images to Your Cards",
      description: "Picture bingo cards are a Premium feature. Add photos, icons, and custom images to any cell.",
      features: ["Upload your own images to cells", "Create picture bingo (like Loter\u00EDa)", "Unlimited bingo cards", "HD PDF & PNG export", "All premium templates", "Ad-free experience"],
    },
    premium_template: {
      title: "Unlock This Template",
      description: "This template is part of our Premium collection. Get instant access to all templates and more.",
      features: ["All premium templates included", "Unlimited bingo cards", "All grid sizes (3x3, 4x4, 5x5)", "HD PDF & PNG export", "Custom colors & fonts", "Ad-free experience"],
    },
    modal: {
      title: "Upgrade to Premium",
      description: "Get the most out of MyBingoCard with unlimited cards, templates, and export options.",
      features: ["Unlimited bingo cards", "All grid sizes (3x3, 4x4, 5x5)", "HD PDF & PNG export", "All premium templates", "Custom colors & fonts", "Ad-free experience"],
    },
  }[reason];

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
      price: 4.99,
      source: "upgrade_modal",
    });

    setLoading(true);
    setError("");

    try {
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID;
      if (!priceId) {
        setError("Checkout is temporarily unavailable.");
        return;
      }

      const res = await fetch("/api/stripe/embedded-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (res.status === 409) {
        window.location.href = "/dashboard?success=true";
        return;
      }

      const data = await res.json();

      if (!res.ok || !data.clientSecret) {
        setError(data.error || "Failed to start checkout.");
        return;
      }

      setClientSecret(data.clientSecret);
      setShowCheckout(true);

      trackClientActivity("checkout_loaded", {
        plan: "premium",
        price: 4.99,
        session_id: data.sessionId || "",
      });
    } catch {
      setError("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !showCheckout && dismiss("backdrop")}>
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full relative animate-fade-in-up ${showCheckout ? "max-w-lg max-h-[90vh] overflow-y-auto" : "max-w-md"} p-8`}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={() => dismiss("x_button")} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {showCheckout && clientSecret ? (
          <div>
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Complete Your Upgrade</h2>
              <p className="text-slate-500 text-sm mt-1">Premium — $4.99/mo · Cancel anytime</p>
            </div>
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{reasonContent.title}</h2>
              <p className="text-slate-500 mt-2">{reasonContent.description}</p>
            </div>

            <ul className="space-y-3 mb-6">
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

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-70"
            >
              {loading ? "Loading..." : "Upgrade Now \u2014 $4.99/mo"}
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">Cancel anytime. No long-term commitment.</p>
          </>
        )}
      </div>
    </div>
  );
}
