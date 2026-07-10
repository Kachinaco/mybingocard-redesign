#!/usr/bin/env node
/**
 * mybingocard.com Error Monitor
 * Runs every 30 min via PM2 cron. Posts to Discord if real errors are found.
 */

const { execSync } = require("node:child_process");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const { openSqliteShadowDatabase } = require("./sqlite-shadow-store.cjs");

const APP_DIR = "/var/www/mybingocard.com";
const CHANNEL_ID = "1476666529184616510";
const TOKEN_FILE = "/tmp/.dtoken";
const KNOWN_BENIGN_CHUNKS = ["4869cf5e8d29861b.css"]; // stale build chunk, harmless
const UNRESOLVED_STATUS_FILTER = {
  $or: [
    { status: { $exists: false } },
    { status: null },
    { status: { $nin: ["fixed", "ignored"] } },
  ],
};

function loadEnvFile(filePath) {
  try {
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx);
      if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
        process.env[key] = trimmed.slice(idx + 1).replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    // Optional in local/dev runs.
  }
}

function getToken() {
  try { return fs.readFileSync(TOKEN_FILE, "utf8").trim(); } catch { return null; }
}

function discordPost(content) {
  return new Promise((resolve) => {
    if (process.env.MYBINGOCARD_ERROR_MONITOR_NO_DISCORD === "1") {
      console.log("Discord notify disabled by MYBINGOCARD_ERROR_MONITOR_NO_DISCORD");
      resolve();
      return;
    }

    const token = getToken();
    if (!token) {
      console.log("No token, skipping Discord notify");
      resolve();
      return;
    }

    const body = JSON.stringify({ content });
    const opts = {
      hostname: "discord.com",
      path: `/api/v10/channels/${CHANNEL_ID}/messages`,
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      console.log("Discord response:", res.statusCode);
      res.resume();
      res.on("end", resolve);
    });
    req.on("error", (e) => {
      console.error("Discord error:", e.message);
      resolve();
    });
    req.write(body);
    req.end();
  });
}

function checkNginx() {
  try {
    const out = execSync("python3 /var/www/mybingocard.com/scripts/nginx-check.py",
      { encoding: "utf8", timeout: 15000, shell: "/bin/bash" }
    );
    const lines = out.trim().split("\n").filter(Boolean);
    return lines.filter((line) => !isBenignNginxLine(line));
  } catch {
    return [];
  }
}

function isBenignNginxLine(line) {
  if (KNOWN_BENIGN_CHUNKS.some((chunk) => line.includes(chunk))) return true;

  const match = line.trim().match(/^(\d+)\s+500\s+(\S+)/);
  if (!match) return false;
  const count = Number(match[1]);
  const url = match[2] || "";

  // Single stale Next chunk requests are common right after deploys and the
  // browser error handler reloads once for this case.
  return count <= 2 && /^\/_next\/static\/chunks\/.+\.(?:js|css)(?:\?.*)?$/i.test(url);
}

function checkPM2Errors() {
  try {
    const cutoffMs = Date.now() - 35 * 60 * 1000;
    const logFile = "/root/.pm2/logs/mybingocard-error.log";
    const raw = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8") : "";
    const lines = raw.split("\n").filter((line) => {
      if (!line.includes("Event handlers") && !line.includes("FATAL") && !line.includes("⨯ Error:")) return false;
      const match = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      if (!match) return false;
      return new Date(`${match[1]}Z`).getTime() > cutoffMs;
    });
    return [...new Set(lines.map((line) => line.replace(/.*\|/, "").replace(/^\d{4}-.*?:\s*/, "").trim()))].slice(0, 5);
  } catch {
    return [];
  }
}

async function checkStructuredErrors(db) {
  const since = new Date(Date.now() - 30 * 60 * 1000);
  const groups = await db.collection("error_events").aggregate([
    { $match: { createdAt: { $gte: since }, alertSuppressed: { $ne: true } } },
    {
      $group: {
        _id: "$fingerprint",
        count: { $sum: 1 },
        sessions: { $addToSet: "$sessionId" },
        latestAt: { $max: "$createdAt" },
        latestMessage: { $last: "$message" },
        latestPathname: { $last: "$pathname" },
        latestPageUrl: { $last: "$pageUrl" },
      },
    },
    {
      $lookup: {
        from: "error_fingerprints",
        localField: "_id",
        foreignField: "_id",
        as: "fingerprints",
      },
    },
    { $addFields: { group: { $first: "$fingerprints" } } },
    {
      $match: {
        _id: { $type: "string", $ne: "" },
        "group.alertSuppressed": { $ne: true },
      },
    },
    {
      $project: {
        _id: 1,
        count: 1,
        latestAt: 1,
        latestMessage: 1,
        latestPathname: 1,
        latestPageUrl: 1,
        severity: "$group.severity",
        status: { $ifNull: ["$group.status", "open"] },
        totalCount: "$group.totalCount",
        latestBuildId: "$group.latestBuildId",
        sessionCount: {
          $size: {
            $filter: {
              input: "$sessions",
              as: "sessionId",
              cond: { $and: [{ $ne: ["$$sessionId", null] }, { $ne: ["$$sessionId", ""] }] },
            },
          },
        },
      },
    },
    { $match: UNRESOLVED_STATUS_FILTER },
    { $sort: { severity: 1, count: -1, latestAt: -1 } },
    { $limit: 8 },
  ]).toArray();

  return groups.filter((group) => {
    if (group.severity === "high") return group.count >= 1;
    if (group.severity === "medium") return group.count >= 2 || group.sessionCount >= 2;
    return group.count >= 5 && group.sessionCount >= 2;
  });
}

