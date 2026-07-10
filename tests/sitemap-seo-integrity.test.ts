import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const sitemap = readFileSync(join(root, "public/sitemap.xml"), "utf8");

function entryFor(path: string) {
  const url = `https://mybingocard.com${path}`;
  const entry = sitemap.match(new RegExp(`<url>\\s*<loc>${url}</loc>([\\s\\S]*?)</url>`));
  if (!entry) throw new Error(`Missing sitemap entry for ${path}`);
  return entry[0];
}

describe("SEO sitemap integrity", () => {
  test("contains one valid entry for every public URL", () => {
    const urls = [...sitemap.matchAll(/<loc>(https:\/\/mybingocard\.com[^<]*)<\/loc>/g)].map((match) => match[1]);

    expect(urls.length).toBe(65);
    expect(new Set(urls).size).toBe(urls.length);
    expect(sitemap).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(sitemap).toMatch(/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
    expect(
      [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].every((match) =>
        /^2026-\d{2}-\d{2}$/.test(match[1] ?? "")
      )
    ).toBe(true);
  });

  test("dates pages materially updated in the July SEO release", () => {
    const julyNinthPaths = [
      "",
      "/create",
      "/templates",
      "/bingo-games",
      "/printable-bingo-cards",
      "/multiplication-bingo-cards",
      "/bridal-shower-bingo",
      "/graduation-bingo",
      "/blog/best-bingo-card-generator",
      "/blog/wedding-bingo-guide",
    ];

    for (const path of julyNinthPaths) {
      expect(entryFor(path)).toContain("<lastmod>2026-07-09</lastmod>");
    }

  });
});
