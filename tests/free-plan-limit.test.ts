import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const subscriptionsSource = readFileSync(
  join(process.cwd(), "lib/db/subscriptions.ts"),
  "utf8"
);
const stripeConfigSource = readFileSync(
  join(process.cwd(), "lib/stripe/config.ts"),
  "utf8"
);

describe("free plan limits", () => {
  test("limits free users to 3 cards in subscription helpers", () => {
    expect(subscriptionsSource).toContain("free: {");
    expect(subscriptionsSource).toContain("maxCards: 3");
  });

  test("limits free users to 3 cards in Stripe-facing plan config", () => {
    expect(stripeConfigSource).toContain("maxCards: 3");
  });

  test("describes the free plan as 3 cards", () => {
    expect(stripeConfigSource).toContain('FREE: {');
    expect(stripeConfigSource).toContain('"3 bingo cards"');
  });
});
