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
  test("matches the free plan table row to unlimited free creator tools", () => {
    expect(pricingPageSource).toContain('["Bingo cards", "Unlimited", "Unlimited", "Unlimited"]');
    expect(stripeConfigSource).toContain('"Unlimited saved bingo cards"');
    expect(stripeConfigSource).toContain('"Profile and saved-card access"');
  });

  test("keeps free batch generation aligned to the configured 500-card batch limit", () => {
    expect(stripeConfigSource).toContain("maxBatchSize: 500");
    expect(pricingPageSource).toContain('"Up to 500 printable cards per batch"');
    expect(pricingPageSource).toContain('["Batch generation", "Up to 500", "Up to 500", "Up to 500"]');
  });

  test("links paid share-link explanation into the free batch flow", () => {
    expect(pricingPageSource).toContain("Paid Share Links");
    expect(pricingPageSource).toContain('href="/create?batchMode=1"');
    expect(pricingPageSource).toContain("Create batch");
  });

  test("keeps image bingo cells and uploads available on the free plan", () => {
    expect(stripeConfigSource).toContain("maxImageUploads: 500");
    expect(pricingPageSource).toContain('["Image bingo cells", "Yes", "Yes", "Yes"]');
  });
});
