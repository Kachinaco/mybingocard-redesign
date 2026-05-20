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

  test("frontend explains the $0.50 minimum via 5-link floor", () => {
    expect(modalSource).toContain("Minimum 5 links ($0.50) due to Stripe checkout minimum.");
  });

  test("backend rejects share-link checkouts below Stripe minimum", () => {
    expect(routeSource).toContain("const MIN_SHARE_LINKS = 5;");
    expect(routeSource).toContain("count must be at least ${MIN_SHARE_LINKS}");
  });
});
