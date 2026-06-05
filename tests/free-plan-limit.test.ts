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
const subscriptionStatusSource = readFileSync(
  join(process.cwd(), "lib/subscription-status.ts"),
  "utf8"
);
const cardShareRouteSource = readFileSync(
  join(process.cwd(), "app/api/cards/[id]/share/route.ts"),
  "utf8"
);
const shareLinksGenerateRouteSource = readFileSync(
  join(process.cwd(), "app/api/share-links/generate/route.ts"),
  "utf8"
);

describe("free plan limits", () => {
  test("limits new free users to one saved card in subscription helpers", () => {
    expect(subscriptionsSource).toContain("free: {");
    expect(subscriptionsSource).toContain("maxCards: 1");
  });

  test("limits new free users to one saved card in Stripe-facing plan config", () => {
    expect(stripeConfigSource).toContain("maxCards: 1");
  });

  test("describes the free plan as one saved card", () => {
    expect(stripeConfigSource).toContain('FREE: {');
    expect(stripeConfigSource).toContain('"1 saved bingo card"');
  });

  test("keeps legacy free users on the old card allowance", () => {
    expect(subscriptionStatusSource).toContain("LEGACY_FREE_ACCESS_CUTOFF");
    expect(subscriptionStatusSource).toContain("NEW_FREE_CARD_LIMIT = 1");
    expect(subscriptionStatusSource).toContain("LEGACY_FREE_CARD_LIMIT = 3");
    expect(subscriptionStatusSource).toContain("if (isLegacyFreeUser(user)) return LEGACY_FREE_CARD_LIMIT;");
  });

  test("blocks new free users from share tools while preserving legacy behavior", () => {
    expect(cardShareRouteSource).toContain("hasShareSettingsAccess");
    expect(cardShareRouteSource).toContain("hasPremiumAccess(user) || isLegacyFreeUser(user)");
    expect(shareLinksGenerateRouteSource).toContain("hasPremiumAccess(userRecord) && !isLegacyFreeUser(userRecord)");
  });
});
