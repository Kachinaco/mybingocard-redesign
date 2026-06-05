"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { trackClientActivity } from "@/lib/activity-client";
import { getBrowserStorageItem, setBrowserStorageItem } from "@/lib/browser-storage";
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

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
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutType, setCheckoutType] = useState<"subscription" | "lifetime">("subscription");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [error, setError] = useState("");
  const openedAt = useRef<number | null>(null);
  const stripePromiseRef = useRef<Promise<Stripe | null> | null>(null);

  const getStripe = useCallback(async () => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
    if (!publishableKey) {
      throw new Error("Stripe publishable key is not configured.");
    }

    if (!stripePromiseRef.current) {
      stripePromiseRef.current = loadStripe(publishableKey);
    }

    const stripe = await stripePromiseRef.current;
    if (!stripe) {
      throw new Error("Stripe could not load.");
    }

    return stripe;
  }, []);

  useEffect(() => {
    if (isOpen) {
      openedAt.current = Date.now();
      trackClientActivity("upgrade_prompt_shown", { source: reason, ...triggerContext });
    } else {
      openedAt.current = null;
      // Reset checkout state when modal closes
      setShowCheckout(false);
      setClientSecret(null);
      setStripe(null);
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
      setStripe(null);
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
      description: "Premium unlocks unlimited saves, sharing, exports, unlimited AI generation, premium templates, and the rest of the advanced bingo tools.",
      features: ["Unlimited AI-powered card generation", "All premium templates", "PDF and PNG export after checkout", "Custom colors & fonts", "Up to 500 cards per batch", "Cleaner saved and shared cards"],
    },
    premium_template: {
      title: "Unlock This Template",
      description: "This template is part of our Premium collection. Get access to all templates and more after checkout.",
      features: ["All premium templates included", "PDF and PNG export after checkout", "Custom colors & fonts", "Unlimited AI-powered generation", "Up to 500 cards per batch", "Cleaner saved and shared cards"],
    },
    ai_generate: {
      title: "Remove AI Limits",
      description: "Let AI create your bingo card cells without the daily free limit. Describe your theme and get a polished draft in seconds.",
      features: ["Unlimited AI-powered cell generation", "Describe any theme or topic", "PDF and PNG export after checkout", "All premium templates", "Custom colors & fonts", "Cleaner saved and shared cards"],
    },
    batch_generate: {
      title: "Generate Cards in Bulk",
      description: "Create up to 500 unique shuffled cards at once. Perfect for classrooms, events, and parties.",
      features: ["Up to 500 unique cards per batch", "PDF export after checkout", "Every card uniquely shuffled", "Unlimited AI-powered generation", "Premium templates", "Cleaner saved and shared cards"],
    },
    modal: {
      title: "Upgrade to Premium",
      description: "Get the most out of MyBingoCard with unlimited saves, sharing, unlimited AI generation, premium templates, larger batches, and cleaner exports.",
      features: ["Unlimited AI-powered card generation", "PDF and PNG export after checkout", "All premium templates", "Custom colors & fonts", "Up to 500 cards per batch", "Cleaner saved and shared cards"],
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
      price: 29.99,
      source: "upgrade_modal",
    });

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stripe/embedded-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseType: "lifetime" }),
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

      const stripe = await getStripe();
      setClientSecret(data.clientSecret);
      setStripe(stripe);
      setCheckoutType("lifetime");
      setShowCheckout(true);

      trackClientActivity("checkout_loaded", {
        plan: "lifetime",
        price: 29.99,
        session_id: data.sessionId || "",
      });
    } catch {
      setError("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
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
      price: 7.99,
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

      const stripe = await getStripe();
      setClientSecret(data.clientSecret);
      setStripe(stripe);
      setShowCheckout(true);

      trackClientActivity("checkout_loaded", {
        plan: "premium",
        price: 7.99,
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
        className={`bg-white rounded-2xl shadow-2xl w-full relative animate-fade-in-up ${showCheckout ? "max-w-lg" : "max-w-md"} max-h-[90dvh] overflow-y-auto p-5 sm:p-8`}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={() => dismiss("x_button")} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {showCheckout && clientSecret && stripe ? (
          <div>
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Complete Your Upgrade</h2>
              <p className="text-slate-500 text-sm mt-1">{checkoutType === "lifetime" ? "Premium Lifetime for $29.99 once" : "Premium trial, then $7.99/mo"}</p>
            </div>
            <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : (
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
                {loading ? "Loading..." : reason === "ai_generate" ? "Upgrade for AI for $29.99 lifetime" : "Get Lifetime Access for $29.99"}
              </button>
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all disabled:opacity-70 border border-slate-200"
              >
                {loading ? "Loading..." : "Start 3-Day Trial for $7.99/mo"}
              </button>
              </div>
              <p className="text-center text-xs text-slate-400 mt-3">Lifetime is one payment. Monthly starts with a 3-day trial.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
