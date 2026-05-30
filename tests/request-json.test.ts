import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readJsonObject } from "@/lib/request-json";

function jsonRequest(body: string) {
  return new Request("https://mybingocard.com/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("readJsonObject", () => {
  test("returns parsed JSON objects", async () => {
    const result = await readJsonObject(jsonRequest('{"email":"test@example.com"}'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("test@example.com");
    }
  });

  test("rejects malformed JSON without throwing", async () => {
    const result = await readJsonObject(jsonRequest('{"email":'));

    expect(result).toEqual({ ok: false, error: "Invalid JSON body" });
  });

  test("rejects valid JSON that is not an object", async () => {
    const arrayResult = await readJsonObject(jsonRequest('["email"]'));
    const nullResult = await readJsonObject(jsonRequest("null"));

    expect(arrayResult).toEqual({ ok: false, error: "Invalid JSON body" });
    expect(nullResult).toEqual({ ok: false, error: "Invalid JSON body" });
  });
});

describe("public API JSON body guardrails", () => {
  const guardedRoutes = [
    "app/api/activity/route.ts",
    "app/api/auth/forgot-password/route.ts",
    "app/api/auth/magic-link/request/route.ts",
    "app/api/auth/reset-password/route.ts",
    "app/api/auth/signup/route.ts",
    "app/api/cards/share/[shareLink]/route.ts",
    "app/api/coupons/validate/route.ts",
    "app/api/email-capture/route.ts",
    "app/api/game/[roomCode]/join/route.ts",
    "app/api/game/[roomCode]/bingo/route.ts",
    "app/api/game-history/shared/route.ts",
    "app/api/generate-cells/route.ts",
    "app/api/stripe/guest-batch-checkout/route.ts",
    "app/api/templates/route.ts",
  ];

  for (const route of guardedRoutes) {
    test(`${route} parses request JSON through the shared guard`, () => {
      const source = readFileSync(join(process.cwd(), route), "utf8");

      expect(source).toContain('from "@/lib/request-json"');
      expect(source).toContain("readJsonObject(");
      expect(source).not.toMatch(/await\s+(?:request|req)\.json\(\)/);
    });
  }
});

describe("template API response guardrails", () => {
  test("community template payload uses the correctly spelled marker", () => {
    const source = readFileSync(join(process.cwd(), "app/api/templates/route.ts"), "utf8");

    expect(source).toContain("isCommunityCard: true");
    expect(source).not.toContain("isCommunitCard");
  });
});
