import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("service worker cache policy", () => {
  const swSource = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

  test("bumps the cache version to flush older stale caches", () => {
    expect(swSource).toContain('const CACHE_NAME = "mybingocard-v4";');
  });

  test("does not precache the home page shell", () => {
    expect(swSource).not.toContain('  "/",');
  });

  test("uses a network-first strategy for navigation requests", () => {
    expect(swSource).toContain("request.mode === \"navigate\"");
    expect(swSource).toContain("return response;");
  });

  test("does not runtime-cache deploy-sensitive app assets", () => {
    expect(swSource).toContain('url.pathname === "/sw.js"');
    expect(swSource).toContain('url.pathname.startsWith("/_next/")');
    expect(swSource).toContain('url.pathname.startsWith("/t/")');
  });
});
