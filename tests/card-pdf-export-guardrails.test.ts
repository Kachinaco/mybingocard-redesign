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

  function pdfCellRule(source: string): string {
    return source.match(/\.cell \{[\s\S]*?\n\s*\}/)?.[0] || "";
  }

  test("card page keeps single-card PDF export free", () => {
    expect(cardPageSource).toContain("const isPremiumBatchUser = true;");
    expect(cardPageSource).toContain("const shouldUseBatchForPdf = false;");
    expect(cardPageSource).toContain("Download Cards");
    expect(cardPageSource).not.toContain("Pay ${selectedBatchPrice} & Generate Cards");
  });

  test("single-card PDF API does not block non-premium users", () => {
    expect(pdfRouteSource).toContain('event: "export_pdf"');
    expect(pdfRouteSource).not.toContain('event: "export_pdf_blocked"');
    expect(pdfRouteSource).not.toContain("upgradeRequired: true");
    expect(pdfRouteSource).not.toContain("hasPremiumAccess");
  });

  test("PNG export is enabled by plan permissions and route has no paywall block", () => {
    expect(cardPageSource).toContain("canExportPNG: data.plan?.canExportPNG || true");
    expect(pngRouteSource).toContain('event: "export_png"');
    expect(pngRouteSource).not.toContain('event: "export_png_blocked"');
    expect(pngRouteSource).not.toContain("upgradeRequired: true");
    expect(stripeConfigSource).toContain("canExportPNG: true");
  });

  test("batch PDFs are included through the 500-card free batch allowance", () => {
    expect(batchPdfRouteSource).toContain("hasPremiumBatchAccess");
    expect(batchPdfRouteSource).toContain("maxBatchSize >= 10");
    expect(stripeConfigSource).toContain("maxBatchSize: 500");
    expect(batchPdfRouteSource).not.toContain("purchased_batch_required");
  });

  test("PDF image cells constrain cover images inside bingo squares", () => {
    expect(pdfRouteSource).toContain("position:absolute;inset:0;width:100%;height:100%;object-fit:cover");
    expect(batchPdfRouteSource).toContain("position:absolute;inset:0;width:100%;height:100%;object-fit:cover");
    expect(pdfCellRule(pdfRouteSource)).toContain("position: relative;");
    expect(pdfCellRule(batchPdfRouteSource)).toContain("position: relative;");
  });

  test("pricing and plan copy keep exports and batches free", () => {
    expect(stripeConfigSource).toContain('"PDF and PNG export"');
    expect(pricingPageSource).toContain('["PDF export", "Yes", "Yes", "Yes"]');
    expect(pricingPageSource).toContain('["PNG export", "Yes", "Yes", "Yes"]');
    expect(pricingPageSource).toContain("Batch Packs and Share Links");
    expect(pricingPageSource).toContain('["Batch generation", "Up to 500", "Up to 500", "Up to 500"]');
  });
});
