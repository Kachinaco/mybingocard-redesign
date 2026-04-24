import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pricingPageSource = readFileSync(
  join(process.cwd(), "app/pricing/page.tsx"),
  "utf8"
);

describe("pricing page copy consistency", () => {
  test("matches the free plan table row to the 3-card free plan", () => {
    expect(pricingPageSource).toContain('["Bingo cards", "3 cards", "Unlimited", "Unlimited"]');
  });

  test("matches the premium batch-generation row to the 100-card premium batch limit", () => {
    expect(pricingPageSource).toContain('["Batch generation", "-", "Up to 100", "Up to 100"]');
  });
});
