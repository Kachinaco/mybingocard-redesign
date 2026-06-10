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

  test("free users can use single-card PDF export while batches stay paid", () => {
    expect(cardPageSource).toContain("const shouldUseBatchForPdf = false;");
    expect(cardPageSource).toContain("Paid PDF packs");
    expect(cardPageSource).toContain("Generate printable cards");
    expect(cardPageSource).toContain("Generate ${batchCount} Cards");
    expect(cardPageSource).toContain("Pay ${selectedBatchPrice} & Generate Cards");
    expect(cardPageSource).toContain("handleBatchCheckout");
  });

  test("single-card PDF API allows authenticated free-plan PDF downloads", () => {
    expect(pdfRouteSource).not.toContain("if (!hasPremiumAccess(user))");
    expect(pdfRouteSource).not.toContain("trialRequired: true");
    expect(pdfRouteSource).toContain('event: "export_pdf"');
  });

  test("PNG export is allowed for free users by plan permissions", () => {
    expect(cardPageSource).toContain("canExportPNG: data.plan?.canExportPNG || false");
    expect(cardPageSource).not.toContain("Download PNG");
    expect(pngRouteSource).not.toContain("if (!hasPremiumAccess(user))");
    expect(pngRouteSource).not.toContain("upgradeRequired: true");
    expect(stripeConfigSource).toContain("canExportPNG: true");
  });

  test("free users can export generated batch PDFs only after a batch purchase", () => {
    expect(batchPdfRouteSource).toContain("hasPremiumBatchAccess");
    expect(batchPdfRouteSource).toContain("purchased_batch_required");
    expect(stripeConfigSource).toContain("maxBatchSize: 1");
    expect(batchPdfRouteSource).not.toContain("cardIds.length > 100");
  });

  test("free-plan marketing copy promises single-card PDF export and keeps batches paid", () => {
    expect(stripeConfigSource).toContain('"PDF and PNG export"');
    expect(pricingPageSource).toContain('["PDF export", "Yes", "Yes", "Yes"]');
    expect(pricingPageSource).toContain("Paid Batch Packs and Share Links");
    expect(pricingPageSource).toContain('["Batch generation", "Paid packs", "Up to 500 included", "Up to 500 included"]');
  });
});
