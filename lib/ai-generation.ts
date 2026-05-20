import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CODEX_BIN = process.env.CODEX_BIN || "codex";
const CODEX_PRIMARY_MODEL = process.env.CODEX_PRIMARY_MODEL || "gpt-5.5";
const CODEX_FALLBACK_MODEL = process.env.CODEX_FALLBACK_MODEL || "gpt-5.5";
const GEMINI_API_URL = (process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
const GEMINI_PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL || "gemini-2.5-flash-lite";
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash";
const OPENROUTER_API_URL = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
const OPENROUTER_PRIMARY_MODEL = process.env.OPENROUTER_PRIMARY_MODEL || "openai/gpt-oss-120b:free";
const OPENROUTER_FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL || "qwen/qwen3-next-80b-a3b-instruct:free";
const MOONSHOT_API_URL = (process.env.MOONSHOT_BASE_URL || "https://api.moonshot.ai/v1").replace(/\/$/, "");
const MOONSHOT_PRIMARY_MODEL = process.env.MOONSHOT_PRIMARY_MODEL || "kimi-k2.6";
const OPENAI_API_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const OPENAI_PRIMARY_MODEL = process.env.OPENAI_PRIMARY_MODEL || "gpt-4.1-mini";
const OPENAI_FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL || "gpt-4.1-nano";
const ANTHROPIC_API_URL = process.env.ANTHROPIC_API_URL || "https://api.anthropic.com/v1/messages";
const ANTHROPIC_FALLBACK_MODEL = process.env.ANTHROPIC_FALLBACK_MODEL || "claude-3-5-haiku-latest";
const MAX_RESPONSE_TOKENS = 400;
const ENABLE_API_FALLBACK = process.env.AI_API_FALLBACK_ENABLED !== "0";
const ENABLE_PAID_API_FALLBACK = process.env.AI_PAID_API_FALLBACK_ENABLED === "1";
const ENABLE_CODEX_FALLBACK = process.env.AI_CODEX_FALLBACK_ENABLED === "1";

const TONE_MAP: Record<string, string> = {
  funny: "Humorous and playful. Include witty observations, exaggerations, and things that would make people laugh.",
  serious: "Straightforward and realistic. Items should be genuine, commonly expected occurrences.",
  mix: "A mix of funny and serious. Some items humorous, some genuine and relatable.",
};

export type AiUseCase = "teacher" | "wedding" | "baby-shower" | "office" | "social";
export type AiPromptDetails = Record<string, string>;

const USE_CASE_LABELS: Record<AiUseCase, string> = {
  teacher: "Teacher",
  wedding: "Wedding",
  "baby-shower": "Baby shower",
  office: "Office",
  social: "Social",
};

const USE_CASE_INSTRUCTIONS: Record<AiUseCase, string[]> = {
  teacher: [
    "Use the grade level, subject, vocabulary list, and difficulty when provided.",
    "If a vocabulary list is provided, prioritize those exact terms and keep distractors relevant.",
    "Keep the squares classroom-safe, age-appropriate, and useful for review.",
  ],
  wedding: [
    "Use the couple names, venue vibe, and requested moments when provided.",
    "Keep the squares reception-safe, guest-friendly, and not embarrassing.",
    "Avoid anything the user explicitly asked to avoid.",
  ],
  "baby-shower": [
    "Follow the selected baby shower format such as gift bingo, prediction bingo, name bingo, or emoji bingo.",
    "Use provided registry items, theme details, and avoid-list when available.",
    "Keep items warm, inclusive, and easy for guests to recognize during the shower.",
  ],
  office: [
    "Follow the selected work format such as team meeting, onboarding, training, or icebreaker bingo.",
    "Keep the squares professional, clean, and useful for a workplace audience.",
    "Avoid sensitive, personal, or insulting jokes unless the user explicitly provided safe inside references.",
  ],
  social: [
    "Follow the selected social format such as goals bingo, dating bingo, not-on-my-bingo-card, or a 2026 bingo board.",
    "Make the squares short, shareable, and specific enough for a social post.",
    "Avoid offensive stereotypes, harassment, or mean-spirited prompts.",
  ],
};

function sanitizeDetail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().substring(0, 500);
}

function formatPromptDetails(promptDetails?: AiPromptDetails): string {
  if (!promptDetails || typeof promptDetails !== "object") return "";

  const lines = Object.entries(promptDetails)
    .map(([key, value]) => {
      const detail = sanitizeDetail(value);
      if (!detail) return "";
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
      return `- ${label}: ${detail}`;
    })
    .filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : "";
}

function buildUseCaseContext(useCase?: string, promptDetails?: AiPromptDetails): string {
  if (!useCase || !(useCase in USE_CASE_LABELS)) {
    const details = formatPromptDetails(promptDetails);
    return details ? `\nAdditional details:\n${details}\n` : "";
  }

  const typedUseCase = useCase as AiUseCase;
  const details = formatPromptDetails(promptDetails);
  const instructions = USE_CASE_INSTRUCTIONS[typedUseCase].map((item) => `- ${item}`).join("\n");

  return `\nUse case: ${USE_CASE_LABELS[typedUseCase]}
${details ? `Structured details:\n${details}\n` : ""}Use-case instructions:
${instructions}
`;
}