function dateMs(value) {
  const date = value instanceof Date ? value : new Date(value || 0);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isUnresolvedStatus(status) {
  return status == null || !["fixed", "ignored"].includes(status);
}

function severityRank(severity) {
  if (severity === "high") return 0;
  if (severity === "medium") return 1;
  return 2;
}

async function checkStructuredErrorsSqlite(db) {
  const since = new Date(Date.now() - 30 * 60 * 1000);
  const events = await db.collection("error_events")
    .find({ createdAt: { $gte: since }, alertSuppressed: { $ne: true } })
    .toArray();
  const fingerprints = await db.collection("error_fingerprints").find({}).toArray();
  const fingerprintById = new Map(fingerprints.map((doc) => [String(doc._id || ""), doc]));
  const grouped = new Map();

  for (const event of events) {
    const fingerprint = typeof event.fingerprint === "string" ? event.fingerprint : "";
    if (!fingerprint) continue;
    const groupDoc = fingerprintById.get(fingerprint) || {};
    if (groupDoc.alertSuppressed === true) continue;
    const group = grouped.get(fingerprint) || {
      _id: fingerprint,
      count: 0,
      sessions: new Set(),
      latestAt: event.createdAt,
      latestMessage: event.message,
      latestPathname: event.pathname,
      latestPageUrl: event.pageUrl,
      group: groupDoc,
    };

    group.count += 1;
    if (event.sessionId) group.sessions.add(event.sessionId);
    if (dateMs(event.createdAt) >= dateMs(group.latestAt)) {
      group.latestAt = event.createdAt;
      group.latestMessage = event.message;
      group.latestPathname = event.pathname;
      group.latestPageUrl = event.pageUrl;
    }
    grouped.set(fingerprint, group);
  }

  return [...grouped.values()]
    .map((row) => ({
      _id: row._id,
      count: row.count,
      latestAt: row.latestAt,
      latestMessage: row.latestMessage,
      latestPathname: row.latestPathname,
      latestPageUrl: row.latestPageUrl,
      severity: row.group.severity,
      status: row.group.status || "open",
      totalCount: row.group.totalCount,
      latestBuildId: row.group.latestBuildId,
      sessionCount: row.sessions.size,
    }))
    .filter((group) => isUnresolvedStatus(group.status))
    .filter((group) => {
      if (group.severity === "high") return group.count >= 1;
      if (group.severity === "medium") return group.count >= 2 || group.sessionCount >= 2;
      return group.count >= 5 && group.sessionCount >= 2;
    })
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity)
      || b.count - a.count
      || dateMs(b.latestAt) - dateMs(a.latestAt))
    .slice(0, 8);
}

async function checkLegacyActivityErrors(db) {
  const since = new Date(Date.now() - 30 * 60 * 1000);
  return db.collection("activity_events").countDocuments({
    createdAt: { $gte: since },
    event: { $in: ["api_error", "card_save_error", "auth_error"] },
  });
}

function formatStructuredError(group) {
  const page = group.latestPageUrl || group.latestPathname || "unknown page";
  return `• ${group.severity || "low"}/${group.status || "open"} ${group._id}: ${group.count} events, ${group.sessionCount} sessions\n  ${page}\n  ${group.latestMessage || "No message"}`;
}

async function main() {
  loadEnvFile(path.join(APP_DIR, ".env.local"));
  const nginx5xx = checkNginx();
  const pm2Errors = checkPM2Errors();
  const issues = [];
  const db = openSqliteShadowDatabase();

  try {
    const [structuredErrors, legacyErrors] = await Promise.all([
      checkStructuredErrorsSqlite(db),
      checkLegacyActivityErrors(db),
    ]);

    if (nginx5xx.length > 0) {
      issues.push(`Nginx 5xx errors:\n\`\`\`\n${nginx5xx.slice(0, 10).join("\n")}\n\`\`\``);
    }

    const credErrors = pm2Errors.filter((line) => line.includes("CredentialsSignin")).length;
    const otherErrors = pm2Errors.filter((line) => !line.includes("CredentialsSignin"));
    if (otherErrors.length > 0) {
      issues.push(`PM2 errors:\n\`\`\`\n${otherErrors.slice(0, 3).join("\n")}\n\`\`\``);
    }
    if (credErrors > 10) {
      issues.push(`High login failure count: ${credErrors} CredentialsSignin errors`);
    }

    if (structuredErrors.length > 0) {
      issues.push(`Structured error_events in last 30 min:\n${structuredErrors.map(formatStructuredError).join("\n")}`);
    }
    if (legacyErrors > 0) {
      issues.push(`Legacy activity error events in last 30 min: ${legacyErrors}`);
    }
  } finally {
    db.close();
  }

  if (issues.length > 0) {
    const msg = `MyBingoCard Error Monitor Alert (${new Date().toLocaleTimeString("en-US", { timeZone: "America/Phoenix" })} MST)\n\n${issues.join("\n\n")}\n\nReport: \`npm run errors:recent -- --hours 2\``;
    console.log("Alerting Discord:", msg);
    await discordPost(msg);
  } else {
    console.log("All clear —", new Date().toISOString());
  }
}

main().catch((error) => {
  console.error("Error monitor failed:", error.message || error);
  process.exitCode = 1;
});
