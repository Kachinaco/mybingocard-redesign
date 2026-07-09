#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const SQLite = require("better-sqlite3");

const ROOT = path.resolve(__dirname, "..");
const BASE_DB_ENV = "SQLITE_SCRIPT_SMOKE_BASE_DB";
const FALLBACK_BASE_DB_ENV = "SQLITE_RUNTIME_SMOKE_BASE_DB";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function inspectDatabase(dbPath) {
  const db = new SQLite(dbPath, { readonly: true });
  try {
    const integrity = db.pragma("integrity_check", { simple: true });
    const documentCount = Number(db.prepare("SELECT COUNT(*) AS count FROM documents").get().count || 0);
    const rows = db
      .prepare("SELECT name, exported_count FROM collections ORDER BY name")
      .all();
    const exportedCounts = Object.fromEntries(rows.map((row) => [row.name, Number(row.exported_count || 0)]));

    return {
      integrity,
      documentCount,
      collectionCount: rows.length,
      collectionCounts: {
        activity_events: exportedCounts.activity_events || 0,
        cards: exportedCounts.cards || 0,
        users: exportedCounts.users || 0,
        support_tickets: exportedCounts.support_tickets || 0,
        subscriptions: exportedCounts.subscriptions || 0,
      },
    };
  } finally {
    db.close();
  }
}

function tail(text, max = 1600) {
  if (!text) return "";
  return text.length <= max ? text : text.slice(-max);
}

function runCommand(definition, commonEnv) {
  const startedAt = Date.now();
  const result = spawnSync(definition.command || "node", definition.args, {
    cwd: ROOT,
    env: {
      ...process.env,
      ...commonEnv,
      ...(definition.env || {}),
    },
    encoding: "utf8",
    timeout: definition.timeoutMs || 120_000,
    maxBuffer: 20 * 1024 * 1024,
  });
  const durationMs = Date.now() - startedAt;

  return {
    name: definition.name,
    args: definition.args,
    status: result.status,
    signal: result.signal,
    durationMs,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr),
    ok: result.status === 0 && !result.signal && !result.error,
    error: result.error ? result.error.message : null,
  };
}

function emailMonitorRunner() {
  return `
    (async () => {
      const monitor = require("./scripts/email-monitor.cjs");
      await monitor.handleParsedEmail({
        from: { text: "SQLite Smoke <sqlite-script-smoke@example.com>" },
        subject: "SQLite artifact script smoke support ticket",
        text: "The SQLite artifact support path is being checked.",
        html: "<p>The SQLite artifact support path is being checked.</p>",
        date: new Date(),
        messageId: "<sqlite-script-smoke@example.com>",
      });
      await monitor.closeDb();
    })().catch((error) => {
      console.error(error && error.stack ? error.stack : error);
      process.exit(1);
    });
  `;
}

