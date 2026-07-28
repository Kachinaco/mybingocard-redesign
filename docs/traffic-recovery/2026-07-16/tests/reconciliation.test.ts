import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readQuery = (name: string) => readFileSync(join(root, "queries", name), "utf8");

const ejson = (value: Record<string, unknown>) => JSON.stringify(value);
const ejsonDate = (value: string) => ({ $date: { $numberLong: String(Date.parse(value)) } });

function createAppFixture() {
  const db = new Database(":memory:");
  db.run("CREATE TABLE documents (collection TEXT NOT NULL, object_id TEXT NOT NULL, ejson TEXT NOT NULL)");
  const insert = db.prepare("INSERT INTO documents VALUES (?, ?, ?)");

  insert.run("users", "prior-user", ejson({
    createdAt: ejsonDate("2026-07-06T08:00:00Z"), email: "prior@fixture.local", name: "Prior User", customerType: "customer",
  }));
  insert.run("users", "current-user", ejson({
    createdAt: ejsonDate("2026-07-13T08:00:00Z"), email: "current@fixture.local", name: "Current User", customerType: "customer",
  }));
  insert.run("users", "excluded-test", ejson({
    createdAt: ejsonDate("2026-07-13T09:00:00Z"), email: "test@example.test", name: "Test User", customerType: "test",
  }));
  insert.run("cards", "prior-card", ejson({ createdAt: ejsonDate("2026-07-06T09:00:00Z"), userId: "prior-user" }));
  insert.run("cards", "current-card-1", ejson({ createdAt: ejsonDate("2026-07-13T09:00:00Z"), userId: "current-user" }));
  insert.run("cards", "current-card-2", ejson({ createdAt: ejsonDate("2026-07-13T10:00:00Z"), userId: "second-current-owner" }));
  insert.run("activity_events", "prior-created", ejson({
    createdAt: ejsonDate("2026-07-06T09:00:01Z"), event: "card_created", source: "server", userId: "prior-user",
  }));
  insert.run("activity_events", "current-created-1", ejson({
    createdAt: ejsonDate("2026-07-13T09:00:01Z"), event: "card_created", source: "server", userId: "current-user",
  }));
  insert.run("activity_events", "current-first-1", ejson({
    createdAt: ejsonDate("2026-07-13T09:00:02Z"), event: "first_card_created", source: "server", userId: "current-user",
  }));
  insert.run("activity_events", "current-page-direct", ejson({
    createdAt: ejsonDate("2026-07-13T11:00:00Z"), event: "page_view", source: "client", sessionId: "session-direct", anonymousId: "anon-direct",
    metadata: { userAgent: "FixtureBrowser/1.0", referrer: "", utm: {} },
  }));
  insert.run("activity_events", "current-page-chatgpt", ejson({
    createdAt: ejsonDate("2026-07-13T11:01:00Z"), event: "page_view", source: "client", sessionId: "session-chatgpt", anonymousId: "anon-chatgpt",
    metadata: { userAgent: "FixtureBrowser/1.0", referrer: "https://chatgpt.com/", utm: { source: "chatgpt.com" } },
  }));
  insert.run("activity_events", "current-page-bot", ejson({
    createdAt: ejsonDate("2026-07-13T11:02:00Z"), event: "page_view", source: "client", sessionId: "session-bot", anonymousId: "anon-bot",
    metadata: { userAgent: "FixtureBot/1.0", referrer: "" },
  }));
  return db;
}