export function buildBingoPrompt(
  theme: string,
  tone: string,
  cellCount: number,
  title?: string,
  useCase?: string,
  promptDetails?: AiPromptDetails
): string {
  const toneDesc = TONE_MAP[tone] || `Tone: ${tone}`;
  const useCaseContext = buildUseCaseContext(useCase, promptDetails);
  return `Generate exactly ${cellCount} unique bingo card items for the theme: "${theme}"
${title ? `The card is titled "${title}".` : ""}

Tone: ${toneDesc}
${useCaseContext}

Rules:
- Each item should be 2-6 words
- All items must be unique and specific to the theme
- Be creative, not generic
- Items should be things that might happen, be observed, or relate to the theme
- Return ONLY a JSON array of strings, no other text

Example format: ["Item one", "Item two", "Item three"]`;
}

function normalizeTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item && typeof (item as { text?: unknown }).text === "string") {
          return (item as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export function extractJsonArray(text: string): string[] {
  const trimmedText = text.trim();

  try {
    const parsed = JSON.parse(trimmedText);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim().substring(0, 50));
    }

    if (parsed && typeof parsed === "object") {
      const objectValues = Object.values(parsed as Record<string, unknown>);
      const arrayValue = objectValues.find((value) => Array.isArray(value));
      if (Array.isArray(arrayValue)) {
        return arrayValue.map((item) => String(item).trim().substring(0, 50));
      }
    }
  } catch {}

  const matches = text.match(/\[[\s\S]*?\]/g);
  const jsonCandidate = matches && matches.length > 0 ? matches[matches.length - 1] : null;
  if (!jsonCandidate) {
    throw new Error("Failed to generate cells. Try again.");
  }

  let items: unknown;
  try {
    items = JSON.parse(jsonCandidate);
  } catch {
    throw new Error("Failed to parse generated cells. Try again.");
  }

  if (!Array.isArray(items)) {
    throw new Error("Failed to parse generated cells. Try again.");
  }

  return items.map((item) => String(item).trim().substring(0, 50));
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function generateWithCodexCli(model: string, prompt: string): Promise<string> {
  const workdir = await mkdtemp(join(tmpdir(), "mybingocard-codex-"));
  const promptPath = join(workdir, "prompt.txt");

  try {
    await writeFile(promptPath, prompt, "utf8");

    const command = [
      shellQuote(CODEX_BIN),
      "exec",
      "--skip-git-repo-check",
      "-s",
      "read-only",
      "--color",
      "never",
      "-m",
      shellQuote(model),
      "<",
      shellQuote(promptPath),
    ].join(" ");

    const { stdout, stderr } = await execFileAsync("script", ["-qec", command, "/dev/null"], {
      cwd: process.cwd(),
      timeout: 120000,
      maxBuffer: 1024 * 1024,
    });

    const content = String(stdout || "").trim();
    if (!content) {
      throw new Error(String(stderr || "Codex CLI returned an empty response").trim());
    }

    return content;
  } catch (error: any) {
    const stderr = error?.stderr ? String(error.stderr).trim() : "";
    const stdout = error?.stdout ? String(error.stdout).trim() : "";
    throw new Error(stderr || stdout || error?.message || "Codex CLI generation failed");
  } finally {
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
}

async function generateWithGemini(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(`${GEMINI_API_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: MAX_RESPONSE_TOKENS,
        responseMimeType: "application/json",
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === "string" ? data.error.message : `Gemini request failed (${response.status})`;
    throw new Error(message);
  }

  const content = normalizeTextContent(data?.candidates?.[0]?.content?.parts);
  if (!content) {
    throw new Error("Gemini returned an empty response");
  }

  return content;
}

async function generateWithOpenRouter(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  return generateOpenAiCompatible({
    apiUrl: OPENROUTER_API_URL,
    apiKey,
    model,
    prompt,
    providerName: "OpenRouter",
    extraHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://mybingocard.com",
      "X-Title": "MyBingoCard",
    },
  });
}

async function generateWithMoonshot(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY;
  if (!apiKey) {
    throw new Error("MOONSHOT_API_KEY is not configured");
  }

  return generateOpenAiCompatible({
    apiUrl: MOONSHOT_API_URL,
    apiKey,
    model,
    prompt,
    providerName: "Moonshot",
  });
}

async function generateOpenAiCompatible({
  apiUrl,
  apiKey,
  model,
  prompt,
  providerName,
  extraHeaders = {},
}: {
  apiUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  providerName: string;
  extraHeaders?: Record<string, string>;
}): Promise<string> {
  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: MAX_RESPONSE_TOKENS,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === "string" ? data.error.message : `${providerName} request failed (${response.status})`;
    throw new Error(message);
  }

  const content = normalizeTextContent(data?.choices?.[0]?.message?.content);
  if (!content) {
    throw new Error(`${providerName} returned an empty response`);
  }

  return content;
}

async function generateWithOpenAI(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return generateOpenAiCompatible({
    apiUrl: OPENAI_API_URL,
    apiKey,
    model,
    prompt,
    providerName: "OpenAI",
  });
}

async function generateWithAnthropic(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_RESPONSE_TOKENS,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === "string" ? data.error.message : `Anthropic request failed (${response.status})`;
    throw new Error(message);
  }

  const content = normalizeTextContent(data?.content);
  if (!content) {
    throw new Error("Anthropic returned an empty response");
  }

  return content;
}

export async function generateBingoCells({
  theme,
  tone,
  size,
  title,
  freeSpace,
  useCase,
  promptDetails,
}: {
  theme: string;
  tone: string;
  size: 3 | 4 | 5;
  title?: string;
  freeSpace: boolean;
  useCase?: string;
  promptDetails?: AiPromptDetails;
}): Promise<{ cells: string[]; provider: "gemini" | "openrouter" | "moonshot" | "openai" | "anthropic" | "codex-cli"; model: string }> {
  const totalCells = size * size;
  const cellCount = freeSpace ? totalCells - 1 : totalCells;
  const prompt = buildBingoPrompt(theme.trim().substring(0, 500), tone || "mix", cellCount, title, useCase, promptDetails);

  const attempts: Array<{
    provider: "gemini" | "openrouter" | "moonshot" | "openai" | "anthropic" | "codex-cli";
    model: string;
    run: () => Promise<string>;
  }> = [];

  if (ENABLE_API_FALLBACK && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
    attempts.push(
      { provider: "gemini", model: GEMINI_PRIMARY_MODEL, run: () => generateWithGemini(GEMINI_PRIMARY_MODEL, prompt) },
      { provider: "gemini", model: GEMINI_FALLBACK_MODEL, run: () => generateWithGemini(GEMINI_FALLBACK_MODEL, prompt) }
    );
  }

  if (ENABLE_API_FALLBACK && process.env.OPENROUTER_API_KEY) {
    attempts.push(
      { provider: "openrouter", model: OPENROUTER_PRIMARY_MODEL, run: () => generateWithOpenRouter(OPENROUTER_PRIMARY_MODEL, prompt) },
      { provider: "openrouter", model: OPENROUTER_FALLBACK_MODEL, run: () => generateWithOpenRouter(OPENROUTER_FALLBACK_MODEL, prompt) }
    );
  }

  if (ENABLE_PAID_API_FALLBACK && (process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY)) {
    attempts.push({ provider: "moonshot", model: MOONSHOT_PRIMARY_MODEL, run: () => generateWithMoonshot(MOONSHOT_PRIMARY_MODEL, prompt) });
  }

  if (ENABLE_PAID_API_FALLBACK && process.env.OPENAI_API_KEY) {
    attempts.push(
      { provider: "openai", model: OPENAI_PRIMARY_MODEL, run: () => generateWithOpenAI(OPENAI_PRIMARY_MODEL, prompt) },
      { provider: "openai", model: OPENAI_FALLBACK_MODEL, run: () => generateWithOpenAI(OPENAI_FALLBACK_MODEL, prompt) }
    );
  }

  if (ENABLE_PAID_API_FALLBACK && process.env.ANTHROPIC_API_KEY) {
    attempts.push({
      provider: "anthropic",
      model: ANTHROPIC_FALLBACK_MODEL,
      run: () => generateWithAnthropic(ANTHROPIC_FALLBACK_MODEL, prompt),
    });
  }

  if (ENABLE_CODEX_FALLBACK) {
    attempts.push(
      { provider: "codex-cli", model: CODEX_PRIMARY_MODEL, run: () => generateWithCodexCli(CODEX_PRIMARY_MODEL, prompt) },
      { provider: "codex-cli", model: CODEX_FALLBACK_MODEL, run: () => generateWithCodexCli(CODEX_FALLBACK_MODEL, prompt) }
    );
  }

  if (attempts.length === 0) {
    throw new Error("No AI provider is configured");
  }

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      const responseText = await attempt.run();
      const items = extractJsonArray(responseText);
      while (items.length < cellCount) items.push("");
      const trimmed = items.slice(0, cellCount);
      const cells = freeSpace
        ? [...trimmed.slice(0, Math.floor(totalCells / 2)), "", ...trimmed.slice(Math.floor(totalCells / 2))]
        : trimmed;

      return { cells, provider: attempt.provider, model: attempt.model };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[ai-generation] ${attempt.provider}:${attempt.model} failed`, lastError.message);
    }
  }

  throw lastError || new Error("Generation failed. Please try again.");
}
