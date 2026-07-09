import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const activityClientSource = readSource("lib/activity-client.ts");
const visitorTrackerSource = readSource("components/VisitorTracker.tsx");
const adminLayoutSource = readSource("app/admin/layout.tsx");
const adminVisitorsPageSource = readSource("app/admin/visitors/page.tsx");
const adminVisitorsClientSource = readSource("app/admin/visitors/AdminVisitorsClient.tsx");
const adminVisitorsDataSource = readSource("lib/admin-live-visitors.ts");

describe("anonymous visitor tracking", () => {
  test("client activity always includes anonymous and session identifiers", () => {
    expect(activityClientSource).toContain("anonymousId: options?.anonymousId || getAnonymousId()");
    expect(activityClientSource).toContain("sessionId: options?.sessionId || getClientSessionId()");
    expect(visitorTrackerSource).toContain('trackClientActivity("page_view"');
    expect(visitorTrackerSource).toContain('trackClientActivity("page_engagement"');
  });

  test("admin visitors page groups all identities including anonymous visitors", () => {
    expect(adminLayoutSource).toContain('label: "Visitors"');
    expect(adminLayoutSource).toContain('href: "/admin/visitors"');
    expect(adminVisitorsPageSource).toContain("getAdminVisitorsData");
    expect(adminVisitorsClientSource).toContain("anonymousVisitors24h");
    expect(adminVisitorsClientSource).toContain("visitorKey");
    expect(adminVisitorsClientSource).toContain("anonymousId");
    expect(adminVisitorsClientSource).toContain("Raw Visitor Data");
    expect(adminVisitorsClientSource).toContain("recentEvents");
    expect(adminVisitorsDataSource).toContain("fetchTrackerPayload");
    expect(adminVisitorsDataSource).toContain("getSqliteStore");
  });
});
