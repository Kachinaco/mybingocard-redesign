"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { trackClientActivity } from "@/lib/activity-client";

interface OnboardingData {
  show: boolean;
  completed: {
    createAccount: boolean;
    createCard: boolean;
    exportCard: boolean;
    tryGame: boolean;
    exploreTemplates: boolean;
  };
  completedCount: number;
  totalSteps: number;
}

const STEPS = [
  { key: "createAccount", label: "Create your account", href: null, icon: "\u{1F464}" },
  { key: "createCard", label: "Create your first bingo card", href: "/create", icon: "\u{1F3A8}" },
  { key: "exportCard", label: "Export or share a card", href: null, icon: "\u{1F4E4}" },
  { key: "tryGame", label: "Try a live game", href: "/game/join", icon: "\u{1F3AE}" },
  { key: "exploreTemplates", label: "Explore templates", href: "/templates", icon: "\u{1F4CB}" },
];

export default function OnboardingChecklist() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {});
  }, []);

  if (!data?.show || dismissed) return null;

  const progress = Math.round((data.completedCount / data.totalSteps) * 100);

  const handleDismiss = async () => {
    setDismissed(true);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismiss: true }),
    });
  };

  const trackStep = async (step: string) => {
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step }),
    });
  };

  return (
    <div className="mb-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Getting Started</h3>
          <p className="text-sm text-slate-500">{data.completedCount} of {data.totalSteps} steps completed</p>
        </div>
        <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600 text-sm">
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2">
        {STEPS.map(step => {
          const isCompleted = data.completed[step.key as keyof typeof data.completed];
          const content = (
            <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              isCompleted
                ? "bg-emerald-50 border border-emerald-100"
                : "bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50"
            }`}>
              <span className="text-lg">{isCompleted ? "\u2705" : step.icon}</span>
              <span className={`text-sm font-medium ${isCompleted ? "text-emerald-700 line-through" : "text-slate-700"}`}>
                {step.label}
              </span>
              {!isCompleted && step.href && (
                <svg className="w-4 h-4 text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          );

          if (!isCompleted && step.href) {
            return (
              <Link key={step.key} href={step.href} onClick={() => {
                trackStep(step.key);
                trackClientActivity("onboarding_step_clicked", { step: step.key, completed: false });
              }}>
                {content}
              </Link>
            );
          }

          return <div key={step.key}>{content}</div>;
        })}
      </div>
    </div>
  );
}
