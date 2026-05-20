import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("debugging and alerting guardrails", () => {
  const errorCaptureSource = readSource("components/ErrorCapture.tsx");
  const errorRouteSource = readSource("app/api/errors/client/route.ts");
  const activityClientSource = readSource("lib/activity-client.ts");
  const discordSource = readSource("lib/discord.ts");
  const adminLayoutSource = readSource("app/admin/layout.tsx");
  const adminErrorsPageSource = readSource("app/admin/errors/page.tsx");
  const appErrorSource = readSource("app/error.tsx");
  const nextConfigSource = readSource("next.config.ts");
  const instrumentationSource = readSource("instrumentation.ts");
  const adminVisitorsPageSource = readSource("app/admin/visitors/page.tsx");
  const adminVisitorsRouteSource = readSource("app/api/admin/visitors/route.ts");
  const errorMonitorSource = readSource("scripts/error-monitor.cjs");
  const errorReportSource = readSource("scripts/error-report.cjs");
  const sourceMapResolverSource = readSource("lib/source-map-resolver.ts");
  const createLayoutSource = readSource("app/create/layout.tsx");
  const createPageSource = readSource("app/create/page.tsx");
  const aiGenerateSource = readSource("components/AiGenerateSection.tsx");
  const proxySource = readSource("proxy.ts");
  const packageSource = readSource("package.json");

  test("client errors include build id, fingerprint, context, and breadcrumbs", () => {
    expect(errorCaptureSource).toContain("NEXT_PUBLIC_APP_BUILD_ID");
    expect(errorCaptureSource).toContain("createFingerprint");
    expect(errorCaptureSource).toContain("breadcrumbs.slice");
    expect(errorCaptureSource).toContain("getClientSessionId");
    expect(errorCaptureSource).toContain("getAnonymousId");
    expect(errorCaptureSource).toContain("getClientContext");
    expect(errorCaptureSource).toContain("window.__mbcAddBreadcrumb");
    expect(errorCaptureSource).toContain("window.addEventListener(\"click\"");
    expect(errorCaptureSource).toContain("window.addEventListener(\"submit\"");
  });

  test("activity tracking feeds breadcrumbs without blocking product flows", () => {
    expect(activityClientSource).toContain("__mbcAddBreadcrumb");
    expect(activityClientSource).toContain('type: "activity"');
    expect(activityClientSource).toContain("Breadcrumbs are diagnostic only");
  });

  test("server groups errors by fingerprint and alerts only on thresholds", () => {
    expect(errorRouteSource).toContain("error_fingerprints");
    expect(errorRouteSource).toContain("fingerprint");
    expect(errorRouteSource).toContain("ALERT_WINDOW_MS");
    expect(errorRouteSource).toContain("ALERT_COOLDOWN_MS");
    expect(errorRouteSource).toContain("lastAlertedAt");
    expect(errorRouteSource).toContain("notifyClientErrorCaptured");
    expect(errorRouteSource).toContain("notifyClientErrorSpike");
    expect(errorRouteSource).toContain("client_error_captured");
    expect(errorRouteSource).toContain("isCrawlerUserAgent");
    expect(errorRouteSource).toContain("maybeNotifyClientErrorCaptured");
    expect(errorRouteSource).toContain("CAPTURE_ALERT_COOLDOWN_MS");
    expect(errorRouteSource).toContain("recentSessions >= 2");
  });

  test("Discord and admin surfaces expose grouped error debugging", () => {
    expect(discordSource).toContain('type DiscordNotificationChannel = "signups" | "visitors" | "events" | "errors"');
    expect(discordSource).toContain("MYBINGOCARD_ERRORS_WEBHOOK_URL");
    expect(discordSource).toContain("notifyClientErrorCaptured");
    expect(discordSource).toContain("notifyClientErrorSpike");
    expect(discordSource).toContain("notifyServerErrorCaptured");
    expect(discordSource).toContain("MyBingoCard Error Captured");
    expect(discordSource).toContain("MyBingoCard Error Spike");
    expect(discordSource).toContain("MyBingoCard Server Error");
    expect(discordSource).toContain("}], \"errors\");");
    expect(adminLayoutSource).toContain('label: "Errors"');
    expect(adminLayoutSource).toContain("recentErrorGroups");
    expect(adminErrorsPageSource).toContain("Runtime Errors");
    expect(adminErrorsPageSource).toContain("latestBreadcrumbs");
    expect(adminErrorsPageSource).toContain("Selected Fingerprint");
    expect(adminErrorsPageSource).toContain("updateErrorFingerprintStatus");
    expect(adminErrorsPageSource).toContain("Open Visitor Timeline");
    expect(adminErrorsPageSource).toContain("Current Build Events");
    expect(adminErrorsPageSource).toContain("Since Deploy");
  });

  test("React route errors are reported through the same pipeline", () => {
    expect(appErrorSource).toContain("react_error_boundary");
    expect(appErrorSource).toContain("/api/errors/client");
    expect(appErrorSource).toContain("NEXT_PUBLIC_APP_BUILD_ID");
    expect(appErrorSource).toContain("__mbcGetBreadcrumbs");
  });

  test("build ids are stable per build without exposing public source maps", () => {
    expect(nextConfigSource).toContain("NEXT_PUBLIC_APP_BUILD_ID");
    expect(nextConfigSource).toContain("generateBuildId");
    expect(nextConfigSource).toContain("privateBrowserSourceMaps");
    expect(nextConfigSource).toContain("productionBrowserSourceMaps: privateBrowserSourceMaps");
    expect(proxySource).toContain('pathname.endsWith(".map")');
    expect(proxySource).toContain("Not found");
    expect(proxySource).toContain('"/((?!_next/image|uploads|favicon).*)"');
  });

  test("source maps are resolved server-side for stored error stacks", () => {
    expect(sourceMapResolverSource).toContain("@jridgewell/trace-mapping");
    expect(sourceMapResolverSource).toContain("originalPositionFor");
    expect(sourceMapResolverSource).toContain("sourceContentFor");
    expect(errorRouteSource).toContain("symbolicateStack");
    expect(errorRouteSource).toContain("const rawStack =");
    expect(errorRouteSource).toContain("symbolicateStack(rawStack)");
    expect(errorRouteSource).toContain("sanitizeStack(rawStack)");
    expect(errorRouteSource).toContain("(?<!:)\\b\\d{6,}\\b(?!:)");
    expect(errorRouteSource).toContain("symbolicatedStack");
    expect(errorRouteSource).toContain("sourceMappedFrames");
    expect(adminErrorsPageSource).toContain("latestSymbolicatedStack");
    expect(adminErrorsPageSource).toContain("Top source-mapped frame");
  });

  test("create editor opts out of browser translation on dynamic React surfaces", () => {
    expect(createLayoutSource).toContain('google: "notranslate"');
    expect(createPageSource).toContain('className="notranslate min-h-screen');
    expect(createPageSource).toContain('translate="no"');
    expect(aiGenerateSource).toContain('className="notranslate bg-white');
    expect(aiGenerateSource).toContain('translate="no"');
  });

  test("scheduled and on-demand scanners use structured error events", () => {
    expect(packageSource).toContain('"errors:recent": "node scripts/error-report.cjs"');
    expect(packageSource).toContain('"errors:monitor": "node scripts/error-monitor.cjs"');
    expect(errorMonitorSource).toContain("checkStructuredErrors");
    expect(errorMonitorSource).toContain('db.collection("error_events")');
    expect(errorMonitorSource).toContain("UNRESOLVED_STATUS_FILTER");
    expect(errorReportSource).toContain("MyBingoCard Error Incident Report");
    expect(errorReportSource).toContain("--route");
    expect(errorReportSource).toContain("--fingerprint");
    expect(errorReportSource).toContain("newSinceDeployGroups");
  });

  test("error events link back to filtered visitor timelines", () => {
    expect(adminErrorsPageSource).toContain("/admin/visitors?");
    expect(adminErrorsPageSource).toContain("visitorHref");
    expect(adminVisitorsPageSource).toContain("anonymousId");
    expect(adminVisitorsPageSource).toContain("sessionId");
    expect(adminVisitorsRouteSource).toContain("stringParam");
    expect(adminVisitorsRouteSource).toContain("visitorKey");
  });

  test("server runtime errors post to the Discord errors channel", () => {
    expect(instrumentationSource).toContain("onRequestError");
    expect(instrumentationSource).toContain("notifyServerErrorCaptured");
    expect(instrumentationSource).toContain("unhandledRejection");
    expect(instrumentationSource).toContain("uncaughtException");
    expect(instrumentationSource).toContain("next_request_error");
  });
});
