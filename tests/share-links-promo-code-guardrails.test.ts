import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("share links free-access guardrails", () => {
  const routeSource = readFileSync(resolve(process.cwd(), "app/api/share-links/generate/route.ts"), "utf8");

  test("share links are generated directly without Stripe promo-code checkout", () => {
    expect(routeSource).toContain("PRICE_PER_LINK_CENTS = 0");
    expect(routeSource).toContain("bulkCreateSharedLinks");
    expect(routeSource).toContain("free: true");
    expect(routeSource).not.toContain("allow_promotion_codes");
    expect(routeSource).not.toContain("checkout.sessions.create");
  });
});
