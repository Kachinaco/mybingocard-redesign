import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const trackClickSource = readFileSync(
  join(process.cwd(), "app/api/track/click/route.ts"),
  "utf8"
);
const referralRedirectSource = readFileSync(
  join(process.cwd(), "app/r/[code]/route.ts"),
  "utf8"
);

describe("public redirect origin guardrails", () => {
  test("tracking redirects fall back to the configured public app URL", () => {
    expect(trackClickSource).toContain("const APP_URL =");
    expect(trackClickSource).toContain("const FALLBACK_URL");
    expect(trackClickSource).toContain("NextResponse.redirect(FALLBACK_URL)");
    expect(trackClickSource).not.toContain('new URL("/", req.url)');
  });

  test("referral redirects do not use internal request URLs behind the proxy", () => {
    expect(referralRedirectSource).toContain("const APP_URL =");
    expect(referralRedirectSource).toContain('new URL("/signup", APP_URL)');
    expect(referralRedirectSource).not.toContain('new URL("/", request.url)');
  });
});
