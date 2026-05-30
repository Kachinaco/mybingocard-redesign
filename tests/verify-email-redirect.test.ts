import { describe, expect, test } from "bun:test";
import {
  buildPostVerificationLoginUrl,
  buildVerifyEmailErrorUrl,
  sanitizePostVerificationCallback,
} from "@/lib/auth/verify-email-redirect";

describe("sanitizePostVerificationCallback", () => {
  test("keeps safe internal callback paths", () => {
    expect(sanitizePostVerificationCallback("/dashboard?tab=cards")).toBe("/dashboard?tab=cards");
  });

  test("falls back to /create for external callback URLs", () => {
    expect(sanitizePostVerificationCallback("https://evil.example.com/phish")).toBe("/create");
  });

  test("falls back to /create for blank callback URLs", () => {
    expect(sanitizePostVerificationCallback("")).toBe("/create");
  });
});

describe("buildPostVerificationLoginUrl", () => {
  test("builds login redirect with verified flag, email, and preserved callback", () => {
    expect(
      buildPostVerificationLoginUrl({
        appUrl: "https://mybingocard.com",
        email: "newuser@example.com",
        callbackUrl: "/dashboard?tab=cards",
      })
    ).toBe(
      "https://mybingocard.com/login?verified=1&email=newuser%40example.com&callbackUrl=%2Fdashboard%3Ftab%3Dcards"
    );
  });
});

describe("buildVerifyEmailErrorUrl", () => {
  test("preserves email and callback for expired-token resend", () => {
    expect(
      buildVerifyEmailErrorUrl({
        appUrl: "https://mybingocard.com",
        error: "expired_token",
        email: "newuser@example.com",
        callbackUrl: "/dashboard?tab=cards",
      })
    ).toBe(
      "https://mybingocard.com/verify-email?error=expired_token&email=newuser%40example.com&callbackUrl=%2Fdashboard%3Ftab%3Dcards"
    );
  });

  test("sanitizes unsafe callbacks on error redirects", () => {
    expect(
      buildVerifyEmailErrorUrl({
        appUrl: "https://mybingocard.com",
        error: "missing_token",
        callbackUrl: "https://evil.example.com/phish",
      })
    ).toBe("https://mybingocard.com/verify-email?error=missing_token&callbackUrl=%2Fcreate");
  });
});
