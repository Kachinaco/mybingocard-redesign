import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const subscriptionsSource = readFileSync(join(process.cwd(), "lib/db/subscriptions.ts"), "utf8");
const stripeConfigSource = readFileSync(join(process.cwd(), "lib/stripe/config.ts"), "utf8");
const subscriptionStatusSource = readFileSync(join(process.cwd(), "lib/subscription-status.ts"), "utf8");
const cardShareRouteSource = readFileSync(join(process.cwd(), "app/api/cards/[id]/share/route.ts"), "utf8");
const shareLinksGenerateRouteSource = readFileSync(join(process.cwd(), "app/api/share-links/generate/route.ts"), "utf8");

describe("free plan limits", () => {
  test("makes card saving unlimited in subscription helpers", () => {
    expect(subscriptionsSource).toContain("free: {");
    expect(subscriptionsSource).toContain("maxCards: -1");
    expect(subscriptionStatusSource).toContain("FREE_FOR_ALL_USERS = true");
    expect(subscriptionStatusSource).toContain("if (FREE_FOR_ALL_USERS) return true;");
  });

  test("makes exports, batches, sharing, and hosting available in plan config", () => {
    expect(stripeConfigSource).toContain('"Unlimited saved bingo cards"');
    expect(stripeConfigSource).toContain('"PDF and PNG export"');
    expect(stripeConfigSource).toContain('"Printable batches up to 500 cards"');
    expect(stripeConfigSource).toContain('"Share links, email sharing, and hosted bingo events"');
    expect(stripeConfigSource).toContain("maxBatchSize: 500");
    expect(stripeConfigSource).toContain("canExportPNG: true");
    expect(stripeConfigSource).toContain("canShuffleSharedCards: true");
  });

  test("keeps legacy free detection without reducing the new free allowance", () => {
    expect(subscriptionStatusSource).toContain("LEGACY_FREE_ACCESS_CUTOFF");
    expect(subscriptionStatusSource).toContain("NEW_FREE_CARD_LIMIT = -1");
    expect(subscriptionStatusSource).toContain("LEGACY_FREE_CARD_LIMIT = -1");
  });

  test("direct share settings and generated share links are free for signed-in users", () => {
    expect(cardShareRouteSource).toContain("hasPremiumAccess(user) || isLegacyFreeUser(user)");
    expect(cardShareRouteSource).toContain('trialRequired: false');
    expect(shareLinksGenerateRouteSource).toContain("PRICE_PER_LINK_CENTS = 0");
    expect(shareLinksGenerateRouteSource).toContain("bulkCreateSharedLinks");
    expect(shareLinksGenerateRouteSource).toContain("amountCents: 0");
    expect(shareLinksGenerateRouteSource).not.toContain("checkout.sessions.create");
  });
});
