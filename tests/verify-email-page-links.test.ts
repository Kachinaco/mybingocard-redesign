import { describe, expect, test } from "bun:test";
import {
  buildVerifyEmailPageUrl,
  buildVerifyEmailSigninHref,
} from "@/lib/auth/verify-email-page-links";

describe("buildVerifyEmailPageUrl", () => {
  test("includes email and callback params for follow-up sign-in", () => {
    expect(
      buildVerifyEmailPageUrl({
        email: "newuser@example.com",
        callbackUrl: "/dashboard?tab=cards",
      })
    ).toBe(
      "/verify-email?email=newuser%40example.com&callbackUrl=%2Fdashboard%3Ftab%3Dcards"
    );
  });
});

describe("buildVerifyEmailSigninHref", () => {
  test("builds login link with email and callback for already-verified users", () => {
    const params = new URLSearchParams({
      email: "newuser@example.com",
      callbackUrl: "/dashboard?tab=cards",
    });

    expect(buildVerifyEmailSigninHref(params)).toBe(
      "/login?email=newuser%40example.com&callbackUrl=%2Fdashboard%3Ftab%3Dcards"
    );
  });

  test("falls back to plain login when params are absent", () => {
    expect(buildVerifyEmailSigninHref(new URLSearchParams())).toBe("/login");
  });
});
