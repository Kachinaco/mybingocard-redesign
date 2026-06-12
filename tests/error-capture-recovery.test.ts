import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("client error capture recovery", () => {
  const source = readFileSync(resolve(process.cwd(), "components/ErrorCapture.tsx"), "utf8");

  test("reloads once for stale Next static chunk failures", () => {
    expect(source).toContain("ChunkLoadError");
    expect(source).toContain("Failed to load chunk");
    expect(source).toContain("isNextStaticResource(src)");
    expect(source).toContain("recoverFromStaleBuild()");
    expect(source).toContain("window.location.reload()");
  });

  test("does not report analytics CDN misses as application errors", () => {
    expect(source).toContain("www\\.googletagmanager\\.com");
    expect(source).toContain("pagead2\\.googlesyndication\\.com");
    expect(source).toContain("connect\\.facebook\\.net");
    expect(source).toContain("www\\.facebook\\.com\\/tr");
    expect(source).toContain("isThirdPartyNoiseResource(src)");
  });

  test("only reports Stripe resource misses on checkout-relevant pages", () => {
    expect(source).toContain("isStripeResource(src)");
    expect(source).toContain("isCheckoutRelevantPath(window.location.pathname)");
    expect(source).toContain('!isCheckoutRelevantPath(window.location.pathname)');
  });
});
