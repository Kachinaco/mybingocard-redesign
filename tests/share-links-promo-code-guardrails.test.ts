import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("share links promo code guardrails", () => {
  const routeSource = readFileSync(resolve(process.cwd(), "app/api/share-links/generate/route.ts"), "utf8");

  test("share links checkout allows promotion codes", () => {
    expect(routeSource).toContain("allow_promotion_codes: true");
  });
});
