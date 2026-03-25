"use client";
import { useState, useEffect } from "react";
import { redirectToCheckout } from "@/lib/upgrade";
import { trackClientActivity } from "@/lib/activity-client";

export default function UpgradeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      trackClientActivity("upgrade_prompt_shown", { source: "modal" });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    trackClientActivity("upgrade_prompt_clicked", { source: "modal" });
    setLoading(true);
    try {
      await redirectToCheckout();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    trackClientActivity("upgrade_dismissed", { source: "modal" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Upgrade to Premium</h2>
          <p className="text-slate-500 mt-2">You&apos;ve reached your free card limit. Unlock unlimited bingo cards and premium features.</p>
        </div>

        <ul className="space-y-3 mb-6">
          {["Unlimited bingo cards", "All grid sizes (3x3, 4x4, 5x5)", "HD PDF & PNG export", "All premium templates", "Custom colors & fonts", "Ad-free experience"].map(f => (
            <li key={f} className="flex items-center gap-3 text-sm text-slate-700">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {f}
            </li>
          ))}
        </ul>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-70"
        >
          {loading ? "Redirecting..." : "Upgrade Now \u2014 $4.99/mo"}
        </button>
        <p className="text-center text-xs text-slate-400 mt-3">Cancel anytime. No long-term commitment.</p>
      </div>
    </div>
  );
}
