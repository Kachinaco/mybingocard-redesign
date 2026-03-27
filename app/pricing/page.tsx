"use client";

import { trackPremiumPurchase } from "@/lib/analytics";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const FREE_FEATURES = [
  "1 bingo card",
  "All grid sizes (3x3, 4x4, 5x5)",
  "5 starter templates",
  "Standard PDF export (with watermark)",
  "Share links (same card for all viewers)",
  "Includes ads",
];

const PREMIUM_FEATURES = [
  "Unlimited bingo cards",
  "All grid sizes (3x3, 4x4, 5x5)",
  "All premium templates",
  "HD PDF & PNG export",
  "Custom colors & fonts",
  "Up to 100 cards per batch",
  "Unique shuffled card per viewer",
  "Ad-free shared cards",
  "Priority support",
];

function PricingContent() {
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status || "loading";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>("FREE");
  

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    if (session?.user?.email) {
      fetchCurrentPlan();
    }
  }, [session]);

  const fetchCurrentPlan = async () => {
    try {
      const response = await fetch("/api/user/plan");
      const data = await response.json();
      if (data.planType) {
        setCurrentPlan(data.planType);
      }

    } catch (error) {
      console.error("Failed to fetch current plan:", error);
    }
  };

  const handleUpgrade = async () => {
    if (status !== "authenticated") {
      router.push("/login?callbackUrl=/pricing");
      return;
    }

    setLoading(true);

    try {
      trackPremiumPurchase("premium_monthly");
      const { redirectToCheckout } = await import("@/lib/upgrade");
      await redirectToCheckout();
    } catch (error: any) {
      console.error("Upgrade error:", error);
      alert(error.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  const isPremium = currentPlan === "PREMIUM" || currentPlan === "PRO" || currentPlan === "BUSINESS";

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              MyBingoCard
            </span>
          </Link>

          <div className="flex gap-4 items-center">
            {session ? (
              <>
                <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                  Dashboard
                </Link>
                <Link href="/create" className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all duration-200 shadow-lg shadow-slate-900/20">
                  Create Card
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                  Sign In
                </Link>
                <Link href="/login" className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all duration-200 shadow-lg shadow-slate-900/20">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-32 pb-24 px-4">
        {success && (
          <div className="max-w-4xl mx-auto mb-8 bg-emerald-50 border border-emerald-100 rounded-xl p-4 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-emerald-900">Payment Successful!</h3>
                <p className="text-emerald-700 text-sm">Your premium features are now active. Enjoy your ad-free experience!</p>
              </div>
            </div>
          </div>
        )}

        {canceled && (
          <div className="max-w-4xl mx-auto mb-8 bg-amber-50 border border-amber-100 rounded-xl p-4 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-amber-900">Checkout Canceled</h3>
                <p className="text-amber-700 text-sm">No worries! You can upgrade anytime when you're ready.</p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wide mb-6">
            Simple, Transparent Pricing
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
            Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">Premium</span> for $4.99/month.
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Pay securely in Stripe to unlock Premium instantly. You’ll be billed $4.99/month and can cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 px-4">
          {/* Free Plan */}
          <div className="relative bg-white rounded-3xl border border-slate-200 shadow-xl hover:shadow-2xl hover:border-indigo-200 transition-all duration-300 flex flex-col">
            <div className="p-8 md:p-10 flex-grow">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-black text-slate-900 tracking-tight">$0</span>
                <span className="text-slate-500 font-medium">build free</span>
              </div>
              <ul className="space-y-4 mb-8">
                {FREE_FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-slate-600 font-medium leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 md:p-10 pt-0 mt-auto">
              {isPremium ? (
                <button disabled className="w-full py-4 px-6 bg-slate-100 text-slate-500 rounded-xl font-bold cursor-not-allowed border border-slate-200">
                  Your Previous Plan
                </button>
              ) : (
                <Link href="/signup" className="block w-full py-4 px-6 bg-slate-100 text-slate-700 rounded-xl font-bold text-center hover:bg-slate-200 transition-colors border border-slate-200">
                  Create Account
                </Link>
              )}
            </div>
          </div>

          {/* Premium Plan */}
          <div className="relative bg-white rounded-3xl ring-2 ring-indigo-600 shadow-2xl shadow-indigo-500/20 transition-all duration-300 flex flex-col">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
              Best Value
            </div>

            <div className="p-8 md:p-10 flex-grow">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Premium</h3>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-black text-slate-900 tracking-tight">
                  $4.99
                </span>
                <span className="text-slate-500 font-medium">
                  /month
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-8">
                Clean, watermark-free bingo cards for any event. Unlimited cards, HD exports, all templates, and custom styling. Cancel anytime.
              </p>

              <ul className="space-y-4 mb-8">
                {PREMIUM_FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5 text-indigo-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-slate-600 font-medium leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 md:p-10 pt-0 mt-auto">
              {isPremium ? (
                <button disabled className="w-full py-4 px-6 bg-slate-100 text-slate-500 rounded-xl font-bold cursor-not-allowed border border-slate-200">
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className={`w-full py-4 px-6 rounded-xl font-bold transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/30 ${
                    loading ? "opacity-70 cursor-wait" : ""
                  }`}
                >
                  {loading ? "Processing..." : "Upgrade to Premium"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Compare Plans</h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Feature</th>
                  <th className="text-center p-4 text-sm font-semibold text-slate-700">Free</th>
                  <th className="text-center p-4 text-sm font-semibold text-indigo-600">Premium</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ["Bingo cards", "1 card", "Unlimited"],
                  ["Grid sizes", "3x3, 4x4, 5x5", "3x3, 4x4, 5x5"],
                  ["Templates", "5 starter", "All 30+ templates"],
                  ["PDF export", "With watermark", "HD, no watermark"],
                  ["PNG export", "-", "Yes"],
                  ["Custom colors & fonts", "-", "Yes"],
                  ["Batch generation", "-", "Up to 100"],
                  ["Ads", "Yes", "Ad-free"],
                  ["Support", "Community", "Priority"],
                ].map(([feature, free, premium], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-slate-50/50" : ""}>
                    <td className="p-4 text-slate-700 font-medium">{feature}</td>
                    <td className="p-4 text-center text-slate-500">{free}</td>
                    <td className="p-4 text-center text-indigo-600 font-semibold">{premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="grid gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-bold text-lg text-slate-900 mb-3">
                Why choose monthly premium?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Monthly premium gives you unlimited bingo cards, all premium templates, HD exports, custom styles, and an ad-free experience for one flat monthly price.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-bold text-lg text-slate-900 mb-3">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Absolutely. Monthly subscriptions can be canceled anytime from your settings, and you'll keep premium access until the end of your current billing period.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-bold text-lg text-slate-900 mb-3">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                We accept all major credit cards including Visa, Mastercard, and American Express through Stripe, our secure payment processor.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-bold text-lg text-slate-900 mb-3">
                What can I do on the free plan?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                The free plan lets you create 1 bingo card with 5 starter templates. Free exports include a small watermark. Upgrade to Premium for unlimited cards, all templates, HD exports, and watermark-free downloads.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-5xl mx-auto mt-24">
          <div className="bg-slate-900 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-600/30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Make your next event unforgettable.
              </h2>
              <p className="text-indigo-200 text-lg mb-8 max-w-2xl mx-auto">
                Wedding guests, baby shower attendees, and students all love bingo. Create beautiful, watermark-free cards in minutes.
              </p>
              <Link href="/create" className="inline-block px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-colors shadow-lg shadow-white/10">
                Create Your First Card
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900">MyBingoCard</span>
            </div>
            <div className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} MyBingoCard. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm font-medium text-slate-500">
              <Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-indigo-600">Loading...</div>}>
      <PricingContent />
    </Suspense>
  );
}
