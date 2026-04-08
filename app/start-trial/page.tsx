"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCheckout } from "@/components/CheckoutModal";
import { trackClientActivity } from "@/lib/activity-client";

export default function StartTrialPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { openCheckout } = useCheckout();
  const hasOpened = useRef(false);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.replace("/signup");
      return;
    }

    if (hasOpened.current) return;
    hasOpened.current = true;

    trackClientActivity("trial_page_viewed", {});

    openCheckout({
      purchaseType: "trial",
      label: "7-day free trial — then $4.99/mo. Cancel anytime.",
      returnPath: "/create?trial=started",
    });
  }, [session, status, router, openCheckout]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-3">Start Your Free Trial</h1>
        <p className="text-slate-600 mb-2">
          Get full Premium access for 7 days. Unlimited cards, AI generation, HD exports, and more.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Add your card to start. You won't be charged until day 8 — and you can cancel anytime.
        </p>

        <div className="space-y-3 text-left bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
          {["Unlimited bingo cards", "AI-powered card generation", "HD PDF & PNG export", "Custom colors & fonts", "Live multiplayer games"].map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-slate-700">{f}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            hasOpened.current = false;
            openCheckout({
              purchaseType: "trial",
              label: "7-day free trial — then $4.99/mo. Cancel anytime.",
              returnPath: "/create?trial=started",
            });
          }}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 mb-4"
        >
          Start Free Trial
        </button>

        <Link
          href="/create"
          onClick={() => {
            setSkipping(true);
            trackClientActivity("trial_skipped", {});
          }}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          {skipping ? "Redirecting..." : "Skip for now — use the free plan"}
        </Link>
      </div>
    </div>
  );
}
