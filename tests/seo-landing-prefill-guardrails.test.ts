import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { seoLandingPages } from "@/lib/seo-landing-pages";

const longTailSlugs = [
  "multiplication-bingo-cards",
  "periodic-table-bingo",
  "state-capitals-bingo",
  "back-to-school-bingo",
  "end-of-year-bingo",
  "wedding-reception-bingo",
  "bridal-shower-gift-bingo",
  "baby-shower-gift-bingo",
  "baby-prediction-bingo",
  "office-meeting-bingo",
  "onboarding-bingo",
  "training-bingo",
  "conference-bingo",
  "remote-meeting-bingo",
  "christmas-party-bingo",
];

describe("SEO landing page prefill guardrails", () => {
  const seoLandingSource = readFileSync(join(process.cwd(), "components/SeoLandingPage.tsx"), "utf8");

  test("shared SEO pages offer a prefilled Use This List creator link", () => {
    expect(seoLandingSource).toContain("function buildUseThisListHref(");
    expect(seoLandingSource).toContain('templateId: `seo-${page.slug}`');
    expect(seoLandingSource).toContain("cells: JSON.stringify(buildPrefilledCells(page))");
    expect(seoLandingSource).toContain('freeSpace: "true"');
    expect(seoLandingSource).toContain("Use This List");
  });

  test("prefilled SEO cards keep a free center and deduplicate page ideas", () => {
    expect(seoLandingSource).toContain("function uniqueIdeas(");
    expect(seoLandingSource).toContain('idea.toUpperCase() === "FREE"');
    expect(seoLandingSource).toContain("if (index === 12) continue;");
    expect(seoLandingSource).toContain("uniqueIdeas(page).slice(0, 24)");
  });

  test("long-tail SEO pages have route files, sitemap entries, and real sample lists", () => {
    const sitemapSource = readFileSync(join(process.cwd(), "public/sitemap.xml"), "utf8");

    for (const slug of longTailSlugs) {
      const page = seoLandingPages[slug];
      expect(page, slug).toBeDefined();
      if (!page) throw new Error(`Missing SEO landing page for ${slug}`);
      expect(page.sampleSquares.length, slug).toBeGreaterThanOrEqual(25);
      expect(page.ideas.length, slug).toBeGreaterThanOrEqual(6);
      expect(page.faqs.length, slug).toBeGreaterThanOrEqual(3);
      expect(existsSync(join(process.cwd(), "app", slug, "page.tsx")), slug).toBe(true);
      expect(sitemapSource).toContain(`https://mybingocard.com/${slug}`);
    }
  });
});
