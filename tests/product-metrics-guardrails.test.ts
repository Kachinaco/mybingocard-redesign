import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("product metrics guardrails", () => {
  const productMetricsSource = readSource("lib/db/product-metrics.cjs");
  const productMetricsTypesSource = readSource("lib/db/product-metrics.cjs.d.ts");
  const adminStatsSource = readSource("lib/db/admin-stats.ts");
  const adminPageSource = readSource("app/admin/page.tsx");
  const dailySummarySource = readSource("scripts/daily-summary.cjs");

  test("shared product metrics use bingo-event outcomes instead of login retention", () => {
    expect(productMetricsSource).toContain("CREATOR_ACTIVATION_EVENTS");
    expect(productMetricsSource).toContain('"card_created"');
    expect(productMetricsSource).toContain('"first_card_created"');
    expect(productMetricsSource).toContain('"card_save_succeeded"');

    expect(productMetricsSource).toContain("EVENT_READY_EVENTS");
    expect(productMetricsSource).toContain('"export_pdf"');
    expect(productMetricsSource).toContain('"export_png"');
    expect(productMetricsSource).toContain('"batch_pdf_exported"');
    expect(productMetricsSource).toContain('"share_link_generated"');
    expect(productMetricsSource).toContain('"share_links_generated"');
    expect(productMetricsSource).toContain('"game_created"');
    expect(productMetricsSource).toContain('"game_started"');

    expect(productMetricsSource).toContain("EVENT_COMPLETION_EVENTS");
    expect(productMetricsSource).toContain('"game_completed"');
    expect(productMetricsSource).toContain('"game_bingo_claimed"');
  });

  test("product metrics expose activation, time to value, live games, revenue, operators, and segments", () => {
    for (const token of [
      "activationRate",
      "eventReadyRate",
      "medianTimeToFirstCardMinutes",
      "medianTimeToEventReadyMinutes",
      "completionRate",
      "playersJoined",
      "revenuePerCompletedEvent",
      "repeatCreators30d",
      "seasonalReturnRate",
      "guestPlayers",
      "casualCreators",
      "operators",
    ]) {
      expect(productMetricsTypesSource).toContain(token);
      expect(productMetricsSource).toContain(token);
    }
  });

  test("admin stats and dashboard consume shared product metrics", () => {
    expect(adminStatsSource).toContain('from "@/lib/db/product-metrics.cjs"');
    expect(adminStatsSource).toContain("productMetrics: ProductMetrics");
    expect(adminStatsSource).toContain("getProductMetrics(db, { now, windowDays: 30 })");

    expect(adminPageSource).toContain("Product Health");
    expect(adminPageSource).toContain("Event Ready");
    expect(adminPageSource).toContain("Time to Value");
    expect(adminPageSource).toContain("Live Games");
    expect(adminPageSource).toContain("Revenue per Event");
    expect(adminPageSource).toContain("Seasonal Return");
  });

  test("daily summary reports product health as the primary retention replacement", () => {
    expect(dailySummarySource).toContain("getProductMetrics");
    expect(dailySummarySource).toContain("Product Health (30d)");
    expect(dailySummarySource).toContain("Activation: card");
    expect(dailySummarySource).toContain("Time to value: first card");
    expect(dailySummarySource).toContain("Events: completed");
    expect(dailySummarySource).toContain("Live games: joins");
    expect(dailySummarySource).toContain("Operators: active");
    expect(dailySummarySource).toContain("Segments: guests");
    expect(dailySummarySource).not.toContain("Retention: 24h");
    expect(dailySummarySource).not.toContain("Retention: 14d");
  });
});
