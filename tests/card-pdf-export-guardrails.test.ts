import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("card PDF export guardrails", () => {
  const cardPageSource = readFileSync(resolve(process.cwd(), "app/cards/[id]/page.tsx"), "utf8");
  const pdfRouteSource = readFileSync(resolve(process.cwd(), "app/api/cards/[id]/export/pdf/route.ts"), "utf8");
  const pngRouteSource = readFileSync(resolve(process.cwd(), "app/api/cards/[id]/export/png/route.ts"), "utf8");
  const batchPdfRouteSource = readFileSync(resolve(process.cwd(), "app/api/cards/batch/pdf/route.ts"), "utf8");
  const pricingPageSource = readFileSync(resolve(process.cwd(), "app/pricing/page.tsx"), "utf8");
  const stripeConfigSource = readFileSync(resolve(process.cwd(), "lib/stripe/config.ts"), "utf8");

  test("free users are routed from single-card PDF export into batch PDF flow", () => {
    expect(cardPageSource).toContain("const shouldUseBatchForPdf = status === \"authenticated\" && !isPremiumBatchUser;");
    expect(cardPageSource).toContain("openBatchForPdf(\"single_pdf_export\")");
    expect(cardPageSource).toContain("Paid PDF checkout");
    expect(cardPageSource).toContain("Paid printable card download");
    expect(cardPageSource).toContain("Pay ${selectedBatchPrice} & Generate Cards");
  });

  test("single-card PDF API denies free-plan PDF downloads", () => {
    expect(pdfRouteSource).toContain("if (!hasPremiumAccess(user))");
    expect(pdfRouteSource).toContain("trialRequired: true");
    expect(pdfRouteSource).toContain("Start your 3-day trial or choose lifetime access to export PDF files.");
  });

  test("PNG export is not shown or allowed for free users", () => {
    expect(cardPageSource).toContain("canExportPNG: data.plan?.canExportPNG || false");
    expect(cardPageSource).not.toContain("Download PNG");
    expect(pngRouteSource).toContain("if (!hasPremiumAccess(user))");
    expect(pngRouteSource).toContain("Start your 3-day trial or choose lifetime access to export PNG files.");
    expect(pngRouteSource).toContain("upgradeRequired: true");
  });

  test("free users must have a purchased generated batch before batch PDF export", () => {
    expect(batchPdfRouteSource).toContain("findGeneratedBatchPurchaseForCards(session.user.id, cardIds)");
    expect(batchPdfRouteSource).toContain('reason: "purchased_batch_required"');
    expect(batchPdfRouteSource).toContain('reason: "card_count_exceeds_purchased_batch"');
    expect(batchPdfRouteSource).not.toContain("cardIds.length > 100");
  });

  test("free-plan marketing copy does not promise free PDF export", () => {
    expect(stripeConfigSource).not.toContain("Standard PDF export");
    expect(pricingPageSource).not.toContain("Standard PDF export");
    expect(pricingPageSource).not.toContain("standard PDF export");
    expect(pricingPageSource).toContain("1 saved bingo card");
    expect(pricingPageSource).toContain('["PDF export", "Browser print + paid batch PDF packs", "HD, no watermark", "HD, no watermark"]');
  });
});
