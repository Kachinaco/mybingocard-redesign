#!/usr/bin/env node
/**
 * MyBingoCard production regression monitor.
 *
 * This catches the exact classes of failures found during the May 30 QA pass:
 * stale Next chunks, tracker delivery failures, broken public share APIs,
 * uploaded-image auth regressions, and logged-out /cards route leaks.
 */

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const { spawnSync } = require("node:child_process");

const APP_DIR = process.env.MYBINGOCARD_APP_DIR || "/var/www/mybingocard.com";
const APP_URL = (process.env.MYBINGOCARD_APP_URL || "https://mybingocard.com").replace(/\/$/, "");
const LOG_FILE = process.env.MYBINGOCARD_NGINX_ACCESS_LOG || "/var/log/nginx/mybingocard.com.access.log";
const STATE_FILE = process.env.MYBINGOCARD_OPS_MONITOR_STATE || "/tmp/mybingocard-ops-regression-monitor-state.json";
const WINDOW_MINUTES = Number(process.env.MYBINGOCARD_OPS_MONITOR_WINDOW_MINUTES || 20);
const COOLDOWN_MINUTES = Number(process.env.MYBINGOCARD_OPS_MONITOR_COOLDOWN_MINUTES || 45);
const USER_AGENT = "MyBingoCardOpsRegressionMonitor/1.0";
const DISCORD_CHANNEL_ID = "1476666529184616510";
const TOKEN_FILE = "/tmp/.dtoken";

function loadEnvFile(filePath) {
  try {
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      if (!process.env[key]) {
        process.env[key] = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    // Optional for local test runs.
  }
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("Could not write monitor state:", error.message);
  }
}

function parseNginxTime(value) {
  const match = value.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/);
  if (!match) return null;
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const [, dd, mon, yyyy, hh, mm, ss, offset] = match;
  const utcMs = Date.UTC(Number(yyyy), months[mon], Number(dd), Number(hh), Number(mm), Number(ss));
  const sign = offset.startsWith("-") ? -1 : 1;
  const offHours = Number(offset.slice(1, 3));
  const offMinutes = Number(offset.slice(3, 5));
  return new Date(utcMs - sign * (offHours * 60 + offMinutes) * 60000);
}

