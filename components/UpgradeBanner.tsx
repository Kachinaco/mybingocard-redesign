"use client";
import { redirectToCheckout } from "@/lib/upgrade";
import { trackClientActivity } from "@/lib/activity-client";

export default function UpgradeBanner() {
  const handleClick = () => {
    trackClientActivity("banner_upgrade_clicked", { source: "banner" });
    trackClientActivity("plan_selected", {
      plan: "premium",
      price: 7.99,
      source: "banner",
    });
    redirectToCheckout();
  };

  return (
    <div className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Upgrade for paid sharing and live hosting</p>
          <p className="text-sm text-slate-500">Creator tools are free. Premium adds direct player links, email sharing, and hosted bingo rooms.</p>
        </div>
      </div>
      <button
        onClick={handleClick}
        className="whitespace-nowrap px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all"
      >
        Upgrade to Premium &mdash; $7.99/mo
      </button>
    </div>
  );
}
