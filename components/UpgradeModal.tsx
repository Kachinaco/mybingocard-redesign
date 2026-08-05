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
      title: "Paid Batches, Sharing, and Hosting",
      description: "The free plan includes one saved card and individual PDF/PNG exports. Premium is for printable batches, direct player sharing, and hosted live bingo events.",
      features: ["Printable batches up to 500 cards", "Live bingo event rooms", "Direct player links and email sharing", "Unique shuffled card per viewer"],
    },
    premium_template: {
      title: "Paid Batches, Sharing, and Hosting",
      description: "All templates are free, and the free plan includes one saved card plus individual PDF/PNG exports. Premium adds printable batches, direct player sharing, and hosted live bingo events.",
      features: ["Printable batches up to 500 cards", "Live bingo event rooms", "Direct player links and email sharing", "Unique shuffled card per viewer"],
    },
    ai_generate: {
      title: "Paid Batches, Sharing, and Hosting",
      description: "AI generation is included for signed-in users. Premium is for direct player sharing and hosted live bingo events.",
      features: ["Live bingo event rooms", "Direct player links and email sharing", "Unique shuffled card per viewer", "Cleaner shared card experience"],
    },
    batch_generate: {
      title: "Paid Batches, Sharing, and Hosting",
      description: "Printable batches use one-time batch packs, or Premium includes batches with direct player sharing and hosted live bingo events.",
      features: ["Printable batches up to 500 cards", "Live bingo event rooms", "Direct player links and email sharing", "Unique shuffled card per viewer"],
    },
    modal: {
      title: "Paid Batches, Sharing, and Hosting",
      description: "The free plan includes templates, images, AI ideas, one saved card, and individual PDF/PNG exports. Premium adds batches, direct sharing, and hosted bingo events.",
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
        <button onClick={() => dismiss("x_button")} className="absolute top-4 right-4 text-[#6b6459] hover:text-[#33312e] transition-colors z-10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {showCheckout && clientSecret && stripe ? (
          <div>
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-[#33312e]">Complete Your Upgrade</h2>
              <p className="text-[#6b6459] text-sm mt-1">{checkoutType === "lifetime" ? "Premium Lifetime for $29.99 once" : "Premium monthly, $7.99/mo"}</p>
            </div>
            <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#7c5cff]/15 to-[#7c5cff]/15 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[#7c5cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#33312e]">{reasonContent.title}</h2>
              <p className="text-[#6b6459] mt-2">{reasonContent.description}</p>
            </div>

            <ul className="space-y-2.5 mb-5">
              {reasonContent.features.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-[#33312e]">
                  <svg className="w-5 h-5 text-[#2ec4b6] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {error && (
              <p className="text-[#ff5d8f] text-sm text-center mb-3">{error}</p>
            )}

            <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-[#fff7ed] bg-white/95 px-5 pb-5 pt-4 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8 sm:pb-8">
              <div className="space-y-3">
              <button
                onClick={handleLifetime}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#7c5cff] to-[#7c5cff] text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-[#7c5cff] transition-all disabled:opacity-70"
              >
                {loading ? "Loading..." : "Get Lifetime Hosting for $29.99"}
              </button>
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-3 bg-[#fff7ed] text-[#33312e] rounded-xl font-semibold hover:bg-[#a39a88] transition-all disabled:opacity-70 border border-[#a39a88]"
              >
                {loading ? "Loading..." : "Subscribe Monthly for $7.99/mo"}
              </button>
              </div>
              <p className="text-center text-xs text-[#6b6459] mt-3">Lifetime is one payment. Monthly bills immediately at $7.99/month.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
