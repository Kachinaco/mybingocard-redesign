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
  "app/bridal-shower-bingo/page.tsx",
  "app/super-bowl-bingo/page.tsx",
  "app/music-bingo/page.tsx",
  "app/office-party-bingo/page.tsx",
  "app/party-bingo/page.tsx",
  "app/icebreaker-bingo/page.tsx",
  "app/welcome/page.tsx",
  "app/create/layout.tsx",
  "app/templates/layout.tsx",
  "app/blog/how-to-make-custom-bingo-cards/page.tsx",
  "app/blog/best-bingo-games-baby-showers/page.tsx",
  "app/blog/wedding-bingo-guide/page.tsx",
  "app/blog/holiday-bingo-ideas/page.tsx",
  "app/blog/page.tsx",
  "app/blog/best-bingo-card-generator/page.tsx",
  "lib/seo-landing-pages.ts",
  "components/CardUsageBadge.tsx",
  "lib/email.ts",
  "public/llms.txt",
  "lib/stripe/config.ts",
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
  "Instant PDF download",
  "instant PDF download",
  "Free Printable",
  "free printable",
  "Create Free",
  "Start Creating For Free",
  "Start Creating Free",
  "Sign up in seconds",
  "Free accounts can create up to 3",
  "share digital cards for live play or export printable copies after checkout",
  '["Online play links", "Yes"',
  "Rules, Tips & Free Cards",
  "Free Cards",
  "Free — takes 10 seconds",
  "Sign up to save, share, and download",
  "Your card will be saved automatically",
  "free bingo card generator",
  "Free Bingo Card Generator",
  "No credit card required",
  "Print-Ready PDFs",
  "Print or play digital",
  "Print instantly",
  "print instantly",
  "Download high-resolution",
  "download a print-ready",
  "Share cards instantly",
  "Export to PDF and run",
  "free cards used",
  "completely free",
  "Ad-free shared cards",
  "PDF and PNG exportss",
  "free party bingo card maker",
  "without a credit card",
  "No account needed",
  "Includes ads",
  "Ad-free",
  "print-ready",
  "high-resolution PDF",
  "PNG export available",
  "Unlimited shuffle",
  "Trusted by thousands",
  "trusted by thousands",
  "high-quality PDFs",
  "professional-quality PDFs",
  "export-ready cards",
  "Free to create",
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
