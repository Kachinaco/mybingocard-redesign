import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const publicCopyFiles = [
  "app/features/page.tsx",
  "app/pricing/page.tsx",
  "app/about/page.tsx",
  "app/baby-shower-bingo/page.tsx",
  "app/team-building-bingo/page.tsx",
  "app/family-reunion-bingo/page.tsx",
  "app/church-bingo/page.tsx",
  "app/trivia-bingo/page.tsx",
  "app/fundraiser-bingo/page.tsx",
  "app/movie-bingo/page.tsx",
  "app/wedding-bingo/page.tsx",
  "app/music-bingo/page.tsx",
  "app/office-party-bingo/page.tsx",
  "app/party-bingo/page.tsx",
  "app/icebreaker-bingo/page.tsx",
  "app/welcome/page.tsx",
];

const unsupportedClaims = [
  "30+ professionally",
  "30+ premium",
  "All 30+",
  "world&apos;s most popular",
  "world's most popular",
  "no sign-up required",
  "No signup required",
  "50K",
  "1M+",
  "4.9/5",
  "Print unlimited",
  "7x7",
  "Instant PDF Export",
  "PNG export available",
  "Unlimited shuffle",
  "Trusted by thousands",
  "See what our community",
  "hundreds of templates",
  "unlimited unique cards",
];

describe("public copy claim guardrails", () => {
  test("public marketing pages avoid unsupported or inconsistent claims", () => {
    const combinedSource = publicCopyFiles
      .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
      .join("\n");

    for (const claim of unsupportedClaims) {
      expect(combinedSource).not.toContain(claim);
    }
  });

  test("pricing copy avoids hard-coded premium template counts", () => {
    const pricingSource = readFileSync(join(process.cwd(), "app/pricing/page.tsx"), "utf8");
    expect(pricingSource).toContain('["Templates", "5 starter", "All premium", "All premium"]');
  });
});
