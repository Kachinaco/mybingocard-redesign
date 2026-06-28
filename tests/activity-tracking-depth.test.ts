import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.MONGODB_URI ||= "mongodb://localhost:27017/mybingocard-test";
const { sanitizeActivityMetadata, shouldSuppressNoisyGameActivity } = await import("../lib/activity");

const readSource = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const activityClientSource = readSource("lib/activity-client.ts");
const visitorTrackerSource = readSource("components/VisitorTracker.tsx");
const activityRouteSource = readSource("app/api/activity/route.ts");
const trackVisitorRouteSource = readSource("app/api/track-visitor/route.ts");
const adminUserRouteSource = readSource("app/api/admin/users/[id]/route.ts");
const adminUserPageSource = readSource("app/admin/users/[id]/page.tsx");

describe("activity tracking depth", () => {
  test("client activity payloads include detailed browser and device context", () => {
    expect(activityClientSource).toContain("client_context");
    expect(activityClientSource).toContain("devicePixelRatio");
    expect(activityClientSource).toContain("timezoneOffsetMinutes");
    expect(activityClientSource).toContain("hardwareConcurrency");
    expect(activityClientSource).toContain("connection");
    expect(activityClientSource).toContain("visibilityState");
  });

  test("form analytics track field lifecycle without storing typed values", () => {
    expect(visitorTrackerSource).toContain("form_field_focused");
    expect(visitorTrackerSource).toContain("form_field_changed");
    expect(visitorTrackerSource).toContain("form_field_blurred");
    expect(visitorTrackerSource).toContain("value_length");
    expect(visitorTrackerSource).not.toContain("value: el.value");
  });

  test("visitor tracking sends non-fingerprinting bot signals for human classification", () => {
    expect(visitorTrackerSource).toContain("botSignals");
    expect(visitorTrackerSource).toContain("getBotSignals");
    expect(visitorTrackerSource).toContain("webdriver");
    expect(visitorTrackerSource).toContain("automationGlobals");
    expect(visitorTrackerSource).toContain("platformMismatch");
    expect(visitorTrackerSource).toContain("outerEqualsInner");
    expect(visitorTrackerSource).toContain("mouseMovements");
    expect(visitorTrackerSource).toContain("hasClicks");
    expect(visitorTrackerSource).toContain("hasScroll");
    expect(visitorTrackerSource).toContain("timeToFirstInteraction");
  });

  test("visitor engagement heartbeats are throttled so stale tabs do not flood activity logs", () => {
    expect(visitorTrackerSource).toContain("HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000");
    expect(visitorTrackerSource).toContain("STALE_HEARTBEAT_INTERVAL_MS = 15 * 60 * 1000");
    expect(visitorTrackerSource).toContain('document.visibilityState === "hidden"');
    expect(visitorTrackerSource).toContain("now - lastStaleHeartbeatAt < STALE_HEARTBEAT_INTERVAL_MS");
  });

  test("visitor tracking avoids fingerprint probes", () => {
    expect(visitorTrackerSource).not.toContain("getImageData");
    expect(visitorTrackerSource).not.toContain("WEBGL_debug_renderer_info");
    expect(visitorTrackerSource).not.toContain("getContext(\"webgl");
    expect(visitorTrackerSource).not.toContain("getContext('webgl");
  });

  test("activity metadata sanitizer redacts sensitive keys recursively", () => {
    const sanitized = sanitizeActivityMetadata({
      password: "secret",
      nested: {
        apiToken: "token",
        ok: "kept",
      },
      items: [{ session_cookie: "cookie", label: "visible" }],
    });

    expect(sanitized.password).toBe("[redacted]");
    expect((sanitized.nested as Record<string, unknown>).apiToken).toBe("[redacted]");
    expect((sanitized.nested as Record<string, unknown>).ok).toBe("kept");
    const firstItem = (sanitized.items as Array<Record<string, unknown>>)[0];
    expect(firstItem?.session_cookie).toBe("[redacted]");
    expect(firstItem?.label).toBe("visible");
  });

  test("live game telemetry is suppressed before it floods activity and visitor logs", () => {
    expect(shouldSuppressNoisyGameActivity({
      event: "game_player_cell_marked",
      pathname: "/game/play/KPVCT2",
      metadata: { roomCode: "KPVCT2" },
    })).toBe(true);
    expect(shouldSuppressNoisyGameActivity({
      event: "game_player_joined",
      pathname: "/game/play/KPVCT2",
      metadata: { roomCode: "KPVCT2" },
    })).toBe(false);
    expect(activityRouteSource).toContain("shouldSuppressNoisyGameActivity");
    expect(activityRouteSource).toContain("suppressed: true");
    expect(trackVisitorRouteSource).toContain("isGamePageVisitorPayload");
    expect(trackVisitorRouteSource).toContain("suppressed: true");
  });

  test("admin user activity feed exposes deep event details for inspection", () => {
    expect(adminUserRouteSource).toContain(".limit(100)");
    expect(adminUserRouteSource).toContain("sessionId: 1");
    expect(adminUserRouteSource).toContain("anonymousId: 1");
    expect(adminUserRouteSource).toContain("ipAddress: 1");
    expect(adminUserRouteSource).toContain("userAgent: 1");
    expect(adminUserPageSource).toContain("Raw event data");
    expect(adminUserPageSource).toContain("JSON.stringify(details, null, 2)");
  });
});