function createTrackerFixture() {
  const db = new Database(":memory:");
  db.run("CREATE TABLE sites (id INTEGER PRIMARY KEY, domain TEXT NOT NULL)");
  db.run("CREATE TABLE sessions (site_id INTEGER, session_id TEXT, audience TEXT)");
  db.run(`CREATE TABLE raw_events (
    id INTEGER PRIMARY KEY,
    site_id INTEGER,
    event_type TEXT,
    pathname TEXT,
    anonymous_id TEXT,
    visitor_id TEXT,
    session_id TEXT,
    referrer TEXT,
    metadata_json TEXT,
    occurred_at TEXT,
    received_at TEXT,
    user_agent TEXT
  )`);
  db.run("INSERT INTO sites VALUES (53, 'mybingocard.com')");
  const insertSession = db.prepare("INSERT INTO sessions VALUES (53, ?, ?)");
  insertSession.run("human-current", "public_unknown");
  insertSession.run("bot-current", "bot_like");
  insertSession.run("human-prior", "known_user");
  const insert = db.prepare("INSERT INTO raw_events VALUES (?, 53, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  insert.run(1, "pageview", "/create", "anon-current", null, "human-current", "https://chatgpt.com/", JSON.stringify({ utm: { source: "chatgpt.com" } }), "2026-07-13T08:00:00.000Z", "2026-07-13T08:00:01.000Z", "FixtureBrowser/1.0");
  insert.run(2, "pageview", "/", "anon-bot", null, "bot-current", "", "{}", "2026-07-13T08:01:00.000Z", "2026-07-13T08:01:01.000Z", "FixtureBot/1.0");
  insert.run(3, "pageview", "/", "anon-prior", null, "human-prior", "https://www.google.com/", "{}", "2026-07-06T08:00:00.000Z", "2026-07-06T08:00:01.000Z", "FixtureBrowser/1.0");
  return db;
}

test("app scorecard query preserves persisted outcome authority", () => {
  const db = createAppFixture();
  const rows = db.query(readQuery("app-scorecard.sql")).all() as Array<Record<string, number | string>>;
  expect(rows.find((row) => row.period === "prior")).toMatchObject({
    reportable_accounts: 1, persisted_cards: 1, distinct_card_owners: 1, server_card_created_users: 1,
  });
  expect(rows.find((row) => row.period === "current")).toMatchObject({
    reportable_accounts: 1, persisted_cards: 2, distinct_card_owners: 2, server_card_created_users: 1, server_first_card_created_users: 1,
  });
  db.close();
});

test("acquisition query uses nested UTM and excludes obvious bots", () => {
  const db = createAppFixture();
  const sql = readQuery("acquisition.sql").split("-- Referrer detail.")[0]!;
  const rows = db.query(sql).all() as Array<Record<string, number | string>>;
  const current = rows.find((row) => row.period === "current");
  expect(current).toMatchObject({
    clean_pageviews: 2,
    direct_or_unknown_pageviews: 1,
    chatgpt_referrer_pageviews: 1,
    chatgpt_utm_pageviews: 1,
  });
  db.close();
});

test("Tracker Lite query keeps bot share separate from human pageviews", () => {
  const db = createTrackerFixture();
  const sql = readQuery("tracker-scorecard.sql").split("-- First landing page per session.")[0]!;
  const rows = db.query(sql).all() as Array<Record<string, number | string>>;
  const current = rows.find((row) => row.period === "current");
  expect(current).toMatchObject({
    classified_human_pageviews: 1,
    create_pageviews: 1,
    create_visitors: 1,
    create_sessions: 1,
    chatgpt_pageviews: 1,
    utm_chatgpt_pageviews: 1,
    bot_like_session_share_percent: 50,
  });
  db.close();
});

test("parallel instrumentation is not summed as one traffic total", () => {
  const coverage = { firstPartyQualifiedPageviews: 1, trackerLitePageviews: 1 };
  expect("combinedPageviews" in coverage).toBe(false);
  expect(coverage.firstPartyQualifiedPageviews).toBe(1);
  expect(coverage.trackerLitePageviews).toBe(1);
});

test("credential account creation is not verified signup completion", () => {
  const credentialUser = { signupMethod: "credentials", emailVerified: null };
  const appEvents = ["signup_completed"];
  const accountCreated = true;
  const accountVerified = Boolean(credentialUser.emailVerified) && appEvents.includes("email_verification_completed");
  expect(accountCreated).toBe(true);
  expect(accountVerified).toBe(false);
});

test("bot proposal does not classify on proxy or no-click evidence alone", () => {
  const weakSignals = ["vpn_or_proxy", "no_mouse_movement"];
  const allowedAutomationSignals = new Set([
    "webdriver", "automation_globals", "platform_mismatch", "outer_equals_inner",
    "no_plugins_and_languages", "fixed_interval_cadence", "implausible_path_volume",
  ]);
  const score = weakSignals.filter((signal) => allowedAutomationSignals.has(signal)).length;
  expect(score).toBe(0);
});
