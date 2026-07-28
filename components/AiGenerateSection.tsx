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

type AiUseCase = "custom" | "teacher" | "wedding" | "baby-shower" | "office" | "social";

type PromptField = {
  key: string;
  label: string;
  placeholder: string;
  kind?: "input" | "textarea" | "select";
  options?: string[];
};

const USE_CASES: Array<{ value: AiUseCase; label: string; placeholder: string }> = [
  { value: "custom", label: "Custom", placeholder: "e.g., first date red flags, office meeting bingo..." },
  { value: "teacher", label: "Teacher", placeholder: "e.g., 5th grade ecosystems review" },
  { value: "wedding", label: "Wedding", placeholder: "e.g., cocktail hour moments" },
  { value: "baby-shower", label: "Baby Shower", placeholder: "e.g., woodland baby shower" },
  { value: "office", label: "Office", placeholder: "e.g., new hire onboarding" },
  { value: "social", label: "Social", placeholder: "e.g., 2026 goals board" },
];

const PROMPT_FIELDS: Record<Exclude<AiUseCase, "custom">, PromptField[]> = {
  teacher: [
    { key: "gradeLevel", label: "Grade", placeholder: "5th grade" },
    { key: "subject", label: "Subject", placeholder: "Science, ELA, Spanish..." },
    { key: "difficulty", label: "Difficulty", placeholder: "Review, easy, challenging..." },
    { key: "vocabularyList", label: "Vocabulary", placeholder: "photosynthesis, chlorophyll, habitat...", kind: "textarea" },
  ],
  wedding: [
    { key: "coupleNames", label: "Couple", placeholder: "Maya and Jordan" },
    { key: "venueVibe", label: "Vibe", placeholder: "Garden reception, black tie, beach..." },
    { key: "includeMoments", label: "Include", placeholder: "toast, first dance, photo booth...", kind: "textarea" },
    { key: "avoidMoments", label: "Avoid", placeholder: "inside jokes, alcohol, speeches...", kind: "textarea" },
  ],
  "baby-shower": [
    { key: "format", label: "Format", placeholder: "", kind: "select", options: ["Gift bingo", "Prediction bingo", "Name bingo", "Emoji bingo"] },
    { key: "theme", label: "Theme", placeholder: "Woodland, safari, little cutie..." },
    { key: "includeItems", label: "Include", placeholder: "diapers, onesies, stroller, pacifier...", kind: "textarea" },
    { key: "avoidItems", label: "Avoid", placeholder: "brand names, gendered colors...", kind: "textarea" },
  ],
  office: [
    { key: "format", label: "Format", placeholder: "", kind: "select", options: ["Team meeting", "Onboarding", "Training", "Icebreaker"] },
    { key: "teamContext", label: "Context", placeholder: "Sales kickoff, remote team, all-hands..." },
    { key: "includeTopics", label: "Include", placeholder: "agenda terms, company values, tools...", kind: "textarea" },
    { key: "avoidTopics", label: "Avoid", placeholder: "sensitive topics, layoffs, specific people...", kind: "textarea" },
  ],
  social: [
    { key: "format", label: "Format", placeholder: "", kind: "select", options: ["Goals bingo", "Dating bingo", "Not on my bingo card", "2026 bingo board"] },
    { key: "vibe", label: "Vibe", placeholder: "Optimistic, chaotic, cozy, ambitious..." },
    { key: "includeIdeas", label: "Include", placeholder: "fitness, travel, career, friends...", kind: "textarea" },
    { key: "avoidIdeas", label: "Avoid", placeholder: "mean jokes, politics, private details...", kind: "textarea" },
  ],
};

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
  const [useCase, setUseCase] = useState<AiUseCase>("custom");
  const [promptDetails, setPromptDetails] = useState<Record<string, string>>({});
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

  const currentUseCase = USE_CASES.find((item) => item.value === useCase) || USE_CASES[0]!;
  const fields = useCase === "custom" ? [] : PROMPT_FIELDS[useCase];
  const structuredDetails = fields.reduce<Record<string, string>>((details, field) => {
    const value = (promptDetails[field.key] || "").trim();
    if (value) details[field.key] = value;
    return details;
  }, {});
  const promptDetailKeys = Object.keys(structuredDetails);
  const hasPromptContext = Boolean(theme.trim()) || promptDetailKeys.length > 0;

  const updatePromptDetail = (key: string, value: string) => {
    setPromptDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handleUseCaseChange = (value: AiUseCase) => {
    setUseCase(value);
    setPromptDetails({});
    setError("");
  };

  const handleGenerate = async () => {
    if (!hasPromptContext) {
      setError("Enter a theme or prompt details");
      return;
    }

    setGenerating(true);
    setError("");
    setSuccess(false);
    trackClientActivity("ai_generate_clicked", {
      theme_length: theme.trim().length,
      tone,
      size,
      use_case: useCase,
      prompt_detail_count: promptDetailKeys.length,
      prompt_detail_keys: promptDetailKeys,
    });

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
          useCase: useCase === "custom" ? undefined : useCase,
          promptDetails: structuredDetails,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json().catch(() => ({}))
        : {};

      if (!res.ok) {
        const fallbackError = res.status === 504
          ? "AI generation timed out. Please try again."
          : "Generation failed";
        const errorMessage = (data as { error?: string }).error || fallbackError;
        setError(errorMessage);
        trackClientActivity("ai_generate_failed", { error: errorMessage, size, status: res.status });
        return;
      }

      onCellsGenerated((data as { cells: string[] }).cells);
      setSuccess(true);
      trackClientActivity("ai_generate_completed", {
        theme_length: theme.trim().length,
        tone,
        size,
        use_case: useCase,
        prompt_detail_count: promptDetailKeys.length,
        prompt_detail_keys: promptDetailKeys,
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="notranslate bg-white rounded-2xl shadow-sm border border-gray-200 p-4" translate="no">
      <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </span>
        AI Generate
        {!isPremium && (
          <span className="text-[10px] font-normal text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">Free</span>
        )}
      </h2>

      <div className="space-y-3">
        <div>
          <label htmlFor="ai-use-case" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Use case
          </label>
          <select
            id="ai-use-case"
            value={useCase}
            onChange={(e) => handleUseCaseChange(e.target.value as AiUseCase)}
            disabled={disabled || generating}
            className="w-full px-3 py-2 bg-[#f2f2f7] border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent disabled:opacity-50"
          >
            {USE_CASES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ai-theme" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Theme
          </label>
          <textarea
            id="ai-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder={currentUseCase.placeholder}
            rows={1}
            disabled={disabled || generating}
            className="w-full px-3 py-2 bg-[#f2f2f7] border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none disabled:opacity-50"
            maxLength={500}
          />
        </div>

        {fields.length > 0 && (
          <div className="space-y-2">
            {fields.map((field) => (
              <div key={field.key}>
                <label htmlFor={`ai-detail-${field.key}`} className="block text-xs font-medium text-gray-500 mb-1">
                  {field.label}
                </label>
                {field.kind === "select" ? (
                  <select
                    id={`ai-detail-${field.key}`}
                    value={promptDetails[field.key] || ""}
                    onChange={(e) => updatePromptDetail(field.key, e.target.value)}
                    disabled={disabled || generating}
                    className="w-full px-3 py-2 bg-[#f2f2f7] border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">Choose format</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : field.kind === "textarea" ? (
                  <textarea
                    id={`ai-detail-${field.key}`}
                    value={promptDetails[field.key] || ""}
                    onChange={(e) => updatePromptDetail(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={2}
                    disabled={disabled || generating}
                    className="w-full px-3 py-2 bg-[#f2f2f7] border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none disabled:opacity-50"
                    maxLength={500}
                  />
                ) : (
                  <input
                    id={`ai-detail-${field.key}`}
                    type="text"
                    value={promptDetails[field.key] || ""}
                    onChange={(e) => updatePromptDetail(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={disabled || generating}
                    className="w-full px-3 py-2 bg-[#f2f2f7] border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent disabled:opacity-50"
                    maxLength={300}
                  />
                )}
              </div>
            ))}
          </div>
        )}

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
          disabled={disabled || generating || !hasPromptContext}
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
              Generate Cells
            </>
          )}
        </button>

        {!isPremium && (
          <p className="text-xs text-center text-gray-400">Free visitors include a daily AI generation limit.</p>
        )}

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {success && <p className="text-sm text-green-600 text-center">Cells generated! Edit any cell below.</p>}
      </div>
    </div>
  );
}
