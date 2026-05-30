#!/usr/bin/env node
/**
 * Cross-checks MyBingoCard traffic from the sources that can disagree:
 * nginx access logs, first-party app activity_events, central analytics, and GSC.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { MongoClient } = require("mongodb");

const APP_DIR = process.env.MYBINGOCARD_APP_DIR || "/var/www/mybingocard.com";
const APP_URL = (process.env.MYBINGOCARD_APP_URL || "https://mybingocard.com").replace(/\/$/, "");
const DOMAIN = new URL(APP_URL).hostname;
const ACCESS_LOG_DIR = process.env.MYBINGOCARD_NGINX_LOG_DIR || "/var/log/nginx";
const ACCESS_LOG_PREFIX = process.env.MYBINGOCARD_NGINX_ACCESS_PREFIX || "mybingocard.com.access.log";
const REPORT_DIR = process.env.MYBINGOCARD_TRAFFIC_REPORT_DIR || "/var/log/mybingocard/traffic-truth";
const ANALYTICS_ENV_PATH = process.env.MYBINGOCARD_ANALYTICS_ENV || "/opt/saas/analytics-tracker/.env";
const GSC_MODULE_PATH = process.env.MYBINGOCARD_GSC_MODULE || "/opt/saas/analytics-tracker/lib/gsc.js";
const USER_AGENT = "MyBingoCardTrafficTruth/1.0";
const PHOENIX_TZ = "America/Phoenix";
const BOT_UA_RE = /(bot|crawl|spider|slurp|bingpreview|headless|lighthouse|pagespeed|uptime|pingdom|monitor|preview|facebookexternalhit|pinterest|semrush|ahrefs|mj12|dotbot|bytespider|gptbot|claudebot|perplexitybot)/i;

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

function hasArg(name) {
  return process.argv.includes(name);
}

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
    // Optional in local/dev runs.
  }
}

function phoenixDay(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PHOENIX_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDays(day, amount) {
  const [year, month, date] = day.split("-").map(Number);
  return phoenixDay(new Date(Date.UTC(year, month - 1, date + amount, 12, 0, 0)));
}

function dayStartUtc(day) {
  return new Date(`${day}T07:00:00.000Z`);
}

function dateRange(days) {
  const safeDays = Math.min(90, Math.max(1, Number(days) || 14));
  const today = phoenixDay(new Date());
  let startDay = today;
  for (let i = 1; i < safeDays; i += 1) startDay = addDays(startDay, -1);
  const list = [];
  for (let day = startDay; day <= today; day = addDays(day, 1)) {
    list.push(day);
    if (list.length > safeDays + 2) break;
  }
  return { days: list, startDay, today, startDate: dayStartUtc(startDay), endDate: new Date() };
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

function emptyDay() {
  return {
    requests: 0,
    pageRequests: 0,
    humanishPageRequests: 0,
    uniqueClients: new Set(),
    status2xx: 0,
    status3xx: 0,
    status4xx: 0,
    status5xx: 0,
    chunkFailures: 0,
    sourceMapFailures: 0,
    trackerFailures: 0,
    shareApi404s: 0,
    image401s: 0,
    cardsRouteErrors: 0,
    pinterestRefs: 0,
    externalRefs: new Map(),
  };
}

function isPagePath(pathname) {
  if (!pathname || !pathname.startsWith("/")) return false;
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/_next/")) return false;
  if (pathname.startsWith("/t/")) return false;
  if (pathname.startsWith("/uploads/")) return false;
  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml") return false;
  return !/\.(?:js|css|png|jpe?g|gif|webp|svg|ico|json|txt|xml|map|woff2?|ttf|pdf)$/i.test(pathname);
}

function isNextChunkAsset(pathname) {
  return pathname.includes("/_next/static/chunks/") && /\.(?:js|css)$/i.test(pathname);
}

function isNextSourceMap(pathname) {
  return pathname.includes("/_next/static/chunks/") && /\.map$/i.test(pathname);
}

function referrerHost(referrer) {
  if (!referrer || referrer === "-") return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host || "unknown";
  } catch {
    return "unknown";
  }
}

function bucketReferrer(referrer) {
  const host = referrerHost(referrer);
  if (host === "direct" || host === "unknown") return host;
  if (host === DOMAIN || host.endsWith(`.${DOMAIN}`)) return "internal";
  if (/google|bing|yahoo|duckduckgo|ecosia|yandex/i.test(host)) return `search:${host}`;
  if (/pinimg|pinterest/i.test(host)) return `social:${host}`;
  if (/facebook|instagram|threads|t\.co|twitter|x\.com|reddit|linkedin|youtube|tiktok/i.test(host)) return `social:${host}`;
  if (/chatgpt|openai|perplexity|claude|copilot|gemini/i.test(host)) return `ai:${host}`;
  return host;
}

function listAccessLogs() {
  try {
    return fs.readdirSync(ACCESS_LOG_DIR)
      .filter((name) => name === ACCESS_LOG_PREFIX || name.startsWith(`${ACCESS_LOG_PREFIX}.`))
      .map((name) => path.join(ACCESS_LOG_DIR, name))
      .map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, 24)
      .map((item) => item.filePath);
  } catch {
    return [];
  }
}

function readLogFile(filePath) {
  try {
    if (filePath.endsWith(".gz")) {
      return execFileSync("gzip", ["-cd", filePath], {
        encoding: "utf8",
        maxBuffer: 120 * 1024 * 1024,
      });
    }
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function parseAccessLogs(range) {
  const byDay = new Map(range.days.map((day) => [day, emptyDay()]));
  const samples = [];
  const lineRe = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (.*?) ([^"]+)" (\d{3}) \S+ "([^"]*)" "([^"]*)"/;

  for (const filePath of listAccessLogs()) {
    const raw = readLogFile(filePath);
    for (const line of raw.split("\n")) {
      const match = lineRe.exec(line);
      if (!match) continue;
      const at = parseNginxTime(match[2]);
      if (!at || at < range.startDate || at > range.endDate) continue;
      const day = phoenixDay(at);
      const row = byDay.get(day);
      if (!row) continue;

      let pathname = "";
      try {
        pathname = new URL(match[4], APP_URL).pathname;
      } catch {
        pathname = match[4].split("?")[0] || "/";
      }

      const status = Number(match[6]);
      const referrer = match[7];
      const userAgent = match[8] || "";
      const method = match[3];
      const isBot = BOT_UA_RE.test(userAgent);
      const isPage = ["GET", "HEAD"].includes(method) && isPagePath(pathname);

      row.requests += 1;
      row.uniqueClients.add(`${match[1]}|${userAgent}`);
      if (status >= 500) row.status5xx += 1;
      else if (status >= 400) row.status4xx += 1;
      else if (status >= 300) row.status3xx += 1;
      else if (status >= 200) row.status2xx += 1;

      if (isPage) {
        row.pageRequests += 1;
        if (!isBot && status < 400) row.humanishPageRequests += 1;
        const bucket = bucketReferrer(referrer);
        if (bucket !== "direct" && bucket !== "internal" && bucket !== "unknown") {
          increment(row.externalRefs, bucket);
        }
        if (/pinterest|pinimg/i.test(referrer)) row.pinterestRefs += 1;
      }

      if (isNextChunkAsset(pathname) && status >= 400) row.chunkFailures += 1;
      if (isNextSourceMap(pathname) && status >= 400) row.sourceMapFailures += 1;
      if ((pathname === "/t/tracker.js" && status >= 400) || (pathname === "/t/api/track" && status >= 500)) row.trackerFailures += 1;
      if (pathname.startsWith("/api/cards/share/") && status === 404) row.shareApi404s += 1;
      if (pathname.startsWith("/api/images/") && status === 401) row.image401s += 1;
      if (pathname.startsWith("/cards/") && [401, 403, 500, 502].includes(status)) row.cardsRouteErrors += 1;

      if (samples.length < 20 && (status >= 500 || isNextChunkAsset(pathname) && status >= 400)) {
        samples.push(`${day} ${status} ${pathname}`);
      }
    }
  }

  const normalized = {};
  for (const [day, row] of byDay.entries()) {
    normalized[day] = {
      ...row,
      uniqueClients: row.uniqueClients.size,
      externalRefs: Object.fromEntries([...row.externalRefs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)),
    };
  }
  return { byDay: normalized, samples };
}

async function firstPartyActivity(range) {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/mybingocard";
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
  const cleanExpr = {
    $not: [{
      $regexMatch: {
        input: { $ifNull: ["$userAgent", ""] },
        regex: BOT_UA_RE.source,
        options: "i",
      },
    }],
  };
  try {
    await client.connect();
    const db = client.db("mybingocard");
    const rows = await db.collection("activity_events").aggregate([
      { $match: { createdAt: { $gte: range.startDate, $lte: range.endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: PHOENIX_TZ } },
          total: { $sum: 1 },
          cleanTotal: { $sum: { $cond: [cleanExpr, 1, 0] } },
          pageViews: { $sum: { $cond: [{ $eq: ["$event", "page_view"] }, 1, 0] } },
          cleanPageViews: { $sum: { $cond: [{ $and: [{ $eq: ["$event", "page_view"] }, cleanExpr] }, 1, 0] } },
          engagements: { $sum: { $cond: [{ $in: ["$event", ["page_engagement", "click", "cta_click", "form_submit", "tab_returned"]] }, 1, 0] } },
          cards: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ["$event", ""] }, regex: "(card|game|print|share)", options: "i" } }, 1, 0] } },
          signups: { $sum: { $cond: [{ $in: ["$event", ["signup_completed", "user_registered"]] }, 1, 0] } },
          checkouts: { $sum: { $cond: [{ $in: ["$event", ["checkout_started", "checkout_completed", "subscription_created"]] }, 1, 0] } },
          sessions: { $addToSet: { $ifNull: ["$sessionId", "$anonymousId"] } },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    const sources = await db.collection("activity_events").aggregate([
      { $match: { createdAt: { $gte: range.startDate, $lte: range.endDate }, event: "page_view" } },
      {
        $project: {
          source: {
            $ifNull: [
              "$metadata.utm_source",
              { $ifNull: ["$metadata.utm.source", { $ifNull: ["$metadata.source", "$metadata.referrer"] }] },
            ],
          },
        },
      },
      { $match: { source: { $type: "string", $ne: "" } } },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]).toArray();

    return {
      available: true,
      byDay: Object.fromEntries(rows.map((row) => [row._id, { ...row, sessions: (row.sessions || []).filter(Boolean).length }])),
      sources: sources.map((row) => ({ source: row._id, count: row.count })),
    };
  } catch (error) {
    return { available: false, error: error.message, byDay: {}, sources: [] };
  } finally {
    await client.close().catch(() => {});
  }
}

function analyticsMongoUri() {
  if (process.env.ANALYTICS_MONGODB_URI) return process.env.ANALYTICS_MONGODB_URI;
  if (process.env.TOWNRANKER_ANALYTICS_MONGODB_URI) return process.env.TOWNRANKER_ANALYTICS_MONGODB_URI;
  const env = readEnvMap(ANALYTICS_ENV_PATH);
  return env.MONGODB_URI || "mongodb://localhost:27017/analytics";
}

function readEnvMap(filePath) {
  try {
    const env = {};
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

async function centralAnalytics(range) {
  const client = new MongoClient(analyticsMongoUri(), { serverSelectionTimeoutMS: 5000 });
  const reportableExpr = {
    $and: [
      { $ne: ["$isHuman", false] },
      { $not: [{ $in: ["$trafficClass", ["bot", "crawler", "monitor", "internal"]] }] },
    ],
  };
  try {
    await client.connect();
    const db = client.db();
    const rows = await db.collection("events").aggregate([
      { $match: { domain: DOMAIN, createdAt: { $gte: range.startDate, $lte: range.endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: PHOENIX_TZ } },
          events: { $sum: 1 },
          pageViews: { $sum: { $cond: [{ $eq: ["$event", "page_view"] }, 1, 0] } },
          reportablePageViews: { $sum: { $cond: [{ $and: [{ $eq: ["$event", "page_view"] }, reportableExpr] }, 1, 0] } },
          serverRequests: { $sum: { $cond: [{ $eq: ["$event", "server_request"] }, 1, 0] } },
          reportableEvents: { $sum: { $cond: [reportableExpr, 1, 0] } },
          visitors: { $addToSet: { $ifNull: ["$anonymousId", "$sessionId"] } },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    return {
      available: true,
      byDay: Object.fromEntries(rows.map((row) => [row._id, { ...row, visitors: (row.visitors || []).filter(Boolean).length }])),
    };
  } catch (error) {
    return { available: false, error: error.message, byDay: {} };
  } finally {
    await client.close().catch(() => {});
  }
}

async function gscAnalytics(range) {
  if (!fs.existsSync(GSC_MODULE_PATH)) {
    return { available: false, error: `GSC module missing at ${GSC_MODULE_PATH}`, byDay: {} };
  }
  try {
    const moduleUrl = `file://${GSC_MODULE_PATH}`;
    const mod = await import(moduleUrl);
    const getSearchAnalytics = mod.getSearchAnalytics || mod.default?.getSearchAnalytics;
    if (typeof getSearchAnalytics !== "function") {
      return { available: false, error: "getSearchAnalytics export not found", byDay: {} };
    }

    const siteOptions = [`sc-domain:${DOMAIN}`, `${APP_URL}/`, APP_URL];
    let rows = [];
    let lastError = null;
    for (const site of siteOptions) {
      try {
        const result = await getSearchAnalytics(site, {
          startDate: range.startDay,
          endDate: range.today,
          dimensions: ["date"],
          rowLimit: 1000,
        });
        rows = Array.isArray(result) ? result : (result?.rows || result?.data || []);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;

    const byDay = {};
    for (const row of rows || []) {
      const day = row.keys?.[0] || row.date;
      if (!day) continue;
      byDay[day] = {
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0),
        ctr: Number(row.ctr || 0),
        position: Number(row.position || 0),
      };
    }
    return { available: true, byDay };
  } catch (error) {
    return { available: false, error: error.message, byDay: {} };
  }
}

function sum(days, source, key) {
  return days.reduce((total, day) => total + Number(source[day]?.[key] || 0), 0);
}

function fmt(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function ratio(a, b) {
  if (!a || !b) return "n/a";
  return `${Math.round((a / b) * 100)}%`;
}

function topReferrers(accessByDay) {
  const totals = new Map();
  for (const row of Object.values(accessByDay)) {
    for (const [ref, count] of Object.entries(row.externalRefs || {})) {
      increment(totals, ref, count);
    }
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
}

function buildFlags(range, access, firstParty, central) {
  const flags = [];
  const rawHuman = sum(range.days, access.byDay, "humanishPageRequests");
  const firstPartyClean = sum(range.days, firstParty.byDay || {}, "cleanPageViews");
  const centralReportable = sum(range.days, central.byDay || {}, "reportablePageViews");
  const chunkFailures = sum(range.days, access.byDay, "chunkFailures");
  const trackerFailures = sum(range.days, access.byDay, "trackerFailures");
  const share404s = sum(range.days, access.byDay, "shareApi404s");
  const image401s = sum(range.days, access.byDay, "image401s");
  const cardsErrors = sum(range.days, access.byDay, "cardsRouteErrors");
  const status5xx = sum(range.days, access.byDay, "status5xx");

  if (chunkFailures) flags.push(`${fmt(chunkFailures)} stale/missing Next chunk failures in nginx logs`);
  if (trackerFailures) flags.push(`${fmt(trackerFailures)} tracker delivery failures in nginx logs`);
  if (share404s) flags.push(`${fmt(share404s)} public share API 404s`);
  if (image401s) flags.push(`${fmt(image401s)} shared image 401s`);
  if (cardsErrors) flags.push(`${fmt(cardsErrors)} /cards auth/server errors`);
  if (status5xx) flags.push(`${fmt(status5xx)} total nginx 5xx responses`);
  if (firstParty.available && rawHuman > 100 && firstPartyClean > 0 && firstPartyClean < rawHuman * 0.55) {
    flags.push(`first-party clean page views are only ${ratio(firstPartyClean, rawHuman)} of nginx human-ish page requests`);
  }
  if (central.available && rawHuman > 100 && centralReportable > 0 && centralReportable < rawHuman * 0.55) {
    flags.push(`central reportable page views are only ${ratio(centralReportable, rawHuman)} of nginx human-ish page requests`);
  }
  return flags;
}

function buildMarkdown(range, access, firstParty, central, gsc) {
  const flags = buildFlags(range, access, firstParty, central);
  const refs = topReferrers(access.byDay);
  const lines = [];
  lines.push(`# MyBingoCard Traffic Truth`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Range: ${range.startDay} through ${range.today} (${range.days.length} Phoenix days)`);
  lines.push("");
  lines.push("## Executive Read");
  lines.push("");
  lines.push(`- Nginx human-ish page requests: ${fmt(sum(range.days, access.byDay, "humanishPageRequests"))}`);
  lines.push(`- Nginx total page requests: ${fmt(sum(range.days, access.byDay, "pageRequests"))}`);
  lines.push(`- First-party clean page views: ${firstParty.available ? fmt(sum(range.days, firstParty.byDay, "cleanPageViews")) : `unavailable (${firstParty.error})`}`);
  lines.push(`- Central analytics reportable page views: ${central.available ? fmt(sum(range.days, central.byDay, "reportablePageViews")) : `unavailable (${central.error})`}`);
  lines.push(`- GSC clicks / impressions: ${gsc.available ? `${fmt(sum(range.days, gsc.byDay, "clicks"))} / ${fmt(sum(range.days, gsc.byDay, "impressions"))}` : `unavailable (${gsc.error})`}`);
  lines.push(`- Regression flags: ${flags.length ? flags.join("; ") : "none in the checked range"}`);
  lines.push("");
  lines.push("## Daily Table");
  lines.push("");
  lines.push("| Date | Nginx human pages | Nginx pages | First-party clean PV | Central reportable PV | GSC clicks | GSC impr. | 4xx | 5xx | Chunk | Tracker | Share 404 | Image 401 | Pin refs |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const day of range.days) {
    const raw = access.byDay[day] || {};
    const fp = firstParty.byDay?.[day] || {};
    const ca = central.byDay?.[day] || {};
    const gs = gsc.byDay?.[day] || {};
    lines.push(`| ${day} | ${fmt(raw.humanishPageRequests)} | ${fmt(raw.pageRequests)} | ${firstParty.available ? fmt(fp.cleanPageViews) : "n/a"} | ${central.available ? fmt(ca.reportablePageViews) : "n/a"} | ${gsc.available ? fmt(gs.clicks) : "n/a"} | ${gsc.available ? fmt(gs.impressions) : "n/a"} | ${fmt(raw.status4xx)} | ${fmt(raw.status5xx)} | ${fmt(raw.chunkFailures)} | ${fmt(raw.trackerFailures)} | ${fmt(raw.shareApi404s)} | ${fmt(raw.image401s)} | ${fmt(raw.pinterestRefs)} |`);
  }
  lines.push("");
  lines.push("## Source Detail");
  lines.push("");
  lines.push(`- Nginx requests: ${fmt(sum(range.days, access.byDay, "requests"))}; unique client+UA pairs: ${fmt(sum(range.days, access.byDay, "uniqueClients"))}`);
  lines.push(`- Private source-map 404s: ${fmt(sum(range.days, access.byDay, "sourceMapFailures"))} (tracked separately from JS/CSS chunk delivery failures)`);
  lines.push(`- First-party events: ${firstParty.available ? `${fmt(sum(range.days, firstParty.byDay, "total"))} total, ${fmt(sum(range.days, firstParty.byDay, "engagements"))} engagements, ${fmt(sum(range.days, firstParty.byDay, "cards"))} card/game/share/print events, ${fmt(sum(range.days, firstParty.byDay, "signups"))} signups, ${fmt(sum(range.days, firstParty.byDay, "checkouts"))} checkout events` : "unavailable"}`);
  lines.push(`- Central analytics events: ${central.available ? `${fmt(sum(range.days, central.byDay, "events"))} total, ${fmt(sum(range.days, central.byDay, "reportableEvents"))} reportable, ${fmt(sum(range.days, central.byDay, "visitors"))} unique visitors` : "unavailable"}`);
  lines.push("");
  lines.push("## Top External Referrers");
  lines.push("");
  if (refs.length) {
    for (const [ref, count] of refs) lines.push(`- ${ref}: ${fmt(count)}`);
  } else {
    lines.push("- none");
  }
  lines.push("");
  lines.push("## First-party Sources");
  lines.push("");
  if (firstParty.sources?.length) {
    for (const row of firstParty.sources) lines.push(`- ${row.source}: ${fmt(row.count)}`);
  } else {
    lines.push("- none or unavailable");
  }
  if (access.samples.length) {
    lines.push("");
    lines.push("## Error Samples");
    lines.push("");
    for (const sample of access.samples) lines.push(`- ${sample}`);
  }
  lines.push("");
  return lines.join("\n");
}

function writeReport(markdown, range) {
  const explicit = argValue("--output", "");
  const outPath = explicit || path.join(REPORT_DIR, `${range.today}.md`);
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, markdown);
    return outPath;
  } catch {
    const fallback = path.join(process.cwd(), `traffic-truth-${range.today}.md`);
    fs.writeFileSync(fallback, markdown);
    return fallback;
  }
}

async function postDiscord(markdown) {
  const url = process.env.MYBINGOCARD_EVENTS_WEBHOOK_URL || process.env.MYBINGOCARD_ERRORS_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  const summary = markdown
    .split("\n")
    .filter((line) => line.startsWith("- ") || line.startsWith("Generated:") || line.startsWith("Range:"))
    .slice(0, 9)
    .join("\n")
    .slice(0, 1900);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": USER_AGENT },
    body: JSON.stringify({ content: `MyBingoCard traffic truth report\n${summary}` }),
  });
  return res.ok;
}

async function main() {
  loadEnvFile(path.join(APP_DIR, ".env.local"));
  loadEnvFile(ANALYTICS_ENV_PATH);

  const range = dateRange(argValue("--days", "14"));
  const [access, firstParty, central, gsc] = await Promise.all([
    Promise.resolve(parseAccessLogs(range)),
    firstPartyActivity(range),
    centralAnalytics(range),
    gscAnalytics(range),
  ]);

  const markdown = buildMarkdown(range, access, firstParty, central, gsc);
  const outPath = hasArg("--no-write") ? "" : writeReport(markdown, range);
  console.log(markdown);
  if (outPath) console.log(`Report written: ${outPath}`);
  if (hasArg("--discord")) {
    const ok = await postDiscord(markdown);
    console.log(`Discord posted: ${ok ? "yes" : "no"}`);
  }
  if (hasArg("--json")) {
    console.log(JSON.stringify({ range, access, firstParty, central, gsc }, null, 2));
  }
}

main().catch((error) => {
  console.error("Traffic truth report failed:", error.message || error);
  process.exit(1);
});
