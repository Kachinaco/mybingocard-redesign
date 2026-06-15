import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("share batch minimum checkout guardrails", () => {
  const modalSource = readFileSync(resolve(process.cwd(), "components/ShareBatchModal.tsx"), "utf8");
  const routeSource = readFileSync(resolve(process.cwd(), "app/api/share-links/generate/route.ts"), "utf8");

  test("frontend enforces at least 5 share links", () => {
    expect(modalSource).toContain("const MIN_SHARE_LINKS = 5;");
    expect(modalSource).toContain("if (Number.isNaN(value) || value < MIN_SHARE_LINKS) return MIN_SHARE_LINKS;");
  });

  test("frontend explains the free 5-link floor", () => {
    expect(modalSource).toContain("PRICE_PER_LINK_CENTS = 0");
    expect(modalSource).toContain("Free for up to ${MIN_SHARE_LINKS} links");
    expect(modalSource).not.toContain("Stripe checkout minimum");
  });

  test("backend rejects share-link batches below the 5-link floor", () => {
    expect(routeSource).toContain("const MIN_SHARE_LINKS = 5;");
    expect(routeSource).toContain("count must be at least ${MIN_SHARE_LINKS}");
    expect(routeSource).toContain("PRICE_PER_LINK_CENTS = 0");
  });
});
