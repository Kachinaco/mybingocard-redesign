"use client";
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { registerCheckoutOpener } from "@/lib/upgrade";
import { trackClientActivity } from "@/lib/activity-client";
import { getBatchPack } from "@/lib/batchPacks";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

interface CheckoutState {
  isOpen: boolean;
  clientSecret: string | null;
  loading: boolean;
  error: string;
  label: string;
}

interface CheckoutContextType {
  openCheckout: (options?: { priceId?: string; purchaseType?: string; batchCount?: number; label?: string; returnPath?: string }) => Promise<void>;
}

const CheckoutContext = createContext<CheckoutContextType>({
  openCheckout: async () => {},
});

export function useCheckout() {
  return useContext(CheckoutContext);
}

export function CheckoutModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CheckoutState>({
    isOpen: false,
    clientSecret: null,
    loading: false,
    error: "",
    label: "Premium — $4.99/mo",
  });

  // Refs for tracking checkout timing and context
  const checkoutOpenedAtRef = useRef<number | null>(null);
  const checkoutPlanRef = useRef<string>("premium");
  const checkoutSessionIdRef = useRef<string>("");

  const close = useCallback(() => {
    // Track time spent and cancel when the user closes the embedded checkout modal
    const openedAt = checkoutOpenedAtRef.current;
    if (openedAt) {
      const durationSeconds = Math.round((Date.now() - openedAt) / 1000);
      const plan = checkoutPlanRef.current;
      const sessionId = checkoutSessionIdRef.current;

      trackClientActivity("checkout_time_spent", {
        duration_seconds: durationSeconds,
        completed: false,
        plan,
      }, { keepalive: true });

      trackClientActivity("checkout_cancel_clicked", {
        plan,
        time_on_checkout_seconds: durationSeconds,
        session_id: sessionId,
        source: "embedded_modal_close",
      }, { keepalive: true });

      checkoutOpenedAtRef.current = null;
    }

    setState({ isOpen: false, clientSecret: null, loading: false, error: "", label: "" });
  }, []);

  const openCheckout = useCallback(async (options?: {
    priceId?: string;
    purchaseType?: string;
    batchCount?: number;
    label?: string;
    returnPath?: string;
  }) => {
    const purchaseType = options?.purchaseType || "subscription";
    const priceId = options?.priceId || (purchaseType === "lifetime"
      ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_ONETIME_PRICE_ID
      : process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID);
    const label = options?.label || (purchaseType === "lifetime"
      ? "Premium Lifetime — $14.99 one-time"
      : purchaseType === "trial"
        ? "7-day free trial — then $4.99/mo. Cancel anytime."
        : "Premium — $4.99/mo · Cancel anytime");

    if (!priceId && purchaseType === "subscription") {
      setState(s => ({ ...s, isOpen: true, error: "Checkout is temporarily unavailable." }));
      return;
    }

    setState({ isOpen: true, clientSecret: null, loading: true, error: "", label });

    try {
      let body: Record<string, unknown>;
      if (purchaseType === "batch_pack") {
        body = { purchaseType: "batch_pack", batchCount: options?.batchCount, returnPath: options?.returnPath };
      } else if (purchaseType === "lifetime") {
        body = { purchaseType: "lifetime", returnPath: options?.returnPath };
      } else if (purchaseType === "trial") {
        body = { purchaseType: "trial", returnPath: options?.returnPath };
      } else {
        body = { priceId, returnPath: options?.returnPath };
      }

      const res = await fetch("/api/stripe/embedded-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        close();
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (res.status === 409) {
        close();
        window.location.href = "/dashboard?success=true";
        return;
      }

      const data = await res.json();

      if (!res.ok || !data.clientSecret) {
        // Fallback: if embedded checkout not supported (e.g. batch free tier)
        if (data.free && data.redirectUrl) {
          close();
          window.location.href = data.redirectUrl;
          return;
        }
        setState(s => ({ ...s, loading: false, error: data.error || "Failed to start checkout." }));
        return;
      }

      setState(s => ({ ...s, loading: false, clientSecret: data.clientSecret }));

      const checkoutPlan = purchaseType === "batch_pack"
        ? "batch_pack"
        : purchaseType === "trial"
          ? "trial"
          : "premium";
      const batchPack = purchaseType === "batch_pack" ? getBatchPack(options?.batchCount) : null;
      const checkoutPrice = batchPack
        ? batchPack.amount / 100
        : purchaseType === "trial"
          ? 0
          : 4.99;

      // Store context for close/cancel tracking
      checkoutOpenedAtRef.current = Date.now();
      checkoutPlanRef.current = checkoutPlan;
      checkoutSessionIdRef.current = data.sessionId || "";

      trackClientActivity("checkout_loaded", {
        plan: checkoutPlan,
        price: checkoutPrice,
        session_id: data.sessionId || "",
      });
    } catch {
      setState(s => ({ ...s, loading: false, error: "Failed to start checkout. Please try again." }));
    }
  }, [close]);

  // Register global checkout opener so redirectToCheckout() uses the modal
  useEffect(() => {
    registerCheckoutOpener(openCheckout);
    return () => registerCheckoutOpener(null);
  }, [openCheckout]);

  return (
    <CheckoutContext.Provider value={{ openCheckout }}>
      {children}
      {state.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative animate-fade-in-up"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={close} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Complete Your Purchase</h2>
              <p className="text-slate-500 text-sm mt-1">{state.label}</p>
            </div>

            {state.error && (
              <div className="text-center mb-4">
                <p className="text-red-500 text-sm">{state.error}</p>
                <button onClick={close} className="mt-3 text-sm text-indigo-600 hover:underline font-medium">Close</button>
              </div>
            )}

            {state.loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            )}

            {state.clientSecret && !state.loading && (
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret: state.clientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            )}
          </div>
        </div>
      )}
    </CheckoutContext.Provider>
  );
}
