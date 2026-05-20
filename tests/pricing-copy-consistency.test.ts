import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pricingPageSource = readFileSync(
  join(process.cwd(), "app/pricing/page.tsx"),
  "utf8"
);
const stripeConfigSource = readFileSync(
  join(process.cwd(), "lib/stripe/config.ts"),
  "utf8"
);

describe("pricing page copy consistency", () => {
  test("matches the free plan table row to the 3-card free plan", () => {
    expect(pricingPageSource).toContain('["Bingo cards", "3 cards", "Unlimited", "Unlimited"]');
  });

  test("matches premium batch-generation copy to the configured 500-card batch limit", () => {
    expect(stripeConfigSource).toContain("maxBatchSize: 500");
    expect(pricingPageSource).toContain('"Up to 500 cards per batch"');
    expect(pricingPageSource).toContain('["Batch generation", "-", "Up to 500", "Up to 500"]');
  });

  test("links one-time event packs into the selected batch purchase flow", () => {
    expect(pricingPageSource).toContain('href={`/create?batchCount=${pack.count}&batchMode=1`}');
    expect(pricingPageSource).toContain("Select pack");
  });

  test("shows image bingo cells available on the free plan", () => {
    expect(stripeConfigSource).toContain("maxImageUploads: 25");
    expect(pricingPageSource).toContain('["Image bingo cells", "Yes", "Yes", "Yes"]');
  });
});
