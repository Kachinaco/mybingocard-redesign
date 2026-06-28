"use client";

import { trackPremiumPurchase } from "@/lib/analytics";
import { trackClientActivity } from "@/lib/activity-client";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PurchaseType = "monthly" | "lifetime";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to start checkout";
}

export function PricingPageTracker() {
  const sessionData = useSession();
  const status = sessionData?.status || "loading";
  const searchParams = useSearchParams();
  const hasTrackedView = useRef(false);
  const hasTrackedCancel = useRef(false);

  useEffect(() => {
    if (hasTrackedView.current || status === "loading") return;
    hasTrackedView.current = true;

    const source =
      typeof document !== "undefined" && document.referrer
        ? new URL(document.referrer).pathname
        : "direct";

    trackClientActivity("pricing_page_viewed", {
      source,
      has_account: status === "authenticated",
    });
  }, [status]);

  useEffect(() => {
    if (!searchParams.get("canceled") || hasTrackedCancel.current) return;
    hasTrackedCancel.current = true;

    trackClientActivity("checkout_cancel_clicked", {
      plan: "PREMIUM",
      session_id: searchParams.get("session_id") || null,
      source: "stripe_redirect",
    });
  }, [searchParams]);

  return null;
}

export function CheckoutReturnBanner() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  if (!success && !canceled) return null;

  if (success) {
    return (
      <div className="max-w-4xl mx-auto mb-8 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-emerald-900">Access active</h3>
            <p className="text-emerald-700 text-sm">Premium features are available for this account.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mb-8 bg-amber-50 border border-amber-100 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-amber-900">Checkout disabled</h3>
          <p className="text-amber-700 text-sm">Checkout is paused, so included tools open during this period.</p>
        </div>
      </div>
    </div>
  );
}

export function PricingCheckoutButton({
  purchaseType,
  children,
  className,
}: {
  purchaseType: PurchaseType;
  children: React.ReactNode;
  className: string;
}) {
  const sessionData = useSession();
  const status = sessionData?.status || "loading";
  const session = sessionData?.data;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("FREE");

  useEffect(() => {
    if (!session?.user?.email) return;

    fetch("/api/user/plan")
      .then((response) => response.json())
      .then((data) => {
        if (data.planType) setCurrentPlan(data.planType);
      })
      .catch((error) => {
        console.error("Failed to fetch current plan:", error);
      });
  }, [session?.user?.email]);

  const isPremium = currentPlan === "PREMIUM" || currentPlan === "PRO" || currentPlan === "BUSINESS";

  const handleCheckout = async () => {
    if (status !== "authenticated") {
      router.push("/login?callbackUrl=/pricing");
      return;
    }

    setLoading(true);

    try {
      const price = 0;
      const plan = purchaseType === "monthly" ? "premium" : "lifetime";

      if (purchaseType === "monthly") {
        trackPremiumPurchase("premium_monthly");
      }

      trackClientActivity("plan_selected", {
        plan,
        price,
        source: "pricing_page",
      });

      router.push("/create?free=1");
    } catch (error) {
      console.error("Upgrade error:", error);
      alert(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (isPremium) {
    return (
      <button disabled className="w-full py-4 px-6 bg-slate-100 text-slate-500 rounded-xl font-bold cursor-not-allowed border border-slate-200">
        Current Plan
      </button>
    );
  }

  return (
    <button onClick={handleCheckout} disabled={loading} className={`${className} ${loading ? "opacity-70 cursor-wait" : ""}`}>
      {loading ? "Opening..." : children}
    </button>
  );
}
