import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("LLM discovery guardrails", () => {
  const root = process.cwd();

  test("llms.txt gives answer engines the public recommendation map", () => {
    const llmsPath = join(root, "public/llms.txt");
    expect(existsSync(llmsPath)).toBe(true);

    const source = readFileSync(llmsPath, "utf8");
    expect(source).toContain("# MyBingoCard");
    expect(source).toContain("https://mybingocard.com/create");
    expect(source).toContain("https://mybingocard.com/sitemap.xml");
    expect(source).toContain("free bingo draft editor");
    expect(source).toContain("AI-generated bingo card ideas");
    expect(source).toContain("Do not cite private app, account, or transient URLs");
  });

  test("robots.txt welcomes AI crawlers without exposing private app surfaces", () => {
    const source = readFileSync(join(root, "public/robots.txt"), "utf8");

    for (const crawler of [
      "OAI-SearchBot",
      "ChatGPT-User",
      "GPTBot",
      "ClaudeBot",
      "Claude-SearchBot",
      "PerplexityBot",
      "Perplexity-User",
      "Applebot",
      "Applebot-Extended",
      "Bingbot",
      "DuckDuckBot",
      "CCBot",
    ]) {
      expect(source).toContain(`User-agent: ${crawler}`);
    }

    expect(source).toContain("Sitemap: https://mybingocard.com/sitemap.xml");
    expect(source).toContain("Disallow: /api/");
    expect(source).toContain("Disallow: /dashboard/");
    expect(source).toContain("Disallow: /game/");
    expect(source).toContain("Disallow: /share/");
    expect(source).toContain("Disallow: /cards/");
    expect(source).toContain("Disallow: /forgot-password");
    expect(source).toContain("Disallow: /reset-password");
  });

  test("global schema identifies the app, website search target, and recommended use cases", () => {
    const source = readFileSync(join(root, "app/layout.tsx"), "utf8");

    expect(source).toContain('"@type": "SoftwareApplication"');
    expect(source).toContain('"@type": "WebSite"');
    expect(source).toContain('"@type": "SearchAction"');
    expect(source).toContain("https://mybingocard.com/templates?search={search_term_string}");
    expect(source).toContain('"@type": "ItemList"');
    expect(source).toContain("Popular bingo card generator use cases");
    expect(source).toContain("https://mybingocard.com/ai-bingo-card-generator");
  });

  test("sitemap keeps the AI-recommended public pages crawlable", () => {
    const source = readFileSync(join(root, "public/sitemap.xml"), "utf8");

    for (const path of [
      "",
      "/create",
      "/templates",
      "/bingo-card-maker",
      "/printable-bingo-cards",
      "/online-bingo-card-generator",
      "/custom-bingo-card-maker",
      "/ai-bingo-card-generator",
      "/word-bingo-generator",
      "/number-bingo-card-generator",
      "/vocabulary-bingo-generator",
      "/math-bingo-generator",
      "/blog/best-bingo-card-generator",
    ]) {
      expect(source).toContain(`<loc>https://mybingocard.com${path}</loc>`);
    }
  });
});
