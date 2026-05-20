#!/usr/bin/env node
/**
 * MyBingoCard incident report.
 *
 * Usage:
 *   node scripts/error-report.cjs --hours 2 --route /game
 *   npm run errors:recent -- --fingerprint client_abc123
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { MongoClient } = require("mongodb");

const APP_DIR = "/var/www/mybingocard.com";
const DB_NAME = "mybingocard";
const UNRESOLVED_STATUS_FILTER = {
  $or: [
    { status: { $exists: false } },
    { status: null },
    { status: { $nin: ["fixed", "ignored"] } },
  ],
};

function loadEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx);
      if (process.env[key]) continue;
      process.env[key] = trimmed.slice(idx + 1).replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // .env.local is optional for local reports.
  }
}

function parseArgs(argv) {
  const args = {
    hours: 2,
    limit: 10,
    route: "",
    fingerprint: "",
    all: false,
    json: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--hours" && next) {
      args.hours = Math.max(1, Math.min(168, Number(next) || args.hours));
      i += 1;
    } else if (arg === "--limit" && next) {
      args.limit = Math.max(1, Math.min(50, Number(next) || args.limit));
      i += 1;
    } else if (arg === "--route" && next) {
      args.route = next;
      i += 1;
    } else if (arg === "--fingerprint" && next) {
      args.fingerprint = next;
      i += 1;
    } else if (arg === "--all") {
      args.all = true;
    } else if (arg === "--json") {
      args.json = true;
    }
  }

  return args;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fmtDate(value) {
  if (!value) return "never";
  return new Date(value).toLocaleString("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function readCurrentBuild() {
  const buildIdPath = path.join(APP_DIR, ".next", "BUILD_ID");
  let buildId = process.env.NEXT_PUBLIC_APP_BUILD_ID || process.env.BUILD_ID || process.env.GIT_SHA || null;
  let buildCreatedAt = null;
  try {
    buildId = fs.readFileSync(buildIdPath, "utf8").trim() || buildId;
    buildCreatedAt = fs.statSync(buildIdPath).mtime;
  } catch {
    // Build file is absent during dev.
  }

  let gitSha = process.env.GIT_SHA || null;
  try {
    gitSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: APP_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    }).trim();
  } catch {
    // Git metadata is optional.
  }

  return {
    buildId,
    buildCreatedAt,
    gitSha,
    gitShortSha: gitSha ? gitSha.slice(0, 12) : null,
  };
}

function lastUsefulBreadcrumb(breadcrumbs) {
  return [...(breadcrumbs || [])]
    .reverse()
    .find((crumb) => ["ui", "activity", "navigation", "recovery"].includes(crumb?.type || ""));
}

function firstMappedFrame(groupOrEvent) {
  const frame = groupOrEvent?.latestSourceMappedFrames?.[0] || groupOrEvent?.sourceMappedFrames?.[0];
  if (!frame?.source || !frame?.line) return null;
  return `${frame.source}:${frame.line}${frame.column ? `:${frame.column}` : ""}`;
}

function visitorUrl(event) {
  const params = new URLSearchParams({ periodHours: "168", limit: "100" });
  if (event.anonymousId) params.set("anonymousId", event.anonymousId);
  if (event.sessionId) params.set("sessionId", event.sessionId);
  return `https://mybingocard.com/admin/visitors?${params.toString()}`;
}

async function loadReport(db, args, currentBuild) {
  const since = new Date(Date.now() - args.hours * 60 * 60 * 1000);
  const eventMatch = { createdAt: { $gte: since } };

  if (args.route) {
    const routeRe = new RegExp(escapeRegex(args.route), "i");
    eventMatch.$or = [{ pathname: routeRe }, { pageUrl: routeRe }];
  }
  if (args.fingerprint) {
    eventMatch.fingerprint = args.fingerprint;
  }

  const groupFilter = args.all ? {} : UNRESOLVED_STATUS_FILTER;
  const fingerprints = await db.collection("error_events").distinct("fingerprint", eventMatch);
  const groupMatch = {
    ...groupFilter,
    ...(args.fingerprint ? { _id: args.fingerprint } : {}),
    ...(fingerprints.length ? { _id: { $in: fingerprints } } : args.fingerprint ? {} : { _id: { $in: [] } }),
  };

  const [
    totalEvents,
    currentBuildEvents,
    afterDeployEvents,
    newSinceDeployGroups,
    groups,
    recentEvents,
  ] = await Promise.all([
    db.collection("error_events").countDocuments(eventMatch),
    currentBuild.buildId
      ? db.collection("error_events").countDocuments({ ...eventMatch, buildId: currentBuild.buildId })
      : Promise.resolve(0),
    currentBuild.buildCreatedAt
      ? db.collection("error_events").countDocuments({ ...eventMatch, createdAt: { $gte: currentBuild.buildCreatedAt } })
      : Promise.resolve(0),
    currentBuild.buildCreatedAt
      ? db.collection("error_fingerprints").countDocuments({
          ...groupFilter,
          firstSeenAt: { $gte: currentBuild.buildCreatedAt },
        })
      : Promise.resolve(0),
    db.collection("error_fingerprints")
      .find(groupMatch)
      .sort({ severity: 1, lastSeenAt: -1 })
      .limit(args.limit)
      .toArray(),
    db.collection("error_events")
      .find(eventMatch)
      .sort({ createdAt: -1 })
      .limit(args.limit)
      .toArray(),
  ]);

  return {
    generatedAt: new Date(),
    since,
    args,
    currentBuild,
    totals: {
      totalEvents,
      currentBuildEvents,
      afterDeployEvents,
      newSinceDeployGroups,
    },
    groups,
    recentEvents,
  };
}

function printReport(report) {
  console.log("MyBingoCard Error Incident Report");
  console.log(`Window: ${fmtDate(report.since)} to ${fmtDate(report.generatedAt)} Arizona time`);
  if (report.args.route) console.log(`Route filter: ${report.args.route}`);
  if (report.args.fingerprint) console.log(`Fingerprint: ${report.args.fingerprint}`);
  console.log(`Current build: ${report.currentBuild.buildId || "unknown"} (${report.currentBuild.gitShortSha || "unknown git"})`);
  console.log(`Build created: ${fmtDate(report.currentBuild.buildCreatedAt)}`);
  console.log(`Events: ${report.totals.totalEvents} total, ${report.totals.currentBuildEvents} on current build, ${report.totals.afterDeployEvents} since deploy`);
  console.log(`New unresolved groups since deploy: ${report.totals.newSinceDeployGroups}`);

  if (!report.groups.length) {
    console.log("\nNo matching unresolved error groups.");
  } else {
    console.log("\nTop groups:");
    for (const group of report.groups) {
      const crumb = lastUsefulBreadcrumb(group.latestBreadcrumbs);
      const mapped = firstMappedFrame(group);
      console.log(`\n[${(group.severity || "low").toUpperCase()}/${group.status || "open"}] ${group._id}`);
      console.log(`  ${group.message || "No message"}`);
      console.log(`  events=${group.totalCount || 0} sessions=${new Set((group.sessionIds || []).filter(Boolean)).size} first=${fmtDate(group.firstSeenAt)} last=${fmtDate(group.lastSeenAt)}`);
      console.log(`  page=${group.latestPageUrl || group.latestPathname || "unknown"}`);
      console.log(`  build=${group.latestBuildId || "unknown"}`);
      if (mapped) console.log(`  mapped=${mapped}`);
      if (crumb) console.log(`  last_action=${crumb.type}:${crumb.message}`);
    }
  }

  if (report.recentEvents.length) {
    console.log("\nRecent events:");
    for (const event of report.recentEvents) {
      const crumb = lastUsefulBreadcrumb(event.breadcrumbs);
      const mapped = firstMappedFrame(event);
      console.log(`- ${fmtDate(event.createdAt)} ${event.fingerprint || "unknown"} ${event.pathname || event.pageUrl || "unknown"}`);
      console.log(`  ${event.message || "No message"}`);
      if (mapped) console.log(`  mapped=${mapped}`);
      if (crumb) console.log(`  action=${crumb.type}:${crumb.message}`);
      if (event.anonymousId || event.sessionId) console.log(`  visitor=${visitorUrl(event)}`);
    }
  }
}

async function main() {
  loadEnvFile(path.join(APP_DIR, ".env.local"));
  const args = parseArgs(process.argv);
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/mybingocard";
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    const report = await loadReport(client.db(DB_NAME), args, readCurrentBuild());
    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }
  } finally {
    await client.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error("Error report failed:", error.message || error);
  process.exitCode = 1;
});
