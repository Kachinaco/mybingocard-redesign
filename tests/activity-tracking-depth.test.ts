import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.MONGODB_URI ||= "mongodb://localhost:27017/mybingocard-test";
const { sanitizeActivityMetadata } = await import("../lib/activity");

const readSource = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const activityClientSource = readSource("lib/activity-client.ts");
const visitorTrackerSource = readSource("components/VisitorTracker.tsx");
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
    expect(((sanitized.items as Array<Record<string, unknown>>)[0]).session_cookie).toBe("[redacted]");
    expect(((sanitized.items as Array<Record<string, unknown>>)[0]).label).toBe("visible");
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
