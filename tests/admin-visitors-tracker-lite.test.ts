import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getAdminVisitorsData } from "@/lib/admin-live-visitors";
import { closeSqliteStoreForTests, setSqliteStoreForTests } from "@/lib/db/sqlite";
import { SqliteDocumentStore } from "@/lib/sqlite-document-store";

const cleanupCallbacks: Array<() => void> = [];

afterEach(() => {
  while (cleanupCallbacks.length > 0) cleanupCallbacks.pop()?.();
});

function createFixture() {
  const previousBackend = process.env.MYBINGOCARD_DB_BACKEND;
  const previousPath = process.env.MYBINGOCARD_SQLITE_PATH;
  const previousTrackerUrl = process.env.MYBINGOCARD_TRACKER_LIVE_URL;
  const previousFetch = globalThis.fetch;
  const dir = mkdtempSync(join(tmpdir(), "mybingocard-admin-visitors-"));
  const db = new Database(join(dir, "app.sqlite"));
  db.exec(`
    CREATE TABLE collections (name TEXT PRIMARY KEY, source_count INTEGER NOT NULL, exported_count INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE documents (collection TEXT NOT NULL, object_id TEXT NOT NULL, ejson TEXT NOT NULL, PRIMARY KEY (collection, object_id));
  `);
  setSqliteStoreForTests(new SqliteDocumentStore(db));
  process.env.MYBINGOCARD_TRACKER_LIVE_URL = "http://tracker.test/api/live/events";

  cleanupCallbacks.push(() => {
    closeSqliteStoreForTests();
    globalThis.fetch = previousFetch;
    if (previousBackend === undefined) delete process.env.MYBINGOCARD_DB_BACKEND;
    else process.env.MYBINGOCARD_DB_BACKEND = previousBackend;
    if (previousPath === undefined) delete process.env.MYBINGOCARD_SQLITE_PATH;
    else process.env.MYBINGOCARD_SQLITE_PATH = previousPath;
    if (previousTrackerUrl === undefined) delete process.env.MYBINGOCARD_TRACKER_LIVE_URL;
    else process.env.MYBINGOCARD_TRACKER_LIVE_URL = previousTrackerUrl;
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  return { store: new SqliteDocumentStore(db, { readonly: false }) };
}

describe("admin visitors Tracker Lite adapter", () => {
  test("uses Tracker Lite events and SQLite visitor profiles", async () => {
    const { store } = createFixture();
    const now = Date.now();
    store.insertOne("visitor_profiles", {
      anonymousId: "anon-1",
      domain: "mybingocard.com",
      name: "Profile User",
      email: "profile@example.com",
      myBingoCardUserId: "user-1",
    });

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.hostname).toBe("tracker.test");
      expect(url.searchParams.get("domain")).toBe("mybingocard.com");
      return new Response(
        JSON.stringify({
          siteSummary: { events: 2, sessions: 1 },
          knownVisitors: [
            {
              anonymousId: "anon-1",
              firstSeenAt: new Date(now - 15_000).toISOString(),
              lastSeenAt: new Date(now - 1_000).toISOString(),
              events: 2,
              pageviews: 1,
              lastPath: "/create",
              lastEventType: "click",
            },
          ],
          events: [
            {
              anonymousId: "anon-1",
              sessionId: "session-1",
              eventType: "pageview",
              pathname: "/create",
              receivedAt: new Date(now - 10_000).toISOString(),
            },
            {
              anonymousId: "anon-1",
              sessionId: "session-1",
              eventType: "click",
              pathname: "/create",
              receivedAt: new Date(now - 1_000).toISOString(),
            },
            {
              anonymousId: "bot-1",
              eventType: "pageview",
              pathname: "/",
              receivedAt: new Date(now - 500).toISOString(),
              isAuthProbe: true,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const data = await getAdminVisitorsData({ liveWindowMinutes: 5, periodHours: 24, limit: 100 });

    expect(data.stats.events24h).toBe(2);
    expect(data.stats.sessions24h).toBe(1);
    expect(data.visitors).toHaveLength(1);
    const visitor = data.visitors[0]!;
    expect(visitor).toMatchObject({
      anonymousId: "anon-1",
      visitorName: "Profile User",
      visitorEmail: "profile@example.com",
      myBingoCardUserId: "user-1",
      eventCount: 2,
      pageViews: 1,
      isActive: true,
      isEngaged: true,
    });
    expect(visitor.recentEvents.map((event) => event.event)).toEqual(["click", "pageview"]);
  });

  test("contains no legacy database-client dependency", () => {
    const source = readFileSync(join(process.cwd(), "lib/admin-live-visitors.ts"), "utf8");
    expect(source).toContain("fetchTrackerPayload");
    expect(source).toContain('getSqliteStore().findMany<VisitorProfile>("visitor_profiles"');
  });

  test("does not count a hidden recent visitor as active", async () => {
    createFixture();
    const now = Date.now();
    globalThis.fetch = (async (_input: RequestInfo | URL) =>
      new Response(
        JSON.stringify({
          siteSummary: { events: 1, sessions: 1 },
          events: [
            {
              anonymousId: "hidden-visitor",
              sessionId: "hidden-session",
              eventType: "pageview",
              pathname: "/create",
              receivedAt: new Date(now - 500).toISOString(),
              metadata: { visible: false },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )) as typeof fetch;

    const data = await getAdminVisitorsData({ liveWindowMinutes: 5 });

    expect(data.visitors[0]?.isActive).toBe(false);
    expect(data.stats.activeVisitors).toBe(0);
  });
});
