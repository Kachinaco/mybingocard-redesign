import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("native OAuth guardrails", () => {
  const loginSource = readFileSync(resolve(process.cwd(), "app/login/page.tsx"), "utf8");
  const signupSource = readFileSync(resolve(process.cwd(), "app/signup/page.tsx"), "utf8");
  const createSource = readFileSync(resolve(process.cwd(), "app/create/page.tsx"), "utf8");
  const authErrorSource = readFileSync(resolve(process.cwd(), "app/auth-error/page.tsx"), "utf8");
  const googleStartSource = readFileSync(resolve(process.cwd(), "app/api/native/oauth/google/start/route.ts"), "utf8");
  const googleCompleteSource = readFileSync(resolve(process.cwd(), "app/api/native/oauth/google/complete/route.ts"), "utf8");
  const appleCompleteSource = readFileSync(resolve(process.cwd(), "app/api/native/oauth/apple/complete/route.ts"), "utf8");
  const appleNativeSource = readFileSync(resolve(process.cwd(), "app/api/native/oauth/apple/native/route.ts"), "utf8");
  const exchangeSource = readFileSync(resolve(process.cwd(), "app/api/native/oauth/exchange/route.ts"), "utf8");
  const authNewUserSource = readFileSync(resolve(process.cwd(), "app/auth-new-user/route.ts"), "utf8");
  const proxySource = readFileSync(resolve(process.cwd(), "proxy.ts"), "utf8");

  test("login and signup route OAuth clicks through the native bridge inside the iOS app", () => {
    for (const source of [loginSource, signupSource, createSource, authErrorSource]) {
      expect(source).toContain("mybingocardOAuth");
      expect(source).toContain('searchParams.get("app")');
      expect(source).toContain('"mybingocard-ios-app"');
      expect(source).toContain('data-mybingocard-oauth-provider="google"');
      expect(source).toContain("/api/native/oauth/${provider}/start");
    }

    for (const source of [loginSource, signupSource, createSource]) {
      expect(source).toContain('data-mybingocard-oauth-provider="apple"');
    }
  });

  test("google native OAuth completes through a custom app handoff token", () => {
    expect(googleStartSource).toContain("/api/native/oauth/google/complete");
    expect(googleStartSource).toContain("NATIVE_OAUTH_PENDING_COOKIE");
    expect(googleStartSource).toContain("encodeNativeOAuthPending");
    expect(googleCompleteSource).toContain("mybingocard://oauth/google");
    expect(googleCompleteSource).toContain("createNativeOAuthHandoff");
    expect(appleCompleteSource).toContain("createNativeOAuthHandoff");
    expect(appleNativeSource).toContain("getUserByAuthAccount");
    expect(appleNativeSource).toContain("upsertAuthAccountForUser");
    expect(appleNativeSource).toContain("recordNativeOAuthLogin");
    expect(googleCompleteSource).toContain("response.cookies.delete(NATIVE_OAUTH_PENDING_COOKIE)");
    expect(exchangeSource).toContain("nativeOAuthCookieName");
    expect(exchangeSource).toContain("consumeNativeOAuthHandoff");
    expect(exchangeSource).toContain("response.cookies.set");

    for (const source of [googleCompleteSource, appleCompleteSource, appleNativeSource, exchangeSource]) {
      expect(source).not.toContain("clientPromise");
      expect(source).not.toContain(".collection(");
    }
  });

  test("native OAuth popup fallbacks are forced back to the native handoff route", () => {
    for (const source of [authNewUserSource, proxySource]) {
      expect(source).toContain("decodeNativeOAuthPending");
      expect(source).toContain("NATIVE_OAUTH_PENDING_COOKIE");
      expect(source).toContain("/api/native/oauth/${");
      expect(source).toContain("/complete?callbackUrl=");
    }
  });
});
