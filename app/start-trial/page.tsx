"use client";

import { redirectToCheckout } from "@/lib/upgrade";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

function normalizeReturnTo(value: string | null): string {
  if (!value) return "/dashboard";
  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith("/") ? decoded : "/dashboard";
  } catch {
    return value.startsWith("/") ? value : "/dashboard";
  }
}

function buildTrialPath(state: "success" | "canceled", returnTo: string): string {
  const params = new URLSearchParams({ checkout: state, returnTo });
  return `/start-trial?${params.toString()}`;
}

function StartTrialContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [message, setMessage] = useState("Redirecting to secure checkout...");
  const [checkoutCanceled, setCheckoutCanceled] = useState(false);
  const hasStarted = useRef(false);
  const returnTo = useMemo(
    () => normalizeReturnTo(searchParams.get("returnTo") || searchParams.get("callbackUrl")),
    [searchParams]
  );
  const checkoutState = searchParams.get("checkout");

  const launchCheckout = async () => {
    setCheckoutCanceled(false);
    setMessage("Redirecting to secure checkout...");
    await redirectToCheckout({
      successPath: buildTrialPath("success", returnTo),
      cancelPath: buildTrialPath("canceled", returnTo),
    });
  };

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/start-trial?returnTo=${encodeURIComponent(returnTo)}`)}`);
      return;
    }

    if (checkoutState === "success") {
      router.replace(returnTo);
      return;
    }

    if (checkoutState === "canceled") {
      setCheckoutCanceled(true);
      setMessage("Checkout was canceled. Add your payment method in Stripe to continue.");
      return;
    }

    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;
    fetch("/api/user/plan")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load plan");
        }
        if (!data.trialEligible) {
          router.replace(returnTo);
          return;
        }
        await launchCheckout();
      })
      .catch(() => {
        hasStarted.current = false;
        setMessage("We couldn't start Stripe Checkout. Please try again.");
      });
  }, [checkoutState, returnTo, router, status]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 shadow-xl rounded-3xl p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4m8-4c0-2.21-1.79-4-4-4m0 0c2.21 0 4 1.79 4 4m-4-4v16" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Start your 7-day free trial</h1>
        <p className="text-slate-600 leading-relaxed mb-8">
          Add your payment method in Stripe to unlock Premium now. You won&apos;t be charged for 7 days.
        </p>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-5 mb-6">
          <p className="text-sm font-medium text-slate-700">{message}</p>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              hasStarted.current = true;
              launchCheckout().catch(() => {
                hasStarted.current = false;
                setMessage("We couldn't start Stripe Checkout. Please try again.");
              });
            }}
            className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all"
          >
            {checkoutCanceled ? "Retry Stripe Checkout" : "Enter Card and Start Trial"}
          </button>
          {checkoutCanceled ? (
            <p className="text-xs text-slate-500">Your account stays locked until Stripe Checkout is completed.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function StartTrialPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <StartTrialContent />
    </Suspense>
  );
}
