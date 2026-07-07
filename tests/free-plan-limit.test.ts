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
  test("keeps new free card saving capped in subscription helpers", () => {
    expect(subscriptionsSource).toContain("free: {");
    expect(subscriptionsSource).toContain("maxCards: NEW_FREE_CARD_LIMIT");
  });

  test("keeps new free card saving capped in Stripe-facing plan config", () => {
    expect(stripeConfigSource).toContain("maxCards: 1");
  });

  test("describes the free plan with one saved card and optional paid upgrades", () => {
    expect(stripeConfigSource).toContain('FREE: {');
    expect(stripeConfigSource).toContain('"1 saved bingo card"');
    expect(stripeConfigSource).toContain('"Paid batches, share links, and hosted bingo events are optional"');
  });

  test("keeps legacy free detection while capping new free users", () => {
    expect(subscriptionStatusSource).toContain("LEGACY_FREE_ACCESS_CUTOFF");
    expect(subscriptionStatusSource).toContain("NEW_FREE_CARD_LIMIT = 1");
    expect(subscriptionStatusSource).toContain("LEGACY_FREE_CARD_LIMIT = -1");
    expect(subscriptionStatusSource).toContain("if (isLegacyFreeUser(user)) return LEGACY_FREE_CARD_LIMIT;");
  });

  test("keeps direct share settings paid while allowing paid share-link checkout for free users", () => {
    expect(cardShareRouteSource).toContain("hasShareSettingsAccess");
    expect(cardShareRouteSource).toContain("hasPremiumAccess(user) || isLegacyFreeUser(user)");
    expect(shareLinksGenerateRouteSource).toContain("Share links remain");
    expect(shareLinksGenerateRouteSource).not.toContain("hasPremiumAccess(userRecord) && !isLegacyFreeUser(userRecord)");
  });
});
