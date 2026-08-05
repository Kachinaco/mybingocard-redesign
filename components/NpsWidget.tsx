"use client";

import { useState, useEffect } from "react";
import { trackClientActivity } from "@/lib/activity-client";

export default function NpsWidget() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<"score" | "followup" | "done">("score");
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/nps");
        const data = await res.json();
        if (data.show) {
          // Small delay before showing
          setTimeout(() => setShow(true), 3000);
        }
      } catch {
        // silently ignore errors
      }
    };
    check();
  }, []);

  const handleScore = async (s: number) => {
    setScore(s);
    setStep("followup");

    // For high scores (7+), submit right away (no comment needed)
    if (s >= 7) {
      await fetch("/api/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: s, comment: "" }),
      });
      trackClientActivity("nps_submitted", { score: s, has_followup: false });
    }
  };

  const handleSubmitComment = async () => {
    setSubmitting(true);
    await fetch("/api/nps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, comment }),
    });
    trackClientActivity("nps_submitted", { score, has_followup: true });
    setStep("done");
    setSubmitting(false);
    setTimeout(() => setShow(false), 3000);
  };

  const dismiss = () => {
    trackClientActivity("nps_dismissed", { step });
    setShow(false);
    // Still mark as shown so it doesn't appear again
    fetch("/api/nps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: 0, comment: "dismissed" }),
    });
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-[#a39a88] overflow-hidden animate-nps-slide-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7c5cff] to-[#7c5cff] px-4 py-3 flex items-center justify-between">
        <span className="text-white font-semibold text-sm">
          Quick Feedback
        </span>
        <button
          onClick={dismiss}
          className="text-white/70 hover:text-white transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {step === "score" && (
          <div>
            <p className="text-[#33312e] font-medium mb-3 text-sm">
              How would you rate MyBingoCard?
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => handleScore(n)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                    n <= 6
                      ? "bg-[#ff5d8f]/10 text-[#ff5d8f] hover:bg-[#ff5d8f]/15"
                      : n <= 8
                        ? "bg-[#ffb800]/10 text-[#ffb800] hover:bg-[#ffb800]/15"
                        : "bg-[#2ec4b6]/10 text-[#2ec4b6] hover:bg-[#2ec4b6]/15"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-[#6b6459]">Not likely</span>
              <span className="text-[10px] text-[#6b6459]">Very likely</span>
            </div>
          </div>
        )}

        {step === "followup" && score !== null && score >= 9 && (
          <div className="text-center">
            <p className="text-lg mb-1">{"\u{1F389}"}</p>
            <p className="text-[#33312e] font-medium text-sm mb-3">
              Awesome! Would you leave us a review?
            </p>
            <div className="space-y-2">
              <a
                href="https://g.page/r/mybingocard/review"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2 bg-[#7c5cff]/10 text-[#7c5cff] rounded-lg text-sm font-medium hover:bg-[#7c5cff]/15 transition"
              >
                Review on Google
              </a>
            </div>
            <button
              onClick={() => {
                setStep("done");
                setTimeout(() => setShow(false), 2000);
              }}
              className="mt-3 text-xs text-[#6b6459] hover:text-[#33312e] transition-colors"
            >
              Maybe later
            </button>
          </div>
        )}

        {step === "followup" && score !== null && score <= 6 && (
          <div>
            <p className="text-[#33312e] font-medium text-sm mb-3">
              What can we improve?
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what's missing or could be better..."
              rows={3}
              className="w-full px-3 py-2 bg-[#fff7ed] border border-[#a39a88] rounded-lg text-sm focus:ring-2 focus:ring-[#7c5cff]/20 focus:border-[#7c5cff] outline-none resize-none"
            />
            <button
              onClick={handleSubmitComment}
              disabled={submitting}
              className="mt-2 w-full py-2 bg-[#7c5cff] text-white rounded-lg text-sm font-medium hover:bg-[#7c5cff] transition disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Feedback"}
            </button>
          </div>
        )}

        {step === "followup" && score !== null && score >= 7 && score <= 8 && (
          <div className="text-center">
            <p className="text-lg mb-1">{"\u{1F60A}"}</p>
            <p className="text-[#33312e] font-medium text-sm">
              Thanks for the feedback!
            </p>
            <p className="text-xs text-[#6b6459] mt-1">
              We appreciate you taking the time.
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-2">
            <p className="text-lg mb-1">{"\u{1F49C}"}</p>
            <p className="text-[#33312e] font-medium text-sm">Thank you!</p>
          </div>
        )}
      </div>
    </div>
  );
}
