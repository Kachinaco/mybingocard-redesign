#!/usr/bin/env node

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const SQLite = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const { EJSON, ObjectId } = require("bson");

const ROOT = path.resolve(__dirname, "..");
const PASSWORD = "SqliteSmokePassword123!";
const BASE_DB_ENV = "SQLITE_RUNTIME_SMOKE_BASE_DB";
const ALT_BASE_DB_ENV = "MYBINGOCARD_SQLITE_SMOKE_BASE_DB";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function inspectShadowDatabase(db) {
  const integrity = db.pragma("integrity_check", { simple: true });
  const rows = db
    .prepare("SELECT name, source_count, exported_count FROM collections ORDER BY name")
    .all();
  const documentCount = Number(db.prepare("SELECT COUNT(*) AS count FROM documents").get().count || 0);
  const collectionCounts = Object.fromEntries(
    rows.map((row) => [row.name, Number(row.exported_count || 0)])
  );

  return {
    integrity,
    documentCount,
    collectionCount: rows.length,
    collectionCounts: {
      activity_events: collectionCounts.activity_events || 0,
      cards: collectionCounts.cards || 0,
      users: collectionCounts.users || 0,
      support_tickets: collectionCounts.support_tickets || 0,
      subscriptions: collectionCounts.subscriptions || 0,
    },
  };
}

