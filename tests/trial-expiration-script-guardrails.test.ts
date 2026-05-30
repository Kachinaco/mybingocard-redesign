import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("trial expiration script guardrails", () => {
  const source = readFileSync(resolve(process.cwd(), "scripts/expire-trials.cjs"), "utf8");

  test("trial warning summary counter is initialized and incremented", () => {
    expect(source).toContain("let trialDayEmailsSent = 0;");
    expect(source).toContain("trialDayEmailsSent++;");
    expect(source).toContain("Trial check complete: ${expiredCount} expired, ${trialDayEmailsSent} day emails sent, ${churnFlagged} churn risks flagged");
  });
});