function scriptDefinitions(tempDir) {
  const reportDir = path.join(tempDir, "reports");
  const uploadDir = path.join(tempDir, "clipart-uploads");
  const loopStateDir = path.join(tempDir, "ops-loop-state");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(loopStateDir, { recursive: true });

  return [
    { name: "expire-share-links", args: ["scripts/expire-share-links.cjs"] },
    { name: "card-comeback-reminders", args: ["scripts/card-comeback-reminders.cjs"], env: { SEND_EMAILS: "0" } },
    { name: "abandoned-checkout-reminders", args: ["scripts/abandoned-checkout-reminders.cjs"], env: { DRY_RUN: "1" } },
    { name: "expire-trials", args: ["scripts/expire-trials.cjs"], timeoutMs: 120_000 },
    { name: "daily-summary", args: ["scripts/daily-summary.cjs"] },
    { name: "drip-campaigns", args: ["scripts/drip-campaigns.cjs"], timeoutMs: 120_000 },
    { name: "email-monitor-handleParsedEmail", args: ["-e", emailMonitorRunner()] },
    { name: "error-report", args: ["scripts/error-report.cjs", "--hours", "24", "--route", "/game", "--json"] },
    { name: "error-monitor", args: ["scripts/error-monitor.cjs"], env: { MYBINGOCARD_ERROR_MONITOR_NO_DISCORD: "1" } },
    {
      name: "traffic-truth-report",
      args: ["scripts/traffic-truth-report.cjs", "--days", "1", "--no-write", "--json"],
      env: {
        MYBINGOCARD_NGINX_LOG_DIR: reportDir,
        MYBINGOCARD_TRAFFIC_REPORT_DIR: reportDir,
        MYBINGOCARD_TRAFFIC_SKIP_CENTRAL_ANALYTICS: "1",
        MYBINGOCARD_TRAFFIC_SKIP_GSC: "1",
        MYBINGOCARD_AGENT_TASKS: "0",
      },
    },
    {
      name: "analyze-user-journeys",
      args: ["scripts/analyze-user-journeys.cjs"],
      env: {
        MYBINGOCARD_JOURNEY_OUT_DIR: path.join(reportDir, "journeys"),
        MYBINGOCARD_JOURNEY_RUN_DATE: "2026-07-03",
      },
    },
    {
      name: "feature-usage-insights",
      args: ["scripts/feature-usage-insights.cjs"],
      env: {
        MYBINGOCARD_INSIGHTS_DIR: path.join(reportDir, "feature-insights"),
        MYBINGOCARD_INSIGHTS_NOTE: path.join(reportDir, "feature-insights.md"),
      },
    },
    {
      name: "mybingocard-ops-loops",
      args: [
        "scripts/mybingocard-ops-loops.cjs",
        "--mode",
        "revenue-watchdog,product-friction",
        "--hours",
        "24",
        "--dry-run",
        "--no-post",
        "--json",
      ],
      env: {
        MYBINGOCARD_OPS_LOOP_STATE_ROOT: loopStateDir,
      },
    },
    { name: "checkout-followup", args: ["scripts/checkout-followup.cjs"], env: { DRY_RUN: "1" } },
    { name: "suppress-unengaged", args: ["scripts/suppress-unengaged.cjs"], env: { DRY_RUN: "1" } },
    { name: "live-rooms-email-blast", args: ["scripts/live-rooms-email-blast.cjs", "--dry-run"] },
    { name: "send-live-games-announcement", args: ["scripts/send-live-games-announcement.cjs"] },
    { name: "seed-templates", args: ["scripts/seed-templates.cjs"] },
    {
      name: "seed-clipart",
      args: ["scripts/seed-clipart.cjs"],
      env: {
        MYBINGOCARD_CLIPART_UPLOAD_BASE: uploadDir,
        MYBINGOCARD_CLIPART_LIMIT: "12",
      },
    },
  ];
}

function main() {
  const sourceDbPath = process.env[BASE_DB_ENV] || process.env[FALLBACK_BASE_DB_ENV] || "";
  assert(sourceDbPath, `${BASE_DB_ENV} is required`);
  assert(fs.existsSync(sourceDbPath), `${BASE_DB_ENV} does not exist: ${sourceDbPath}`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mybingocard-sqlite-script-smoke-"));
  const dbPath = path.join(tempDir, "shadow.sqlite");
  fs.copyFileSync(sourceDbPath, dbPath);

  const before = inspectDatabase(dbPath);
  assert(before.integrity === "ok", `source SQLite integrity_check returned ${before.integrity}`);
  assert(before.documentCount > 100_000, `source SQLite is not production-scale: ${before.documentCount} documents`);
  assert(before.collectionCounts.activity_events > 100_000, "source SQLite activity_events count is not production-scale");

  const commonEnv = {
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_URL: "https://mybingocard.com",
    NEXTAUTH_URL: "https://mybingocard.com",
    MYBINGOCARD_DB_BACKEND: "sqlite",
    MYBINGOCARD_SQLITE_PATH: dbPath,
    MYBINGOCARD_EVENTS_WEBHOOK_URL: "",
    MYBINGOCARD_VISITORS_WEBHOOK_URL: "",
    MYBINGOCARD_ERRORS_WEBHOOK_URL: "",
    MYBINGOCARD_SIGNUPS_WEBHOOK_URL: "",
    DISCORD_WEBHOOK_URL: "",
    EMAIL_SERVER_HOST: "127.0.0.1",
    EMAIL_SERVER_PORT: "9",
    EMAIL_SERVER_USER: "disabled",
    EMAIL_SERVER_PASSWORD: "disabled",
    EMAIL_FROM: "MyBingoCard <support@mybingocard.com>",
    SEND_EMAILS: "0",
    DRY_RUN: "1",
  };

  const startedAt = Date.now();
  const results = scriptDefinitions(tempDir).map((definition) => runCommand(definition, commonEnv));
  const failed = results.filter((result) => !result.ok);
  const after = inspectDatabase(dbPath);

  const payload = {
    ok: failed.length === 0 && after.integrity === "ok",
    sourceSqlitePath: sourceDbPath,
    sqlitePath: dbPath,
    productionScaleArtifact: true,
    before,
    after,
    durationMs: Date.now() - startedAt,
    scripts: results,
  };

  console.log(JSON.stringify(payload, null, 2));

  if (process.env.SQLITE_SCRIPT_SMOKE_KEEP_DB === "1") {
    console.error(`Keeping SQLite script smoke directory at ${tempDir}`);
  } else {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  if (!payload.ok) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
}
