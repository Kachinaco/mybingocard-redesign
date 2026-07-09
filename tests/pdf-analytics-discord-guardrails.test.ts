import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("PDF analytics and Discord guardrails", () => {
  const createPageSource = readFileSync(resolve(process.cwd(), "app/create/page.tsx"), "utf8");
  const cardPageSource = readFileSync(resolve(process.cwd(), "app/cards/[id]/page.tsx"), "utf8");
  const singlePdfRouteSource = readFileSync(resolve(process.cwd(), "app/api/cards/[id]/export/pdf/route.ts"), "utf8");
  const batchPdfRouteSource = readFileSync(resolve(process.cwd(), "app/api/cards/batch/pdf/route.ts"), "utf8");
  const discordSource = readFileSync(resolve(process.cwd(), "lib/discord.ts"), "utf8");
  const activityRouteSource = readFileSync(resolve(process.cwd(), "app/api/activity/route.ts"), "utf8");
  const adminUserSource = readFileSync(resolve(process.cwd(), "app/admin/users/[id]/page.tsx"), "utf8");

  test("export and batch button intent is tracked before completion", () => {
    for (const source of [createPageSource, cardPageSource]) {
      expect(source).toContain('trackClientActivity("batch_primary_clicked"');
      expect(source).toContain('trackClientActivity("batch_tier_selected"');
      expect(source).toContain("batch_count");
      expect(source).toContain("price");
    }

    expect(cardPageSource).toContain('trackClientActivity("export_button_clicked"');
    expect(cardPageSource).toContain('trackClientActivity("batch_button_clicked"');
    expect(cardPageSource).toContain("selectBatchCount");
    expect(cardPageSource).toContain("open_panel_for_pdf");
    expect(createPageSource).toContain('trackClientActivity("batch_button_clicked"');
  });

  test("batch PDF downloads track client-side start, success, and failure from both flows", () => {
    for (const source of [createPageSource, cardPageSource]) {
      expect(source).toContain('trackClientActivity("batch_pdf_export_started"');
      expect(source).toContain('trackClientActivity("batch_pdf_export_succeeded"');
      expect(source).toContain('trackClientActivity("batch_pdf_export_failed"');
      expect(source).toContain("cardsPerPage");
      expect(source).toContain("grayscale");
      expect(source).toContain("showCutLines: true");
    }
  });

  test("server tracks PDF exports and batch PDF exports", () => {
    expect(singlePdfRouteSource).toContain('event: "export_pdf"');
    expect(singlePdfRouteSource).not.toContain('event: "export_pdf_blocked"');
    expect(batchPdfRouteSource).toContain('event: "batch_pdf_exported"');
    expect(batchPdfRouteSource).toContain('event: "batch_pdf_export_blocked"');
    expect(batchPdfRouteSource).toContain("hasPremiumBatchAccess");
  });

  test("batch PDF exports notify Discord while routine interaction telemetry stays in analytics", () => {
    expect(discordSource).toContain("export async function notifyBatchPdfExported");
    expect(discordSource).toContain("export async function notifyExportButtonClicked");
    expect(discordSource).toContain("export async function notifyBatchButtonClicked");
    expect(discordSource).toContain("Batch PDF Exported");
    expect(discordSource).toContain("cardsPerPage");
    expect(batchPdfRouteSource).toContain("notifyBatchPdfExported");
    expect(batchPdfRouteSource).toContain("firstCardTitle");
    expect(activityRouteSource).toContain("await trackActivity");
    expect(activityRouteSource).toContain('event === "bingo_achieved"');
    expect(activityRouteSource).not.toContain("notifyExportButtonClicked");
    expect(activityRouteSource).not.toContain("notifyBatchButtonClicked");
  });

  test("save-to-checkout funnel clicks remain analytics-only", () => {
    expect(discordSource).toContain("export async function notifySaveCheckoutFunnelEvent");
    expect(discordSource).toContain("Save Card Clicked");
    expect(discordSource).toContain("Save Requires Signup");
    expect(discordSource).toContain("Checkout Auto-Started");
    expect(discordSource).toContain("Checkout Loaded");
    expect(discordSource).toContain("Checkout Closed");
    expect(discordSource).toContain("Kept Drafting");
    expect(discordSource).toContain("Save checkout funnel");
    expect(activityRouteSource).toContain("await trackActivity");
    expect(activityRouteSource).not.toContain("notifySaveCheckoutFunnelEvent");
  });

  test("admin activity labels include PDF analytics events", () => {
    expect(adminUserSource).toContain('export_pdf_blocked: "PDF export blocked"');
    expect(adminUserSource).toContain('batch_pdf_export_blocked: "Batch PDF blocked"');
    expect(adminUserSource).toContain('batch_pdf_export_started: "Started batch PDF"');
    expect(adminUserSource).toContain('batch_pdf_export_succeeded: "Generated batch PDF"');
    expect(adminUserSource).toContain('batch_pdf_export_failed: "Batch PDF failed"');
    expect(adminUserSource).toContain('export_button_clicked: "Clicked export"');
    expect(adminUserSource).toContain('batch_button_clicked: "Clicked batch"');
    expect(adminUserSource).toContain('batch_primary_clicked: "Clicked batch CTA"');
  });
});
