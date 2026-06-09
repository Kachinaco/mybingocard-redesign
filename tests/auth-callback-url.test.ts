import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sanitizeAuthCallbackUrl } from "@/lib/auth/callback-url";

const readSource = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("auth callback URL guardrails", () => {
  test("allows relative app paths", () => {
    expect(sanitizeAuthCallbackUrl("/dashboard")).toBe("/dashboard");
    expect(sanitizeAuthCallbackUrl("/create?checkout=save")).toBe("/create?checkout=save");
    expect(sanitizeAuthCallbackUrl("%2Fcards%3Fview%3Dmine")).toBe("/cards?view=mine");
  });

  test("blocks external and protocol-relative redirects", () => {
    for (const value of [
      "https://evil.example/",
      "http://evil.example/",
      "//evil.example/path",
      "%2F%2Fevil.example%2Fpath",
      "javascript:alert(1)",
      "data:text/html,hello",
    ]) {
      expect(sanitizeAuthCallbackUrl(value), value).toBe("/dashboard");
    }
  });

  test("uses a safe fallback only", () => {
    expect(sanitizeAuthCallbackUrl("https://evil.example/", "/create")).toBe("/create");
    expect(sanitizeAuthCallbackUrl("https://evil.example/", "https://also-evil.example/")).toBe("/dashboard");
  });

  test("client auth pages sanitize callbackUrl before redirects", () => {
    for (const path of [
      "app/login/page.tsx",
      "app/signup/page.tsx",
      "app/magic-link/page.tsx",
      "app/auth-error/page.tsx",
    ]) {
      const source = readSource(path);
      expect(source, path).toContain("sanitizeAuthCallbackUrl");
    }
  });
});
