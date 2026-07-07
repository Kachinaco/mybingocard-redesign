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
const embeddedCheckoutRouteSource = readFileSync(
  join(process.cwd(), "app/api/stripe/embedded-checkout/route.ts"),
  "utf8"
);
const createCheckoutRouteSource = readFileSync(
  join(process.cwd(), "app/api/stripe/create-checkout-session/route.ts"),
  "utf8"
);

describe("pricing page copy consistency", () => {
  test("matches the free plan table row to the configured free saved-card limit", () => {
    expect(pricingPageSource).toContain('["Bingo cards", "1 saved card", "Unlimited", "Unlimited"]');
    expect(stripeConfigSource).toContain('"1 saved bingo card"');
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

  test("does not advertise or create Premium trials", () => {
    expect(pricingPageSource).not.toMatch(/trial/i);
    expect(stripeConfigSource).not.toContain("PREMIUM_TRIAL_DAYS");
    expect(embeddedCheckoutRouteSource).not.toContain("trial_period_days");
    expect(embeddedCheckoutRouteSource).not.toContain("subscription_trial");
    expect(createCheckoutRouteSource).not.toContain("trial_period_days");
    expect(createCheckoutRouteSource).not.toContain("subscription_trial");
  });
});
