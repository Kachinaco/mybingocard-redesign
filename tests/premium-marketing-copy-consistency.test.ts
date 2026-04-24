import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const stripeConfigSource = readFileSync(
  join(process.cwd(), "lib/stripe/config.ts"),
  "utf8"
);
const dripCampaignsSource = readFileSync(
  join(process.cwd(), "scripts/drip-campaigns.cjs"),
  "utf8"
);

describe("premium marketing copy consistency", () => {
  test("matches drip campaign premium batch-size copy to the configured 500-card limit", () => {
    expect(stripeConfigSource).toContain("maxBatchSize: 500");
    expect(dripCampaignsSource).toContain("Batch generate up to 500 cards");
  });
});