function createFixture() {
  const sourceDbPath = process.env[BASE_DB_ENV] || process.env[ALT_BASE_DB_ENV] || "";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mybingocard-sqlite-runtime-"));
  const dbPath = path.join(dir, "shadow.sqlite");

  if (sourceDbPath) {
    assert(fs.existsSync(sourceDbPath), `${BASE_DB_ENV} does not exist: ${sourceDbPath}`);
    fs.copyFileSync(sourceDbPath, dbPath);
  }

  const db = new SQLite(dbPath);
  let sourceStats = null;

  if (sourceDbPath) {
    sourceStats = inspectShadowDatabase(db);
    assert(sourceStats.integrity === "ok", `source SQLite integrity_check returned ${sourceStats.integrity}`);
    assert(sourceStats.documentCount > 100_000, `source SQLite is not production-scale: ${sourceStats.documentCount} documents`);
    assert(sourceStats.collectionCounts.activity_events > 100_000, "source SQLite activity_events count is not production-scale");
    assert(sourceStats.collectionCounts.cards > 1_000, "source SQLite cards count is not production-scale");
    assert(sourceStats.collectionCounts.users > 100, "source SQLite users count is not production-scale");
  } else {
    db.exec(`
      CREATE TABLE collections (
        name TEXT PRIMARY KEY,
        source_count INTEGER NOT NULL,
        exported_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE documents (
        collection TEXT NOT NULL,
        object_id TEXT NOT NULL,
        ejson TEXT NOT NULL,
        PRIMARY KEY (collection, object_id),
        FOREIGN KEY (collection) REFERENCES collections(name) ON DELETE CASCADE
      );

      CREATE INDEX documents_collection_idx ON documents(collection);
    `);
  }

  const insertCollection = db.prepare(
    "INSERT INTO collections (name, source_count, exported_count) VALUES (?, 0, 0) ON CONFLICT(name) DO NOTHING"
  );
  const insertDocument = db.prepare(
    `INSERT INTO documents (collection, object_id, ejson)
     VALUES (?, ?, ?)
     ON CONFLICT(collection, object_id) DO UPDATE SET ejson = excluded.ejson`
  );
  const updateCollectionCount = db.prepare(
    `UPDATE collections
     SET exported_count = (SELECT COUNT(*) FROM documents WHERE collection = ?)
     WHERE name = ?`
  );

  function insert(collection, document) {
    insertCollection.run(collection);
    insertDocument.run(collection, String(document._id), EJSON.stringify(document, { relaxed: false }));
    updateCollectionCount.run(collection, collection);
  }

  const now = new Date("2026-07-03T08:00:00.000Z");
  const userId = new ObjectId("64f00000000000000000aa01");
  const templateId = new ObjectId("64f00000000000000000aa02");
  const couponId = new ObjectId("64f00000000000000000aa03");
  const cardId = new ObjectId("64f00000000000000000aa04");

  insert("users", {
    _id: userId,
    name: "SQLite Smoke User",
    email: "sqlite-smoke-user@example.com",
    password: bcrypt.hashSync(PASSWORD, 8),
    emailVerified: now,
    planType: "FREE",
    loginCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  insert("templates", {
    _id: templateId,
    title: "SQLite Runtime Smoke Template",
    description: "Runtime smoke seeded template",
    category: "sqlite-smoke",
    tags: ["sqlite", "smoke", "runtime"],
    size: 5,
    cells: Array.from({ length: 24 }, (_, index) => `Smoke ${index + 1}`),
    freeSpace: true,
    style: {
      backgroundColor: "#ffffff",
      textColor: "#111827",
      borderColor: "#4b5563",
      fontSize: "16px",
      fontFamily: "Inter",
    },
    isPremium: false,
    isFeatured: true,
    uses: 3,
    createdAt: now,
    updatedAt: now,
  });

  insert("coupons", {
    _id: couponId,
    code: "SMOKE20",
    discountPercent: 20,
    maxUses: 10,
    usedCount: 0,
    active: true,
    stripePromotionCodeId: "promo_sqlite_smoke",
    stripeCouponId: "coupon_sqlite_smoke",
    createdAt: now,
  });

  insert("cards", {
    _id: cardId,
    userId: userId.toString(),
    title: "SQLite Runtime Shared Card",
    description: "Public shared card for SQLite runtime smoke",
    size: 3,
    cells: ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"],
    freeSpace: false,
    style: {
      backgroundColor: "#ffffff",
      textColor: "#111827",
      borderColor: "#111827",
      fontSize: "16px",
      fontFamily: "Inter",
    },
    isPublic: true,
    shareLink: "sqlite-runtime-smoke",
    sharePassword: null,
    shareExpiresAt: null,
    views: 0,
    createdAt: now,
    updatedAt: now,
  });

  db.close();
  return {
    dir,
    dbPath,
    sourceDbPath: sourceDbPath || null,
    sourceStats,
    ids: { templateId: templateId.toString(), cardId: cardId.toString(), userId: userId.toString() },
  };
}

function parseSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const value = headers.get("set-cookie");
  if (!value) return [];
  return value.split(/,(?=\s*[^;,=\s]+=[^;,]+)/g);
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  store(headers) {
    for (const cookie of parseSetCookies(headers)) {
      const pair = cookie.split(";")[0];
      const equalsIndex = pair.indexOf("=");
      if (equalsIndex <= 0) continue;
      this.cookies.set(pair.slice(0, equalsIndex), pair.slice(equalsIndex + 1));
    }
  }

  header() {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
  }
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 45_000;
  let lastError = null;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next server exited early with code ${child.exitCode}`);
    }

    try {
      const response = await fetch(`${baseUrl}/`, { redirect: "manual" });
      if (response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Next server did not become ready: ${lastError?.message || "timeout"}`);
}

