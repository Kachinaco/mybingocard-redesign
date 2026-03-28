"use client";

import { useState, useEffect, useRef } from "react";
import { trackClientActivity } from "@/lib/activity-client";

type Step = "pause" | "survey" | "offer" | "redirecting";
type Reason = "too_expensive" | "not_using" | "missing_feature" | "other";

interface CancelFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REASONS: { value: Reason; label: string }[] = [
  { value: "too_expensive", label: "It's too expensive" },
  { value: "not_using", label: "I'm not using it enough" },
  { value: "missing_feature", label: "It's missing a feature I need" },
  { value: "other", label: "Other" },
];

export default function CancelFlowModal({ isOpen, onClose }: CancelFlowModalProps) {
  const [step, setStep] = useState<Step>("pause");
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [offerApplied, setOfferApplied] = useState(false);
  const [error, setError] = useState("");
  const prevOpenRef = useRef(false);
  const initialStepTrackedRef = useRef(false);

  // Track cancel_flow_started when modal first opens
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      trackClientActivity("cancel_flow_started");
      trackClientActivity("cancel_flow_step_viewed", { step: "pause" });
      initialStepTrackedRef.current = true;
    }
    if (!isOpen) {
      initialStepTrackedRef.current = false;
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  // Track step changes (skip initial "pause" which is tracked above)
  useEffect(() => {
    if (!isOpen || step === "redirecting") return;
    if (step === "pause" && initialStepTrackedRef.current) {
      initialStepTrackedRef.current = false;
      return;
    }
    trackClientActivity("cancel_flow_step_viewed", { step });
  }, [step, isOpen]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    // If the user accepted the retention offer, this is not an abandonment
    if (!offerApplied) {
      trackClientActivity("cancel_flow_abandoned", { last_step: step });
    }
    setStep("pause");
    setReason(null);
    setDetails("");
    setLoading(false);
    setOfferApplied(false);
    setError("");
    onClose();
  };

  const submitSurvey = async () => {
    if (!reason) return;
    setLoading(true);
    setError("");
    try {
      await fetch("/api/cancel-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
    } catch {
      // Survey submission is non-blocking; proceed even if it fails
    }
    setLoading(false);
    setStep("offer");
  };

  const applyRetentionOffer = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/apply-retention-offer", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setOfferApplied(true);
      } else {
        setError(data.error || "Failed to apply discount. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const proceedToStripePortal = async () => {
    setLoading(true);
    setStep("redirecting");
    trackClientActivity("cancel_flow_completed");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to open billing portal.");
        setStep("offer");
        setLoading(false);
      }
    } catch {
      setError("Failed to open billing portal. Please try again.");
      setStep("offer");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Close button */}
        <button
          onClick={resetAndClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="p-6">
          {/* Step 1: Pause suggestion */}
          {step === "pause" && (
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Before you go...
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Did you know you can <strong>pause your subscription</strong> instead of canceling?
                Your cards and settings will be saved, and you can resume anytime.
              </p>
              <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-sm font-semibold text-indigo-900">
                  How pausing works:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-indigo-800">
                  <li>Your billing stops immediately</li>
                  <li>All your cards are preserved</li>
                  <li>Resume with one click when you are ready</li>
                </ul>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={proceedToStripePortal}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Pause my subscription
                </button>
                <button
                  onClick={() => setStep("survey")}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  I still want to cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Exit survey */}
          {step === "survey" && (
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Help us improve
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                We are sorry to see you go. Could you tell us why you are canceling?
              </p>
              <div className="mt-4 space-y-2">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      reason === r.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">{r.label}</span>
                  </label>
                ))}
              </div>
              {(reason === "missing_feature" || reason === "other") && (
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={
                    reason === "missing_feature"
                      ? "What feature would you like to see?"
                      : "Tell us more..."
                  }
                  rows={3}
                  className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={submitSurvey}
                  disabled={!reason || loading}
                  className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Submitting..." : "Continue"}
                </button>
                <button
                  onClick={() => setStep("pause")}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Go back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Retention offer */}
          {step === "offer" && (
            <div>
              {offerApplied ? (
                <>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Discount applied!
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    Your next bill will be <strong>20% off</strong>. We are glad you are staying with us!
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={resetAndClose}
                      className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                      Great, keep my subscription
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Wait — how about 20% off?
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    We would hate to lose you. Stay and get <strong>20% off your next month</strong> as
                    a thank-you for being part of MyBingoCard.
                  </p>
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-emerald-700">20% OFF</span>
                      <span className="text-sm text-emerald-600">your next billing cycle</span>
                    </div>
                    <p className="mt-1 text-xs text-emerald-600">
                      Applied automatically. No action needed after accepting.
                    </p>
                  </div>

                  {error && (
                    <p className="mt-3 text-sm text-red-600">{error}</p>
                  )}

                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      onClick={applyRetentionOffer}
                      disabled={loading}
                      className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Applying discount..." : "Apply Discount & Stay"}
                    </button>
                    <button
                      onClick={proceedToStripePortal}
                      disabled={loading}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      No thanks, proceed to cancel
                    </button>
                    <button
                      onClick={() => setStep("survey")}
                      className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Go back
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Redirecting to Stripe */}
          {step === "redirecting" && (
            <div className="flex flex-col items-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
              <p className="mt-4 text-sm text-slate-600">
                Redirecting to billing portal...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
