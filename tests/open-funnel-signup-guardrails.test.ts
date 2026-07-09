import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const readSource = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const sourceExtensions = new Set([".ts", ".tsx"]);

function collectSourceFiles(dir: string): string[] {
  const root = join(process.cwd(), dir);
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return collectSourceFiles(join(dir, entry));
    return sourceExtensions.has(path.slice(path.lastIndexOf("."))) ? [join(dir, entry)] : [];
  });
}

const directStorageAccess = /\b(?:window\.)?(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem|key|length)\b/;

describe("open-funnel signup guardrails", () => {
  const activityClientSource = readSource("lib/activity-client.ts");
  const visitorTrackerSource = readSource("components/VisitorTracker.tsx");
  const sessionStoreSource = readSource("lib/session-store.ts");
  const signupPageSource = readSource("app/signup/page.tsx");
  const loginPageSource = readSource("app/login/page.tsx");
  const authErrorPageSource = readSource("app/auth-error/page.tsx");
  const createPageSource = readSource("app/create/page.tsx");
  const errorCaptureSource = readSource("components/ErrorCapture.tsx");
  const imagePickerSource = readSource("components/ImagePickerModal.tsx");
  const namePromptSource = readSource("components/NamePromptModal.tsx");
  const upgradeModalSource = readSource("components/UpgradeModal.tsx");
  const providersSource = readSource("components/Providers.tsx");
  const utmFlusherSource = readSource("components/UtmFlusher.tsx");
  const signupRouteSource = readSource("app/api/auth/signup/route.ts");
  const signupAbuseSource = readSource("lib/signup-abuse.ts");
  const emailCaptureRouteSource = readSource("app/api/email-capture/route.ts");
  const emailCaptureSource = readSource("components/EmailCapture.tsx");
  const honeypotSource = readSource("lib/honeypot.ts");
  const proxySource = readSource("proxy.ts");

  test("critical signup and tracking paths use safe storage wrappers", () => {
    for (const source of [
      activityClientSource,
      visitorTrackerSource,
      sessionStoreSource,
      signupPageSource,
      loginPageSource,
      authErrorPageSource,
      createPageSource,
      errorCaptureSource,
      imagePickerSource,
      namePromptSource,
      providersSource,
      utmFlusherSource,
      upgradeModalSource,
    ]) {
      expect(source).toContain("BrowserStorage");
      expect(source).not.toMatch(directStorageAccess);
    }
  });

  test("app code does not reintroduce raw browser storage calls", () => {
    for (const path of [
      ...collectSourceFiles("app"),
      ...collectSourceFiles("components"),
      ...collectSourceFiles("lib"),
    ]) {
      expect(readSource(path), path).not.toMatch(directStorageAccess);
    }
  });

  test("activity tracking cannot throw before product flows continue", () => {
    expect(activityClientSource).toContain("memorySessionId");
    expect(activityClientSource).toContain("memoryAnonymousId");
    expect(activityClientSource).toContain("buildClientActivityPayload(event, metadata, options)");
    expect(activityClientSource).toContain("Activity tracking should never block product flows");
  });

  test("signup and email capture use narrow browser trap fields", () => {
    expect(signupPageSource).toContain("signupCompanyRef");
    expect(signupPageSource).toContain('name="companyName"');
    expect(signupPageSource).toContain("signupStartedAt");
    expect(emailCaptureSource).toContain("popupCompanyRef");
    expect(emailCaptureSource).toContain("inlineCompanyRef");
    expect(emailCaptureSource).toContain("captureStartedAt");
    expect(signupPageSource).not.toContain('name="website"');
  });

  test("server-side signup does not keep broad bot-name or fake-success rejectors", () => {
    expect(signupRouteSource).not.toContain("nameLooksLikeBot");
    expect(signupRouteSource).not.toContain("MBC_SIGNUP_IP_HOURLY_LIMIT");
    expect(signupRouteSource).not.toContain('user: { id: "bot"');
    expect(signupRouteSource).not.toContain("Silently accept");
    expect(signupRouteSource).toContain('event: "signup_honeypot_blocked"');
    expect(emailCaptureRouteSource).toContain('event: "email_capture_honeypot_blocked"');
    expect(honeypotSource).toContain("filled_hidden_field");
    expect(honeypotSource).toContain("submitted_too_fast");
  });

  test("server-side signup throttles before user creation or email delivery", () => {
    const rateLimitIndex = signupRouteSource.indexOf("const signupLimit = await checkSignupAbuseLimit");
    const createUserIndex = signupRouteSource.indexOf("const user = await createUser");
    const verificationEmailIndex = signupRouteSource.indexOf("sendEmailVerificationEmail(email");

    expect(signupRouteSource).toContain('from "@/lib/signup-abuse"');
    expect(signupRouteSource).toContain('event: "signup_rate_limit_blocked"');
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(createUserIndex).toBeGreaterThan(rateLimitIndex);
    expect(verificationEmailIndex).toBeGreaterThan(rateLimitIndex);
    expect(signupAbuseSource).toContain('getSqliteStore().count("signup_attempts"');
    expect(signupAbuseSource).toContain('getSqliteStore().insertOne("signup_attempts"');
    expect(signupAbuseSource).toContain("MBC_SIGNUP_RATE_SHORT_MAX");
  });

  test("server-side capture and signup support precise identity blocks", () => {
    expect(signupRouteSource).toContain("findActiveSignupBlock(blockFilters)");
    expect(signupRouteSource).toContain('event: "signup_blocked"');
    expect(signupRouteSource).toContain('return NextResponse.json({ error: "Unable to create account" }, { status: 403 });');
    expect(emailCaptureRouteSource).toContain("findActiveSignupBlock(blockFilters)");
    expect(emailCaptureRouteSource).toContain('event: "email_capture_blocked"');
    expect(emailCaptureRouteSource).toContain('return NextResponse.json({ success: true');
  });

  test("public server action probes are rejected without re-enabling broad action blocking", () => {
    expect(proxySource).toContain("MBC_BLOCK_MALFORMED_SERVER_ACTION");
    expect(proxySource).toContain("&& BLOCK_MALFORMED_SERVER_ACTION");
    expect(proxySource).toContain('headers.delete("next-action")');
    expect(proxySource).toContain("strippedMalformedServerAction");
    expect(proxySource).toContain('SERVER_ACTION_PATHS = ["/admin/errors"]');
    expect(proxySource).toContain("function isUnsupportedServerActionRequest");
    expect(proxySource).toContain("!isSupportedServerActionPath(req.nextUrl.pathname)");
  });

  test("public proxy requests do not invoke Auth.js unless auth is needed", () => {
    expect(proxySource).toContain("const authenticatedProxy = auth(");
    expect(proxySource).toContain("function shouldRunAuth");
    expect(proxySource).toContain('"/cards"');
    expect(proxySource).toContain("return authenticatedProxy(req, event);");
    expect(proxySource).not.toContain("export default auth(");
  });
});