async function request(baseUrl, pathname, options = {}, jar) {
  const headers = new Headers(options.headers || {});
  if (jar && jar.header()) {
    headers.set("cookie", jar.header());
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
    redirect: options.redirect || "manual",
  });

  if (jar) {
    jar.store(response.headers);
  }

  return response;
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON, got status ${response.status}: ${text.slice(0, 300)}`);
  }
}

function readCollection(dbPath, collection) {
  const db = new SQLite(dbPath, { readonly: true });
  try {
    return db
      .prepare("SELECT ejson FROM documents WHERE collection = ? ORDER BY rowid ASC")
      .all(collection)
      .map((row) => EJSON.parse(row.ejson, { relaxed: false }));
  } finally {
    db.close();
  }
}

function findOne(dbPath, collection, predicate) {
  return readCollection(dbPath, collection).find(predicate) || null;
}

function findOneLike(dbPath, collection, likePattern, predicate) {
  const db = new SQLite(dbPath, { readonly: true });
  try {
    const rows = db
      .prepare("SELECT ejson FROM documents WHERE collection = ? AND ejson LIKE ? ORDER BY rowid DESC LIMIT 1000")
      .all(collection, likePattern);
    for (const row of rows) {
      const document = EJSON.parse(row.ejson, { relaxed: false });
      if (predicate(document)) return document;
    }
    return null;
  } finally {
    db.close();
  }
}

function activityEventMatches(dbPath, event, predicate) {
  return Boolean(
    findOneLike(
      dbPath,
      "activity_events",
      `%"event":"${event}"%`,
      (row) => row.event === event && predicate(row)
    )
  );
}

function numeric(value) {
  return Number(value ?? 0);
}

async function run() {
  const startMs = Date.now();
  const buildId = path.join(ROOT, ".next", "BUILD_ID");
  assert(fs.existsSync(buildId), "Missing .next build. Run npm run build before sqlite-runtime-smoke.");

  const fixture = createFixture();
  const port = Number(process.env.SQLITE_RUNTIME_SMOKE_PORT || await getFreePort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const nextBin = path.join(ROOT, "node_modules", ".bin", "next");
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    NEXT_PUBLIC_APP_URL: baseUrl,
    NEXTAUTH_URL: baseUrl,
    AUTH_URL: baseUrl,
    NEXTAUTH_SECRET: "sqlite-runtime-smoke-nextauth-secret",
    AUTH_SECRET: "sqlite-runtime-smoke-nextauth-secret",
    AUTH_TRUST_HOST: "true",
    AUTH_GOOGLE_ID: "sqlite-runtime-smoke-google-id",
    AUTH_GOOGLE_SECRET: "sqlite-runtime-smoke-google-secret",
    AUTH_APPLE_ID: "",
    AUTH_APPLE_SECRET: "",
    MONGODB_URI: "mongodb://127.0.0.1:1/mybingocard-sqlite-runtime-smoke",
    MYBINGOCARD_DB_BACKEND: "sqlite",
    MYBINGOCARD_SQLITE_PATH: fixture.dbPath,
    STRIPE_SECRET_KEY: "sk_test_sqlite_runtime_smoke",
    STRIPE_WEBHOOK_SECRET: "whsec_sqlite_runtime_smoke",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_sqlite_runtime_smoke",
    EMAIL_FROM: "support@mybingocard.com",
    EMAIL_SERVER_HOST: "",
    EMAIL_SERVER_PORT: "",
    EMAIL_SERVER_USER: "",
    EMAIL_SERVER_PASSWORD: "",
    DISCORD_WEBHOOK_URL: "",
    MYBINGOCARD_EVENTS_WEBHOOK_URL: "",
    MYBINGOCARD_SIGNUPS_WEBHOOK_URL: "",
    MYBINGOCARD_VISITORS_WEBHOOK_URL: "",
    MYBINGOCARD_ERRORS_WEBHOOK_URL: "",
    META_PIXEL_ID: "",
    NEXT_PUBLIC_META_PIXEL_ID: "",
    META_CONVERSIONS_ACCESS_TOKEN: "",
  };

  const child = spawn(nextBin, ["start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverOutput = "";
  child.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  try {
    await waitForServer(baseUrl, child);

    const templatesResponse = await request(baseUrl, "/api/templates?category=sqlite-smoke&limit=5");
    assert(templatesResponse.status === 200, `templates GET returned ${templatesResponse.status}`);
    const templatesBody = await readJson(templatesResponse);
    assert(
      Array.isArray(templatesBody.templates) && templatesBody.templates.some((template) => template._id === fixture.ids.templateId),
      "templates GET did not return seeded SQLite template"
    );

    const templateUseResponse = await request(baseUrl, "/api/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        templateId: fixture.ids.templateId,
        templateTitle: "SQLite Runtime Smoke Template",
        templateCategory: "sqlite-smoke",
      }),
    });
    assert(templateUseResponse.status === 200, `templates POST returned ${templateUseResponse.status}`);

    const captureEmail = `sqlite-runtime-${Date.now()}@example.com`;
    const emailCaptureResponse = await request(baseUrl, "/api/email-capture", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
        "user-agent": "sqlite-runtime-smoke",
      },
      body: JSON.stringify({
        email: captureEmail,
        source: "sqlite-runtime-smoke",
        companyName: "",
        captureStartedAt: Date.now() - 2000,
      }),
    });
    assert(emailCaptureResponse.status === 200, `email capture returned ${emailCaptureResponse.status}`);
    assert((await readJson(emailCaptureResponse)).success === true, "email capture did not report success");

    const couponResponse = await request(baseUrl, "/api/coupons/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "SMOKE20" }),
    });
    assert(couponResponse.status === 200, `coupon validate returned ${couponResponse.status}`);
    assert((await readJson(couponResponse)).valid === true, "coupon validate did not return valid=true");

    const openResponse = await request(
      baseUrl,
      `/api/track/open?e=${encodeURIComponent(captureEmail)}&c=sqlite-runtime&mid=sqlite-runtime-message`
    );
    assert(openResponse.status === 200, `track/open returned ${openResponse.status}`);
    assert((openResponse.headers.get("content-type") || "").includes("image/png"), "track/open did not return PNG");

    const clickResponse = await request(
      baseUrl,
      `/api/track/click?e=${encodeURIComponent(captureEmail)}&c=sqlite-runtime&mid=sqlite-runtime-message&u=${encodeURIComponent("https://mybingocard.com/create")}&l=main`
    );
    assert([302, 307, 308].includes(clickResponse.status), `track/click returned ${clickResponse.status}`);
    assert(
      (clickResponse.headers.get("location") || "").startsWith("https://mybingocard.com/create"),
      "track/click did not redirect to allowed target"
    );

    const sharedCardResponse = await request(baseUrl, "/api/cards/share/sqlite-runtime-smoke", {
      headers: { "user-agent": "sqlite-runtime-smoke" },
    });
    assert(sharedCardResponse.status === 200, `shared card GET returned ${sharedCardResponse.status}`);
    assert((await readJson(sharedCardResponse)).card?.title === "SQLite Runtime Shared Card", "shared card title mismatch");

    const providersResponse = await request(baseUrl, "/api/auth/providers");
    assert(providersResponse.status === 200, `auth providers returned ${providersResponse.status}`);
    const providers = await readJson(providersResponse);
    assert(providers.google?.signinUrl, "Google provider was not exposed by Auth.js");
    assert(providers.credentials?.signinUrl, "Credentials provider was not exposed by Auth.js");

    const nativeOAuthResponse = await request(baseUrl, "/api/native/oauth/google/complete?callbackUrl=/dashboard");
    assert([302, 307, 308].includes(nativeOAuthResponse.status), `native OAuth complete returned ${nativeOAuthResponse.status}`);
    assert((nativeOAuthResponse.headers.get("location") || "").includes("/login"), "native OAuth unauth redirect did not target login");

    const jar = new CookieJar();
    const csrfResponse = await request(baseUrl, "/api/auth/csrf", {}, jar);
    assert(csrfResponse.status === 200, `auth csrf returned ${csrfResponse.status}`);
    const csrf = await readJson(csrfResponse);
    assert(csrf.csrfToken, "missing csrfToken");

    const form = new URLSearchParams({
      csrfToken: csrf.csrfToken,
      email: "sqlite-smoke-user@example.com",
      password: PASSWORD,
      callbackUrl: `${baseUrl}/dashboard`,
      json: "true",
    });
    const credentialsResponse = await request(baseUrl, "/api/auth/callback/credentials?redirect=false", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    }, jar);
    assert(
      [200, 302, 303, 307].includes(credentialsResponse.status),
      `credentials callback returned ${credentialsResponse.status}: ${(await credentialsResponse.text()).slice(0, 300)}`
    );

    const sessionResponse = await request(baseUrl, "/api/auth/session", {}, jar);
    assert(sessionResponse.status === 200, `auth session returned ${sessionResponse.status}`);
    const session = await readJson(sessionResponse);
    assert(session.user?.email === "sqlite-smoke-user@example.com", "credentials sign-in did not produce SQLite-backed session");

    const capturedSubscriber = findOne(fixture.dbPath, "email_subscribers", (row) => row.email === captureEmail);
    assert(capturedSubscriber, "email capture did not write email_subscribers");
    const template = findOne(fixture.dbPath, "templates", (row) => String(row._id) === fixture.ids.templateId);
    assert(numeric(template?.uses) === 4, `template uses expected 4, got ${template?.uses}`);
    const open = findOne(fixture.dbPath, "drip_opens", (row) => row.email === captureEmail && row.campaignId === "sqlite-runtime");
    assert(numeric(open?.openCount) === 1, "track/open did not write drip_opens");
    const click = findOne(fixture.dbPath, "drip_clicks", (row) => row.email === captureEmail && row.campaignId === "sqlite-runtime");
    assert(numeric(click?.clickCount) === 1, "track/click did not write drip_clicks");
    const card = findOne(fixture.dbPath, "cards", (row) => String(row._id) === fixture.ids.cardId);
    assert(numeric(card?.views) === 1, `shared card views expected 1, got ${card?.views}`);
    const signedInUser = findOne(fixture.dbPath, "users", (row) => row.email === "sqlite-smoke-user@example.com");
    assert(numeric(signedInUser?.loginCount) >= 1, "credentials sign-in did not increment user loginCount");
    const loginAttempt = findOne(
      fixture.dbPath,
      "login_attempts",
      (row) => row.email === "sqlite-smoke-user@example.com" && row.success === true
    );
    assert(loginAttempt, "credentials sign-in did not write successful login_attempts");
    assert(
      activityEventMatches(
        fixture.dbPath,
        "template_used",
        (row) => row.metadata?.templateId === fixture.ids.templateId
      ),
      "missing smoke-specific template_used activity event"
    );
    assert(
      activityEventMatches(fixture.dbPath, "email_captured", (row) => row.email === captureEmail),
      "missing smoke-specific email_captured activity event"
    );
    assert(
      activityEventMatches(
        fixture.dbPath,
        "coupon_validation_attempted",
        (row) => row.metadata?.code === "SMOKE20" && row.metadata?.result === "valid"
      ),
      "missing smoke-specific coupon_validation_attempted activity event"
    );
    assert(
      activityEventMatches(
        fixture.dbPath,
        "shared_card_viewed",
        (row) => row.metadata?.shareLink === "sqlite-runtime-smoke"
      ),
      "missing smoke-specific shared_card_viewed activity event"
    );
    assert(
      activityEventMatches(fixture.dbPath, "login_succeeded", (row) => row.email === "sqlite-smoke-user@example.com"),
      "missing smoke-specific login_succeeded activity event"
    );

    console.log(JSON.stringify({
      ok: true,
      baseUrl,
      sqlitePath: fixture.dbPath,
      sourceSqlitePath: fixture.sourceDbPath,
      productionScaleArtifact: Boolean(fixture.sourceDbPath),
      sourceStats: fixture.sourceStats,
      durationMs: Date.now() - startMs,
      checks: [
        "templates_read",
        "template_use_write",
        "email_capture_write",
        "coupon_validate_read",
        "email_open_write",
        "email_click_write",
        "shared_card_read_write",
        "auth_providers_oauth_visible",
        "native_oauth_unauth_redirect",
        "credentials_auth_session",
        "sqlite_row_verification",
      ],
    }, null, 2));
  } catch (error) {
    console.error(serverOutput.slice(-4000));
    throw error;
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 5000);
      child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    if (process.env.SQLITE_RUNTIME_SMOKE_KEEP_DB === "1") {
      console.error(`Keeping SQLite runtime smoke DB at ${fixture.dbPath}`);
    } else {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
