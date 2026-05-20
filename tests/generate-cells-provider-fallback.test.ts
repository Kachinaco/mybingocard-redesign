import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("generate cells AI provider fallback", () => {
  const routeSource = readFileSync(resolve(process.cwd(), "app/api/generate-cells/route.ts"), "utf8");

  it("uses shared AI generation helpers instead of the old inline proxy fetch logic", () => {
    expect(routeSource).not.toContain('const PROXY_URL = "http://127.0.0.1:3456/v1/chat/completions";');
    expect(routeSource).toContain('import { generateBingoCells } from "@/lib/ai-generation";');
    expect(routeSource).toContain("const cells = await generateBingoCells(");
  });

  it("defaults to free API providers before any paid or Codex fallback", () => {
    const helperSource = readFileSync(resolve(process.cwd(), "lib/ai-generation.ts"), "utf8");
    expect(helperSource).toContain('process.env.GEMINI_PRIMARY_MODEL || "gemini-2.5-flash-lite"');
    expect(helperSource).toContain('process.env.OPENROUTER_PRIMARY_MODEL || "openai/gpt-oss-120b:free"');
    expect(helperSource).toContain('const ENABLE_PAID_API_FALLBACK = process.env.AI_PAID_API_FALLBACK_ENABLED === "1";');
    expect(helperSource).toContain('const ENABLE_CODEX_FALLBACK = process.env.AI_CODEX_FALLBACK_ENABLED === "1";');
    expect(helperSource).toContain('provider: "gemini"');
    expect(helperSource).toContain('provider: "openrouter"');
    expect(helperSource).toContain('provider: "codex-cli"');
    expect(helperSource).not.toContain('provider: "claude-cli"');
  });
});
