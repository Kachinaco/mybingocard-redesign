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

  test("keeps printable batches paid for free users and included for Premium", () => {
    expect(stripeConfigSource).toContain("maxBatchSize: 1");
    expect(stripeConfigSource).toContain('"Paid printable batch packs"');
    expect(pricingPageSource).toContain('"Optional printable batch packs"');
    expect(pricingPageSource).toContain('["Batch generation", "Paid packs", "Up to 500 included", "Up to 500 included"]');
  });

  test("links paid batch-pack explanation into the batch flow", () => {
    expect(pricingPageSource).toContain("Paid Batch Packs and Share Links");
    expect(pricingPageSource).toContain('href={`/create?batchMode=1&batchCount=${count}`}');
    expect(pricingPageSource).toContain("Create batch");
  });

  test("keeps image bingo cells and uploads available on the free plan", () => {
    expect(stripeConfigSource).toContain("maxImageUploads: 500");
    expect(pricingPageSource).toContain('["Image bingo cells", "Yes", "Yes", "Yes"]');
  });
});
