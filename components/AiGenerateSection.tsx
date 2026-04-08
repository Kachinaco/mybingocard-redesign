"use client";

import { useState, useEffect, useRef } from "react";
import { trackClientActivity } from "@/lib/activity-client";

interface AiGenerateSectionProps {
  size: 3 | 4 | 5;
  freeSpace: boolean;
  title: string;
  onCellsGenerated: (cells: string[]) => void;
  isPremium: boolean;
  disabled?: boolean;
  onUpgradeNeeded?: () => void;
}

const TONES = [
  { value: "funny", label: "Funny" },
  { value: "serious", label: "Serious" },
  { value: "mix", label: "Mix" },
  { value: "custom", label: "Custom" },
] as const;

export default function AiGenerateSection({
  size,
  freeSpace,
  title,
  onCellsGenerated,
  isPremium,
  disabled,
  onUpgradeNeeded,
}: AiGenerateSectionProps) {
  const [theme, setTheme] = useState("");
  const [tone, setTone] = useState<string>("funny");
  const [customTone, setCustomTone] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (generating) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [generating]);

  const handleGenerate = async () => {
    if (!theme.trim()) {
      setError("Enter a theme for your bingo card");
      return;
    }

    // Free users: show upgrade modal instead of generating
    if (!isPremium) {
      trackClientActivity("ai_generate_gated", { theme: theme.substring(0, 50), tone, size });
      onUpgradeNeeded?.();
      return;
    }

    setGenerating(true);
    setError("");
    setSuccess(false);
    trackClientActivity("ai_generate_clicked", { theme: theme.substring(0, 50), tone, size });

    try {
      const res = await fetch("/api/generate-cells", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: theme.trim(),
          tone: tone === "custom" ? customTone.trim() || "mix" : tone,
          size,
          title,
          freeSpace,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        trackClientActivity("ai_generate_failed", { error: data.error, size });
        return;
      }

      onCellsGenerated(data.cells);
      setSuccess(true);
      trackClientActivity("ai_generate_completed", { theme: theme.substring(0, 50), tone, size });
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
      <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </span>
        AI Generate
        {!isPremium && (
          <span className="text-[10px] font-normal text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">Premium</span>
        )}
      </h2>

      <div className="space-y-3">
        <div>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g., first date red flags, office meeting bingo..."
            rows={1}
            disabled={disabled || generating}
            className="w-full px-3 py-2 bg-[#f2f2f7] border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none disabled:opacity-50"
            maxLength={500}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Tone</span>
          <div className="flex gap-1.5">
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTone(t.value)}
                disabled={disabled || generating}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  tone === t.value
                    ? "bg-[#007AFF] text-white shadow-sm"
                    : "bg-[#f2f2f7] text-gray-600 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tone === "custom" && (
            <input
              type="text"
              value={customTone}
              onChange={(e) => setCustomTone(e.target.value)}
              placeholder="Describe the tone you want..."
              disabled={disabled || generating}
              className="mt-2 w-full px-3 py-2 bg-[#f2f2f7] border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent disabled:opacity-50"
              maxLength={200}
            />
          )}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={disabled || generating || !theme.trim()}
          className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            isPremium
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg"
              : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg"
          }`}
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating... {elapsed}s
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              {isPremium ? "Generate Cells" : "Generate with AI"}
            </>
          )}
        </button>

        {!isPremium && (
          <p className="text-xs text-center text-gray-400">Upgrade to Premium to unlock AI generation</p>
        )}

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {success && <p className="text-sm text-green-600 text-center">Cells generated! Edit any cell below.</p>}
      </div>
    </div>
  );
}