function readRecentAccessRows() {
  const cutoff = Date.now() - WINDOW_MINUTES * 60000;
  let raw = "";
  try {
    raw = fs.readFileSync(LOG_FILE, "utf8");
  } catch {
    return [];
  }

  const rows = [];
  const lineRe = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (.*?) ([^"]+)" (\d{3}) \S+ "([^"]*)" "([^"]*)"/;
  for (const line of raw.split("\n")) {
    const match = line.match(lineRe);
    if (!match) continue;
    const at = parseNginxTime(match[2]);
    if (!at || at.getTime() < cutoff) continue;
    let pathname = "";
    try {
      pathname = new URL(match[4], APP_URL).pathname;
    } catch {
      pathname = match[4].split("?")[0] || "/";
    }
    rows.push({
      ip: match[1],
      at,
      method: match[3],
      target: match[4],
      pathname,
      status: Number(match[6]),
      referrer: match[7],
      userAgent: match[8],
    });
  }
  return rows;
}

async function fetchOk(pathname, options = {}) {
  const res = await fetch(`${APP_URL}${pathname}`, {
    method: options.method || "GET",
    redirect: "follow",
    headers: {
      "user-agent": USER_AGENT,
      accept: options.accept || "text/html,application/xhtml+xml,*/*",
    },
  });
  const text = options.method === "HEAD" ? "" : await res.text().catch(() => "");
  return { status: res.status, ok: res.ok, text, contentType: res.headers.get("content-type") || "" };
}

function countUnique(rows, keyFn) {
  return new Set(rows.map(keyFn).filter(Boolean)).size;
}

function isNextChunkAsset(pathname) {
  return pathname.includes("/_next/static/chunks/") && /\.(?:js|css)$/i.test(pathname);
}

function summarizeAccessRows(rows) {
  const chunkFailures = rows.filter((row) => isNextChunkAsset(row.pathname) && row.status >= 400);
  const trackerScriptFailures = rows.filter((row) => row.pathname === "/t/tracker.js" && row.status >= 400);
  const trackerApiFailures = rows.filter((row) => row.pathname === "/t/api/track" && row.status >= 500);
  const shareApi404s = rows.filter((row) => row.pathname.startsWith("/api/cards/share/") && row.status === 404);
  const publicImage401s = rows.filter((row) => row.pathname.startsWith("/api/images/") && row.status === 401);
  const cardsRouteAuthLeaks = rows.filter((row) => row.pathname.startsWith("/cards/") && [401, 403, 500, 502].includes(row.status));
  const publicPage5xx = rows.filter((row) => {
    if (row.status < 500) return false;
    return !row.pathname.startsWith("/api/") &&
      !row.pathname.startsWith("/_next/") &&
      !row.pathname.startsWith("/t/") &&
      !row.pathname.startsWith("/uploads/");
  });

  return {
    chunkFailures,
    trackerScriptFailures,
    trackerApiFailures,
    shareApi404s,
    publicImage401s,
    cardsRouteAuthLeaks,
    publicPage5xx,
  };
}

function issue(key, title, detail) {
  return { key, title, detail };
}

async function liveChecks() {
  const issues = [];
  const home = await fetchOk(`/?ops_monitor=${Date.now()}`);
  if (!home.ok) {
    issues.push(issue("live-home", "Home page is not returning 200", `status=${home.status}`));
    return issues;
  }
  if (!home.text.includes("/t/tracker.js")) {
    issues.push(issue("live-tracker-tag", "Home page is missing /t/tracker.js", "tracker tag not found in HTML"));
  }

  const tracker = await fetchOk("/t/tracker.js", { accept: "application/javascript,*/*" });
  if (!tracker.ok) {
    issues.push(issue("live-tracker-js", "/t/tracker.js is failing", `status=${tracker.status}`));
  }

  const chunk = [...home.text.matchAll(/\b(?:src|href)=["']([^"']*\/_next\/static\/chunks\/[^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)]
    .map((match) => match[1].replace(/&amp;/g, "&"))
    .map((value) => new URL(value, APP_URL).pathname + new URL(value, APP_URL).search)[0];
  if (!chunk) {
    issues.push(issue("live-no-chunk", "No Next chunk URL found in home HTML", "unable to sample chunk delivery"));
  } else {
    const sampled = await fetchOk(chunk, { accept: "*/*" });
    if (!sampled.ok) {
      issues.push(issue("live-chunk", "Sampled Next chunk is failing", `${sampled.status} ${chunk}`));
    }
  }

  return issues;
}

function logIssues(rows) {
  const buckets = summarizeAccessRows(rows);
  const issues = [];

  if (buckets.chunkFailures.length >= 8 || countUnique(buckets.chunkFailures, (row) => `${row.ip}|${row.userAgent}`) >= 3) {
    issues.push(issue(
      "chunk-failures",
      "Next chunk failures spiked",
      `${buckets.chunkFailures.length} failures, ${countUnique(buckets.chunkFailures, (row) => `${row.ip}|${row.userAgent}`)} unique clients in ${WINDOW_MINUTES}m`
    ));
  }
  if (buckets.trackerScriptFailures.length > 0) {
    issues.push(issue("tracker-js-failures", "/t/tracker.js failed", `${buckets.trackerScriptFailures.length} failures in ${WINDOW_MINUTES}m`));
  }
  if (buckets.trackerApiFailures.length >= 3) {
    issues.push(issue("tracker-api-failures", "/t/api/track 5xx spike", `${buckets.trackerApiFailures.length} failures in ${WINDOW_MINUTES}m`));
  }
  if (buckets.shareApi404s.length >= 3) {
    issues.push(issue("share-api-404", "Public share API 404 spike", `${buckets.shareApi404s.length} 404s across ${countUnique(buckets.shareApi404s, (row) => row.pathname)} share paths`));
  }
  if (buckets.publicImage401s.length >= 3) {
    issues.push(issue("public-image-401", "Public shared image auth regression possible", `${buckets.publicImage401s.length} image 401s across ${countUnique(buckets.publicImage401s, (row) => row.pathname)} image paths`));
  }
  if (buckets.cardsRouteAuthLeaks.length >= 2) {
    issues.push(issue("cards-route-auth", "/cards route auth leak possible", `${buckets.cardsRouteAuthLeaks.length} /cards errors in ${WINDOW_MINUTES}m`));
  }
  if (buckets.publicPage5xx.length >= 2) {
    issues.push(issue("public-page-5xx", "Public page 5xx spike", `${buckets.publicPage5xx.length} public page 5xx responses in ${WINDOW_MINUTES}m`));
  }

  return issues;
}

function getToken() {
  try {
    return fs.readFileSync(TOKEN_FILE, "utf8").trim();
  } catch {
    return null;
  }
}

async function postWebhook(content) {
  const url = process.env.MYBINGOCARD_ERRORS_WEBHOOK_URL || process.env.MYBINGOCARD_EVENTS_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return res.ok;
}

function postBot(content) {
  return new Promise((resolve) => {
    const token = getToken();
    if (!token) return resolve(false);
    const body = JSON.stringify({ content });
    const req = https.request({
      hostname: "discord.com",
      path: `/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`,
      method: "POST",
      headers: {
        authorization: `Bot ${token}`,
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
      },
    }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode >= 200 && res.statusCode < 300));
    });
    req.on("error", () => resolve(false));
    req.write(body);
    req.end();
  });
}

function postAgentTask(item) {
  if (/^(0|false|no)$/i.test(process.env.MYBINGOCARD_AGENT_TASKS || "")) return false;
  const notifier = process.env.MYBINGOCARD_AGENT_NOTIFIER || "/root/townranker-discord/scripts/mybingocard-task-notify.mjs";
  if (!fs.existsSync(notifier)) return false;
  const day = new Date().toISOString().slice(0, 10);
  const task = {
    taskKey: `mybingocard:ops-regression:${item.key}:${day}`,
    source: "ops-regression-monitor",
    type: "diagnostic",
    severity: item.key === "live-home" ? "urgent" : "act_now",
    safeActionClass: "read_only",
    title: item.title,
    summary: item.detail,
    payload: {
      appUrl: APP_URL,
      issue: item,
      windowMinutes: WINDOW_MINUTES,
      suggestedCommands: ["npm run prod:verify", "npm run traffic:truth -- --days 3"],
    },
    allowedActions: ["read_logs", "db_read", "tracker_read", "run_smoke_read_only", "report"],
    blockedActions: [
      "send customer/support email",
      "post social content",
      "change Stripe/billing",
      "delete or mutate production data",
      "deploy production changes",
      "restart production services without explicit approval",
    ],
  };
  const result = spawnSync(process.execPath, [notifier], {
    input: JSON.stringify(task),
    encoding: "utf8",
    timeout: 15000,
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    console.error("Agent task notify failed:", result.error?.message || result.stderr || result.status);
    return false;
  }
  return true;
}

function filterCooldown(issues) {
  const state = readState();
  const now = Date.now();
  const fresh = [];
  for (const item of issues) {
    const last = Number(state[item.key] || 0);
    if (now - last >= COOLDOWN_MINUTES * 60000) {
      fresh.push(item);
      state[item.key] = now;
    }
  }
  writeState(state);
  return fresh;
}

async function main() {
  loadEnvFile(path.join(APP_DIR, ".env.local"));
  const rows = readRecentAccessRows();
  const issues = [
    ...logIssues(rows),
    ...(await liveChecks()),
  ];

  if (issues.length === 0) {
    console.log(`All clear - ${new Date().toISOString()} (${rows.length} recent access rows checked)`);
    return;
  }

  const alertable = process.argv.includes("--no-cooldown") ? issues : filterCooldown(issues);
  const message = [
    `MyBingoCard ops regression monitor (${WINDOW_MINUTES}m window)`,
    "",
    ...alertable.map((item) => `- ${item.title}: ${item.detail}`),
    "",
    "Run: `npm run prod:verify` and `npm run traffic:truth -- --days 3`",
  ].join("\n");

  console.log(message);
  for (const item of alertable) postAgentTask(item);
  if (alertable.length > 0 && process.argv.includes("--discord")) {
    const ok = await postWebhook(message) || await postBot(message);
    console.log(`Discord posted: ${ok ? "yes" : "no"}`);
  }
}

main().catch((error) => {
  console.error("Ops regression monitor failed:", error.message || error);
  process.exit(1);
});
