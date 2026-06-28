#!/usr/bin/env node
/**
 * MyBingoCard recurring ops loops.
 *
 * These jobs are internal-only. They may write local state/draft files and post
 * to Cory's Discord ops webhooks when --discord is passed, but they never send
 * customer email or publish social posts.
 */

const fs = require("node:fs");
const path = require("node:path");
const { MongoClient } = require("mongodb");

const APP_DIR = process.env.MYBINGOCARD_APP_DIR || path.resolve(__dirname, "..");
const APP_URL = (process.env.MYBINGOCARD_APP_URL || "https://mybingocard.com").replace(/\/$/, "");
const PHOENIX_TZ = "America/Phoenix";
const STATE_ROOT = process.env.MYBINGOCARD_OPS_LOOP_STATE_ROOT || "/var/lib/mybingocard/ops-loops";
const STATE_FILE = process.env.MYBINGOCARD_OPS_LOOP_STATE_FILE || path.join(STATE_ROOT, "state.json");
const DRAFT_DIR = process.env.MYBINGOCARD_OPS_LOOP_DRAFT_DIR || path.join(STATE_ROOT, "drafts");
const TRACKER_BASE =
  process.env.MYBINGOCARD_TRACKER_LIVE_URL ||
  "http://127.0.0.1:3098/api/live/events?domain=mybingocard.com";
const DEFAULT_MONGODB_URI = "mongodb://localhost:27017/mybingocard";

const MODES = [
  "owner-brief",
  "high-intent-followup",
  "support-inbox-cleanup",
  "revenue-watchdog",
  "seo-search-watchdog",
  "product-friction",
  "social-content-queue",
];

const MODE_META = {
  "owner-brief": {
    label: "Owner Brief",
    cadence: "Daily at 8:15 AM",
    defaultAction: "Scan the KPI summary.",
  },
  "high-intent-followup": {
    label: "High-Intent Visitors",
    cadence: "Every 4 hours",
    defaultAction: "Review draft queue only if new visitors appear.",
  },
  "support-inbox-cleanup": {
    label: "Support Inbox",
    cadence: "Every 2 hours",
    defaultAction: "Review new human tickets. No replies are sent.",
  },
  "revenue-watchdog": {
    label: "Revenue Watchdog",
    cadence: "Every 4 hours",
    defaultAction: "Review only when an alert condition appears.",
  },
  "seo-search-watchdog": {
    label: "SEO Search Watchdog",
    cadence: "Daily at 8:45 AM",
    defaultAction: "Confirm crawl/search basics are healthy.",
  },
  "product-friction": {
    label: "Product Friction",
    cadence: "Daily at 6:10 PM",
    defaultAction: "Review top repeated friction paths.",
  },
  "social-content-queue": {
    label: "Content Draft Queue",
    cadence: "Daily at 6:20 PM",
    defaultAction: "Review drafts. Nothing is posted externally.",
  },
};

const STATUS_META = {
  alert: { label: "ALERT", color: 0xdc2626 },
  watch: { label: "WATCH", color: 0xf59e0b },
  ok: { label: "OK", color: 0x16a34a },
  brief: { label: "BRIEF", color: 0x2563eb },
  draft: { label: "DRAFT", color: 0x2563eb },
  quiet: { label: "QUIET", color: 0x64748b },
};

function hasArg(name) {
  return process.argv.includes(name);
}

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
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
    // Optional for local dry-runs.
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function phoenixParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PHOENIX_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function phoenixDay(date = new Date()) {
  const parts = phoenixParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function phoenixStamp(date = new Date()) {
  const parts = phoenixParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} MST`;
}

function dateSlug(date = new Date()) {
  const parts = phoenixParts(date);
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function clamp(value, max = 1000) {
  const text = String(value ?? "").trim();
  if (text.length <= max) return text || "none";
  return `${text.slice(0, max - 3)}...`;
}

function number(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function percent(numerator, denominator) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function eventKey(event) {
  return event.event || event.eventType || event.name || "";
}

function eventPath(event) {
  return event.pathname || event.path || event.metadata?.pagePath || "/";
}

function eventAt(event) {
  return event.createdAt || event.receivedAt || event.timestamp || event.at || "";
}

function maskEmail(email) {
  const value = String(email || "").toLowerCase();
  const match = value.match(/([^@\s]+)@([^@\s]+)/);
  if (!match) return value ? clamp(value, 60) : "unknown";
  const local = match[1];
  const domain = match[2];
  return `${local.slice(0, 2)}***@${domain}`;
}

function isSupportNoise(ticket) {
  const subject = String(ticket.subject || "");
  const email = String(ticket.email || "").toLowerCase().replace(/[<>]/g, "").trim();
  return /deliverability status|warmup check|warm-up check|quick inbox check|delivery status notification|undelivered|returned to sender|failure notice|mail delivery|placement note|upload your catalog|creator'?s guide|unlock the full mybingocard experience|beyond the scroll|a\/b test your content|app合作机会|问候|collaboration opportunity|合作机会|csv upload|csv file was uploaded|tips for creating great pins|summer break re:/i.test(subject) ||
    /@(yourvpn\.ai|yourestimate\.app|demandletterservice\.com|notifications\.pinterest\.com|info\.pinterest\.com|account\.pinterest\.com|pinterest\.com|saashub\.com|douwudao\.com|tnca\.connectionsacademy\.org)$/i.test(email);
}

function shortenPathLabel(value, max = 86) {
  const text = String(value || "unknown").trim();
  if (!text) return "unknown";
  try {
    const parsed = new URL(text, APP_URL);
    const keys = [...parsed.searchParams.keys()].slice(0, 3);
    const queryLabel = keys.length ? `?${keys.join(",")}` : "";
    return clamp(`${parsed.pathname}${queryLabel}`, max);
  } catch {
    const [pathname, query = ""] = text.split("?");
    if (!query) return clamp(pathname || text, max);
    const keys = query
      .split("&")
      .map((part) => part.split("=")[0])
      .filter(Boolean)
      .slice(0, 3);
    return clamp(`${pathname}?${keys.join(",")}`, max);
  }
}

function hostFromReferrer(referrer) {
  if (!referrer || referrer === "Direct / unknown") return "direct";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return String(referrer).slice(0, 80);
  }
}

function top(items, keyFn, limit = 5) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit);
}

function formatPairs(pairs) {
  return pairs.length
    ? pairs.slice(0, 8).map(([key, count], idx) => `${idx + 1}. ${key} - ${number(count)}`).join("\n")
    : "`none`";
}

function formatCompactList(items) {
  return items.length ? items.join("\n") : "`none`";
}

function cleanTrackerLabel(item, labelKey) {
  const value = item[labelKey] || item.referrer || item.pathname || "unknown";
  if (labelKey === "referrer" || item.referrer) return hostFromReferrer(value);
  return shortenPathLabel(value);
}

function trackerUrl(hours, limit = 500) {
  const url = new URL(TRACKER_BASE);
  if (!url.searchParams.has("domain")) url.searchParams.set("domain", "mybingocard.com");
  url.searchParams.set("period_minutes", String(Math.max(15, Math.round(hours * 60))));
  url.searchParams.set("limit", String(limit));
  return url.toString();
}

async function fetchJson(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "MyBingoCardOpsLoops/1.0", accept: "application/json,text/plain,*/*" },
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "MyBingoCardOpsLoops/1.0", accept: "text/html,application/xml,text/plain,*/*" },
      signal: controller.signal,
      redirect: "follow",
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text, contentType: res.headers.get("content-type") || "" };
  } finally {
    clearTimeout(timer);
  }
}

function trackerEvents(data) {
  return Array.isArray(data?.events) ? data.events : [];
}

function trackerSummary(data) {
  const site = data?.siteSummary || {};
  const stats = data?.stats || {};
  return {
    events: Number(site.events || 0),
    sessions: Number(site.sessions || 0),
    visitors: Number(site.visitors || 0),
    pageviews: Number(site.pageviews || 0),
    clicks: Number(site.clicks || 0),
    leads: Number(site.leads || 0),
    activeVisitors: Number(stats.activeVisitors || 0),
    eventsLastHour: Number(stats.eventsLastHour || 0),
  };
}

function topTrackerList(items, labelKey = "pathname", countKey = "events", limit = 5) {
  return (Array.isArray(items) ? items : [])
    .slice(0, limit)
    .map((item, idx) => `${idx + 1}. ${cleanTrackerLabel(item, labelKey)} - ${number(item[countKey] || 0)}`)
    .join("\n") || "`none`";
}

let mongoClient = null;
let mongoDb = null;
let collectionNameCache = null;

async function getDb() {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGODB_URI || DEFAULT_MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db("mybingocard");
  }
  return mongoDb;
}

async function collectionNames(db) {
  if (!collectionNameCache) {
    collectionNameCache = new Set((await db.listCollections().toArray()).map((item) => item.name));
  }
  return collectionNameCache;
}

async function hasCollection(db, name) {
  return (await collectionNames(db)).has(name);
}

async function countDocuments(db, name, filter = {}) {
  if (!(await hasCollection(db, name))) return 0;
  return db.collection(name).countDocuments(filter);
}

async function recentCount(db, name, field, since, filter = {}) {
  if (!(await hasCollection(db, name))) return 0;
  return db.collection(name).countDocuments({ ...filter, [field]: { $gte: since } });
}

async function activityCounts(db, events, since) {
  if (!(await hasCollection(db, "activity_events"))) return {};
  const rows = await db.collection("activity_events").aggregate([
    { $match: { createdAt: { $gte: since }, event: { $in: events } } },
    { $group: { _id: "$event", count: { $sum: 1 } } },
  ]).toArray();
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

async function topActivity(db, since, events, limit = 8) {
  if (!(await hasCollection(db, "activity_events"))) return [];
  const match = { createdAt: { $gte: since } };
  if (events?.length) match.event = { $in: events };
  return db.collection("activity_events").aggregate([
    { $match: match },
    { $group: { _id: { event: "$event", pathname: "$pathname" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]).toArray();
}

function inferStatus(result) {
  if (result.status) return result.status;
  if (result.mode === "owner-brief") return "brief";
  if (result.mode === "social-content-queue") return "draft";
  if (result.color === STATUS_META.alert.color) return "alert";
  if (result.color === STATUS_META.watch.color) return "watch";
  if (result.color === STATUS_META.ok.color) return "ok";
  return result.shouldPost ? "watch" : "quiet";
}

function normalizeField(field) {
  return {
    name: clamp(field.name, 250),
    value: clamp(field.value, 1000),
    inline: Boolean(field.inline),
  };
}

function buildEmbed(result) {
  const mode = MODE_META[result.mode] || {
    label: result.mode || "Ops Loop",
    cadence: "Scheduled loop",
    defaultAction: "Review if needed.",
  };
  const status = STATUS_META[inferStatus(result)] || STATUS_META.watch;
  const description = [
    clamp(result.summary || "", 1200),
    `**Action:** ${result.nextAction || mode.defaultAction}`,
  ].filter(Boolean).join("\n\n");
  const fields = [
    { name: "Cadence", value: mode.cadence, inline: true },
    { name: "Status", value: status.label, inline: true },
    result.draftPath ? { name: "Draft artifact", value: `\`${result.draftPath}\``, inline: false } : null,
    ...(result.fields || []),
  ].filter(Boolean).slice(0, 20).map(normalizeField);

  return {
    author: { name: "MyBingoCard Ops" },
    title: `${status.label} | ${mode.label}`,
    url: APP_URL,
    description: clamp(description, 3900),
    color: result.color || status.color,
    fields,
    footer: { text: result.footer || `Phoenix time - ${phoenixStamp()}` },
    timestamp: new Date().toISOString(),
  };
}

async function sendDiscord(result) {
  const webhook =
    result.webhook === "visitors"
      ? process.env.MYBINGOCARD_VISITORS_WEBHOOK_URL
      : result.webhook === "errors"
        ? process.env.MYBINGOCARD_ERRORS_WEBHOOK_URL
        : process.env.MYBINGOCARD_EVENTS_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) throw new Error("No Discord webhook configured for this loop");

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: result.content || "",
      embeds: [buildEmbed(result)],
    }),
  });
  if (!res.ok) throw new Error(`Discord webhook failed: HTTP ${res.status} ${await res.text()}`);
  return true;
}

function shouldSkipDedupe(state, result) {
  if (!result.dedupeKey) return false;
  const posted = state.posted || {};
  const previous = posted[result.dedupeKey];
  if (!previous) return false;
  const cooldownMs = (result.cooldownMinutes || 0) * 60 * 1000;
  if (!cooldownMs) return true;
  return Date.now() - new Date(previous).getTime() < cooldownMs;
}

function markPosted(state, result) {
  if (!result.dedupeKey) return;
  state.posted = state.posted || {};
  state.posted[result.dedupeKey] = new Date().toISOString();
}

async function dispatchResult(state, result, options) {
  const printable = {
    mode: result.mode,
    shouldPost: Boolean(result.shouldPost),
    title: result.title,
    summary: result.summary,
    fields: result.fields || [],
    draftPath: result.draftPath || null,
  };

  if (options.json) {
    console.log(JSON.stringify(printable, null, 2));
  } else {
    console.log(`[${result.mode}] ${result.title}`);
    console.log(result.summary || "");
    for (const field of result.fields || []) {
      console.log(`- ${field.name}: ${String(field.value).replace(/\n/g, " | ")}`);
    }
    if (result.draftPath) console.log(`- draft: ${result.draftPath}`);
  }

  if (!result.shouldPost || options.noPost || !options.discord) return false;
  if (!options.forcePost && shouldSkipDedupe(state, result)) {
    console.log(`[${result.mode}] skipped duplicate Discord post: ${result.dedupeKey}`);
    return false;
  }

  await sendDiscord(result);
  markPosted(state, result);
  if (Array.isArray(result.markHighIntentSeen)) {
    const seen = state.highIntentSeen || {};
    for (const item of result.markHighIntentSeen) {
      if (item.key) seen[item.key] = item.lastSeenAt || new Date().toISOString();
    }
    state.highIntentSeen = Object.fromEntries(Object.entries(seen).slice(-1000));
  }
  console.log(`[${result.mode}] posted to Discord`);
  return true;
}

async function ownerBrief() {
  const db = await getDb();
  const tracker = await fetchJson(trackerUrl(24, 500)).catch((error) => ({ error: error.message }));
  const summary = trackerSummary(tracker);
  const since24 = hoursAgo(24);
  const since7 = hoursAgo(24 * 7);

  const [
    totalUsers,
    users24h,
    users7d,
    paidUsers,
    totalCards,
    cards24h,
    openTickets,
    tickets24h,
    bounces24h,
  ] = await Promise.all([
    countDocuments(db, "users"),
    recentCount(db, "users", "createdAt", since24),
    recentCount(db, "users", "createdAt", since7),
    countDocuments(db, "users", { planType: { $ne: "FREE" }, subscriptionStatus: { $in: ["active", "trialing", "lifetime"] } }),
    countDocuments(db, "cards"),
    recentCount(db, "cards", "createdAt", since24),
    countDocuments(db, "support_tickets", { status: "open" }),
    recentCount(db, "support_tickets", "receivedAt", since24),
    recentCount(db, "email_bounces", "detectedAt", since24),
  ]);

  const revenueEvents = await activityCounts(db, [
    "billing_payment_succeeded",
    "billing_payment_failed",
    "checkout_started",
    "checkout_loaded",
    "checkout_cancel_clicked",
    "checkout_abandoned",
    "subscription_canceled",
    "share_links_checkout_started",
    "email_share_checkout_started",
  ], since24);

  const frictionEvents = await activityCounts(db, [
    "dead_click",
    "card_save_blocked",
    "save_blocked_auth_required",
    "checkout_cancel_clicked",
    "image_upload_failed",
    "game_create_failed",
    "ai_generate_failed",
    "client_error_captured",
  ], since24);

  const trackerNote = tracker.error ? `Tracker unavailable: ${tracker.error}` : `${number(summary.visitors)} visitors, ${number(summary.sessions)} sessions, ${number(summary.pageviews)} pageviews, ${number(summary.leads)} leads`;

  return {
    mode: "owner-brief",
    title: "MyBingoCard owner brief",
    summary: `${trackerNote}\nGenerated ${phoenixStamp()}. Internal ops summary only.`,
    status: "brief",
    nextAction: "Scan traffic, support, and friction. No external action was taken.",
    color: 0x2563eb,
    webhook: "events",
    shouldPost: true,
    dedupeKey: `owner-brief:${phoenixDay()}`,
    fields: [
      { name: "Traffic", value: trackerNote, inline: false },
      { name: "Users", value: `total ${number(totalUsers)}\nnew 24h ${number(users24h)}\nnew 7d ${number(users7d)}\npaid/trial/lifetime ${number(paidUsers)}`, inline: true },
      { name: "Cards", value: `total ${number(totalCards)}\nnew 24h ${number(cards24h)}`, inline: true },
      { name: "Support", value: `open ${number(openTickets)}\nnew 24h ${number(tickets24h)}\nbounces 24h ${number(bounces24h)}`, inline: true },
      { name: "Revenue signals", value: formatPairs(Object.entries(revenueEvents).sort((a, b) => b[1] - a[1])), inline: false },
      { name: "Friction signals", value: formatPairs(Object.entries(frictionEvents).sort((a, b) => b[1] - a[1])), inline: false },
      { name: "Top pages", value: tracker.error ? "tracker unavailable" : topTrackerList(tracker.topPages, "pathname", "events"), inline: false },
      { name: "Top referrers", value: tracker.error ? "tracker unavailable" : topTrackerList(tracker.referrers, "referrer", "events"), inline: false },
    ],
  };
}

function scoreVisitor(visitor) {
  let score = 0;
  const lastPath = String(visitor.lastPath || "");
  if (visitor.leadActions > 0) score += 5;
  if (/create|pricing|checkout|share|cards|game/i.test(lastPath)) score += 3;
  if (Number(visitor.pageviews || 0) >= 3) score += 2;
  if (Number(visitor.events || 0) >= 20) score += 2;
  if (Number(visitor.durationSeconds || 0) >= 180) score += 2;
  if (/(chatgpt|google|bing|pinterest|facebook|reddit|linkedin)/i.test(String(visitor.lastReferrer || visitor.referrer || ""))) score += 1;
  return score;
}

async function highIntentFollowup(state, options) {
  const hours = Number(options.hours || 4);
  const tracker = await fetchJson(trackerUrl(hours, 800));
  const visitors = (Array.isArray(tracker.recentVisitors) ? tracker.recentVisitors : [])
    .map((visitor) => ({ ...visitor, score: scoreVisitor(visitor) }))
    .filter((visitor) => visitor.score >= 5)
    .sort((a, b) => b.score - a.score || new Date(b.lastSeenAt || 0) - new Date(a.lastSeenAt || 0));

  const seen = state.highIntentSeen || {};
  const fresh = visitors.filter((visitor) => {
    const key = visitor.visitorKey || visitor.visitorId || visitor.anonymousId;
    if (!key) return false;
    return seen[key] !== visitor.lastSeenAt;
  }).slice(0, 8);

  const draftPath = path.join(DRAFT_DIR, `high-intent-${dateSlug()}.json`);
  if (fresh.length && !options.dryRun) {
    writeJson(draftPath, {
      generatedAt: new Date().toISOString(),
      note: "Internal lead review only. No external follow-up was sent.",
      visitors: fresh.map((visitor) => ({
        visitorKey: visitor.visitorKey,
        visitorName: visitor.visitorName || visitor.displayName || "Anon",
        score: visitor.score,
        lastPath: visitor.lastPath,
        pageviews: visitor.pageviews,
        events: visitor.events,
        leadActions: visitor.leadActions,
        firstSeenAt: visitor.firstSeenAt,
        lastSeenAt: visitor.lastSeenAt,
        suggestedAction: "Review session path and draft a tailored follow-up only if the visitor provided contact info through normal product channels.",
      })),
    });
  }

  return {
    mode: "high-intent-followup",
    title: "MyBingoCard high-intent visitor follow-up queue",
    summary: fresh.length
      ? `${fresh.length} new high-intent visitor(s) in the last ${hours}h. Draft queue only; no customer contact sent.`
      : `No new high-intent visitors in the last ${hours}h.`,
    status: fresh.length ? "watch" : "quiet",
    nextAction: fresh.length ? "Review the draft artifact before any customer contact." : "No action needed.",
    color: fresh.length ? 0x16a34a : 0x64748b,
    webhook: "visitors",
    shouldPost: fresh.length > 0,
    dedupeKey: `high-intent:${phoenixDay()}:${phoenixParts().hour}`,
    cooldownMinutes: 180,
    draftPath: fresh.length ? draftPath : null,
    markHighIntentSeen: fresh.map((visitor) => ({
      key: visitor.visitorKey || visitor.visitorId || visitor.anonymousId,
      lastSeenAt: visitor.lastSeenAt,
    })),
    fields: [
      {
        name: "Fresh visitors",
        value: fresh.length
          ? fresh.slice(0, 5).map((visitor) => {
            const name = visitor.visitorName || visitor.displayName || "Anon";
            return `${name} - score ${visitor.score}, ${number(visitor.pageviews)} pages, ${number(visitor.events)} events, last ${visitor.lastPath || "unknown"}`;
          }).join("\n")
          : "none",
        inline: false,
      },
      { name: "Top pages", value: topTrackerList(tracker.topPages, "pathname", "events"), inline: false },
    ],
  };
}

async function supportInboxCleanup(options) {
  const db = await getDb();
  const since24 = hoursAgo(24);
  const since2 = hoursAgo(Number(options.hours || 2));
  const [openTickets, newTickets, bounces24h, hardBounces24h] = await Promise.all([
    hasCollection(db, "support_tickets").then((ok) => ok
      ? db.collection("support_tickets").find({ status: "open" }, {
        projection: { email: 1, subject: 1, receivedAt: 1, isReply: 1 },
      }).sort({ receivedAt: -1 }).limit(200).toArray()
      : []),
    hasCollection(db, "support_tickets").then((ok) => ok
      ? db.collection("support_tickets").find({ receivedAt: { $gte: since2 } }, {
        projection: { email: 1, subject: 1, receivedAt: 1, isReply: 1 },
      }).sort({ receivedAt: -1 }).limit(50).toArray()
      : []),
    recentCount(db, "email_bounces", "detectedAt", since24),
    recentCount(db, "email_bounces", "detectedAt", since24, { bounceType: "hard" }),
  ]);

  const openHumanTickets = openTickets.filter((ticket) => !isSupportNoise(ticket));
  const newHumanTickets = newTickets.filter((ticket) => !isSupportNoise(ticket));
  const bounceAlertThreshold = Number(process.env.MYBINGOCARD_OPS_BOUNCE_ALERT_THRESHOLD || 250);
  const bounceSpike = hardBounces24h >= bounceAlertThreshold;
  const isMorningQueueCheck = phoenixParts().hour === "08";
  const shouldPost = newHumanTickets.length > 0 || bounceSpike || (isMorningQueueCheck && openHumanTickets.length > 0);
  const draftPath = path.join(DRAFT_DIR, `support-cleanup-${dateSlug()}.json`);
  if (shouldPost && !options.dryRun) {
    writeJson(draftPath, {
      generatedAt: new Date().toISOString(),
      note: "Internal support queue summary. No email reply was sent.",
      openTickets: openHumanTickets.map((ticket) => ({
        id: String(ticket._id),
        from: maskEmail(ticket.email),
        subject: ticket.subject,
        receivedAt: ticket.receivedAt,
        isReply: Boolean(ticket.isReply),
      })),
      recentTickets: newHumanTickets.map((ticket) => ({
        id: String(ticket._id),
        from: maskEmail(ticket.email),
        subject: ticket.subject,
        receivedAt: ticket.receivedAt,
        isReply: Boolean(ticket.isReply),
      })),
      bounces24h,
      hardBounces24h,
    });
  }

  return {
    mode: "support-inbox-cleanup",
    title: "MyBingoCard support inbox cleanup",
    summary: `${openHumanTickets.length} open human ticket(s), ${newHumanTickets.length} new human ticket(s) in this window, ${number(bounces24h)} bounce(s) in 24h. No replies sent.`,
    status: shouldPost ? "watch" : "quiet",
    nextAction: shouldPost ? "Review the support draft. No replies were sent." : "No new support action in this window.",
    color: shouldPost ? 0xf59e0b : 0x64748b,
    webhook: "events",
    shouldPost,
    dedupeKey: newHumanTickets.length
      ? `support-cleanup:new:${newHumanTickets.map((ticket) => String(ticket._id)).join(",")}`
      : `support-cleanup:${phoenixDay()}:${bounceSpike ? "bounce-spike" : "morning-queue"}`,
    cooldownMinutes: 720,
    draftPath: shouldPost ? draftPath : null,
    fields: [
      {
        name: "Open human queue",
        value: openHumanTickets.length
          ? openHumanTickets.slice(0, 5).map((ticket) => `${maskEmail(ticket.email)} - ${clamp(ticket.subject || "(no subject)", 120)}`).join("\n")
          : "none",
        inline: false,
      },
      { name: "Filtered operational noise", value: `open ${number(openTickets.length - openHumanTickets.length)}\nnew ${number(newTickets.length - newHumanTickets.length)}`, inline: true },
      { name: "Bounce health", value: `24h bounces ${number(bounces24h)}\n24h hard bounces ${number(hardBounces24h)}\nalert threshold ${number(bounceAlertThreshold)}`, inline: true },
    ],
  };
}

async function revenueWatchdog(options) {
  const db = await getDb();
  const since = hoursAgo(Number(options.hours || 4));
  const events = await activityCounts(db, [
    "billing_payment_succeeded",
    "billing_payment_failed",
    "checkout_started",
    "checkout_loaded",
    "checkout_cancel_clicked",
    "checkout_abandoned",
    "subscription_canceled",
    "share_links_checkout_started",
    "email_share_checkout_started",
    "batch_cards_created",
    "share_links_generated",
  ], since);

  const pendingShareRefs = await countDocuments(db, "share_link_checkout_refs");
  const pendingEmailRefs = await countDocuments(db, "share_email_checkout_refs");
  const pastDueUsers = await countDocuments(db, "users", {
    planType: { $ne: "FREE" },
    subscriptionStatus: "past_due",
  });
  const pastDueAlertThreshold = Number(process.env.MYBINGOCARD_OPS_PAST_DUE_ALERT_THRESHOLD || 3);
  const failed = Number(events.billing_payment_failed || 0);
  const abandoned = Number(events.checkout_abandoned || 0);
  const canceled = Number(events.checkout_cancel_clicked || 0);
  const started =
    Number(events.checkout_started || 0) +
    Number(events.checkout_loaded || 0) +
    Number(events.share_links_checkout_started || 0) +
    Number(events.email_share_checkout_started || 0);
  const succeeded = Number(events.billing_payment_succeeded || 0);
  const issues = [];
  if (failed > 0) issues.push(`${failed} billing payment failure(s)`);
  if (abandoned >= 3) issues.push(`${abandoned} abandoned checkout(s)`);
  if (started >= 3 && succeeded === 0 && canceled >= 3) issues.push(`${canceled}/${started} checkout cancel/load signals with no payment success`);
  if (pendingShareRefs + pendingEmailRefs >= 5) issues.push(`${pendingShareRefs + pendingEmailRefs} pending checkout ref doc(s)`);
  if (pastDueUsers >= pastDueAlertThreshold) issues.push(`${pastDueUsers} past-due paid user(s)`);

  return {
    mode: "revenue-watchdog",
    title: issues.length ? "MyBingoCard revenue watchdog needs review" : "MyBingoCard revenue watchdog clear",
    summary: issues.length ? issues.join("\n") : "No revenue-path alert conditions in this window.",
    status: issues.length ? "alert" : "ok",
    nextAction: issues.length ? "Review revenue path details before changing anything." : "No action needed.",
    color: issues.length ? 0xdc2626 : 0x16a34a,
    webhook: issues.length ? "errors" : "events",
    shouldPost: issues.length > 0,
    dedupeKey: `revenue-watchdog:${phoenixDay()}:${issues.join("|")}`,
    cooldownMinutes: 240,
    fields: [
      { name: "Window events", value: formatPairs(Object.entries(events).sort((a, b) => b[1] - a[1])), inline: false },
      { name: "Open checkout refs", value: `share links ${number(pendingShareRefs)}\nshare email ${number(pendingEmailRefs)}`, inline: true },
      { name: "Past due users", value: `${number(pastDueUsers)} (alert at ${number(pastDueAlertThreshold)})`, inline: true },
    ],
  };
}

async function seoSearchWatchdog() {
  const checks = [];
  for (const pathname of ["/", "/create", "/pricing", "/robots.txt", "/sitemap.xml"]) {
    const res = await fetchText(`${APP_URL}${pathname}`).catch((error) => ({ ok: false, status: "ERR", text: error.message }));
    checks.push({ pathname, ...res });
  }
  const issues = [];
  for (const check of checks) {
    if (!check.ok) issues.push(`${check.pathname} status ${check.status}`);
  }
  const robots = checks.find((check) => check.pathname === "/robots.txt");
  const sitemap = checks.find((check) => check.pathname === "/sitemap.xml");
  if (robots?.ok && !/sitemap:/i.test(robots.text)) issues.push("robots.txt does not mention sitemap");
  if (sitemap?.ok && !/mybingocard\.com/i.test(sitemap.text)) issues.push("sitemap.xml does not include mybingocard.com URLs");

  let trafficTruth = "not found";
  try {
    const stat = fs.statSync("/var/log/mybingocard-traffic-truth.log");
    const ageHours = (Date.now() - stat.mtimeMs) / 3600000;
    trafficTruth = `${ageHours.toFixed(1)}h old`;
    if (ageHours > 36) issues.push(`traffic truth log is stale (${trafficTruth})`);
  } catch {
    issues.push("traffic truth log missing");
  }

  const tracker = await fetchJson(trackerUrl(24, 500)).catch(() => null);
  const referrers = tracker?.referrers || [];
  const searchSessions = referrers
    .filter((row) => /google|bing|yahoo|duckduckgo|search:/i.test(String(row.referrer || "")))
    .reduce((sum, row) => sum + Number(row.sessions || 0), 0);
  const aiSessions = referrers
    .filter((row) => /chatgpt|openai|perplexity|claude|copilot|gemini/i.test(String(row.referrer || "")))
    .reduce((sum, row) => sum + Number(row.sessions || 0), 0);

  return {
    mode: "seo-search-watchdog",
    title: issues.length ? "MyBingoCard SEO/search watchdog needs review" : "MyBingoCard SEO/search watchdog clear",
    summary: issues.length ? issues.join("\n") : "SEO-critical pages, robots, sitemap, and traffic truth freshness are clear.",
    status: issues.length ? "alert" : "ok",
    nextAction: issues.length ? "Review failed checks before making changes." : "No action needed.",
    color: issues.length ? 0xdc2626 : 0x16a34a,
    webhook: issues.length ? "errors" : "events",
    shouldPost: true,
    dedupeKey: `seo-search-watchdog:${phoenixDay()}`,
    fields: [
      { name: "HTTP checks", value: checks.map((check) => `${check.pathname}: ${check.status}`).join("\n"), inline: true },
      { name: "Traffic truth log", value: trafficTruth, inline: true },
      { name: "Discovery 24h", value: `search sessions ${number(searchSessions)}\nAI ref sessions ${number(aiSessions)}`, inline: true },
      { name: "Top referrers", value: tracker ? topTrackerList(referrers, "referrer", "events") : "tracker unavailable", inline: false },
    ],
  };
}

async function productFriction(options) {
  const db = await getDb();
  const since = hoursAgo(Number(options.hours || 24));
  const events = [
    "dead_click",
    "card_save_blocked",
    "save_blocked_auth_required",
    "checkout_cancel_clicked",
    "image_upload_failed",
    "game_create_failed",
    "game_join_failed",
    "ai_generate_failed",
    "client_error_captured",
    "client_marketing_tracking_failure",
    "batch_pdf_export_blocked",
    "card_create_failed",
    "api_error",
  ];
  const counts = await activityCounts(db, events, since);
  const rows = await topActivity(db, since, events, 10);
  const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
  const highPriority = Number(counts.client_error_captured || 0) + Number(counts.api_error || 0) + Number(counts.card_create_failed || 0);

  return {
    mode: "product-friction",
    title: total ? "MyBingoCard product friction report" : "MyBingoCard product friction clear",
    summary: total
      ? `${number(total)} friction signal(s) in the last ${Number(options.hours || 24)}h. Highest priority count: ${number(highPriority)}.`
      : `No tracked friction signals in the last ${Number(options.hours || 24)}h.`,
    status: highPriority ? "alert" : total ? "watch" : "ok",
    nextAction: total ? "Review repeated paths and decide whether a product fix is needed." : "No action needed.",
    color: highPriority ? 0xdc2626 : total ? 0xf59e0b : 0x16a34a,
    webhook: highPriority ? "errors" : "events",
    shouldPost: total > 0,
    dedupeKey: `product-friction:${phoenixDay()}`,
    fields: [
      { name: "Signal mix", value: formatPairs(Object.entries(counts).sort((a, b) => b[1] - a[1])), inline: false },
      {
        name: "Top paths",
        value: rows.length
          ? rows.map((row, idx) => `${idx + 1}. ${row._id.event} on ${shortenPathLabel(row._id.pathname)} - ${number(row.count)}`).join("\n")
          : "`none`",
        inline: false,
      },
    ],
  };
}

function contentIdeasFromTracker(tracker) {
  const pages = Array.isArray(tracker?.topPages) ? tracker.topPages : [];
  const referrers = Array.isArray(tracker?.referrers) ? tracker.referrers : [];
  const ideas = [];
  const pageNames = pages.map((page) => page.pathname || "").join(" ");
  const refNames = referrers.map((row) => row.referrer || "").join(" ");

  if (/create/i.test(pageNames)) {
    ideas.push({
      title: "Show the fastest path from blank idea to printable card",
      channel: "Pinterest/Facebook/LinkedIn draft",
      hook: "Need a bingo card today? Start with the maker, paste a theme, print in minutes.",
      source: "Create page is a top traffic page.",
    });
  }
  if (/pricing|checkout/i.test(pageNames)) {
    ideas.push({
      title: "Explain what is free versus paid",
      channel: "LinkedIn/Facebook draft",
      hook: "Create cards free. Pay only when you need exports, batches, sharing, or hosting.",
      source: "Pricing/checkout appeared in top paths.",
    });
  }
  if (/pinterest|pinimg/i.test(refNames)) {
    ideas.push({
      title: "Fresh printable bingo template pin",
      channel: "Pinterest draft",
      hook: "A clean printable bingo card for classrooms, teams, parties, and family nights.",
      source: "Pinterest referral traffic appeared.",
    });
  }
  if (/chatgpt|openai|perplexity|claude|gemini/i.test(refNames)) {
    ideas.push({
      title: "AI-discovered custom bingo card answer",
      channel: "Blog/social draft",
      hook: "When AI recommends a bingo maker, the page needs a direct answer and a fast creator path.",
      source: "AI referral traffic appeared.",
    });
  }
  if (/google|bing|duckduckgo/i.test(refNames)) {
    ideas.push({
      title: "Search-intent template roundup",
      channel: "SEO/social draft",
      hook: "Printable bingo card templates by use case: classroom, party, office, and live game.",
      source: "Search referral traffic appeared.",
    });
  }

  ideas.push({
    title: "Live game reminder",
    channel: "Facebook/LinkedIn draft",
    hook: "Turn any card into a hosted live bingo game for a class, team, or event.",
    source: "Evergreen product path.",
  });
  ideas.push({
    title: "Batch card use case",
    channel: "Pinterest/Facebook draft",
    hook: "Generate a whole batch of unique cards instead of duplicating one card by hand.",
    source: "Evergreen revenue path.",
  });

  const unique = [];
  const seen = new Set();
  for (const idea of ideas) {
    if (seen.has(idea.title)) continue;
    seen.add(idea.title);
    unique.push(idea);
  }
  return unique.slice(0, 6);
}

async function socialContentQueue(options) {
  const tracker = await fetchJson(trackerUrl(Number(options.hours || 24 * 7), 1000)).catch((error) => ({ error: error.message }));
  const ideas = contentIdeasFromTracker(tracker);
  const day = phoenixDay();
  const draftPath = path.join(DRAFT_DIR, `social-content-${day}.md`);
  if (!options.dryRun) {
    ensureDir(DRAFT_DIR);
    const body = [
      `# MyBingoCard Social Content Queue - ${day}`,
      "",
      "Internal draft queue only. Nothing here was posted externally.",
      "",
      "## Source Signals",
      "",
      tracker.error ? `- Tracker unavailable: ${tracker.error}` : `- Top pages: ${(tracker.topPages || []).slice(0, 5).map((page) => `${page.pathname} (${page.events})`).join(", ") || "none"}`,
      tracker.error ? "" : `- Top referrers: ${(tracker.referrers || []).slice(0, 5).map((row) => `${hostFromReferrer(row.referrer)} (${row.events})`).join(", ") || "none"}`,
      "",
      "## Draft Ideas",
      "",
      ...ideas.flatMap((idea, idx) => [
        `### ${idx + 1}. ${idea.title}`,
        "",
        `- Channel: ${idea.channel}`,
        `- Hook: ${idea.hook}`,
        `- Source: ${idea.source}`,
        "",
      ]),
    ].filter(Boolean).join("\n");
    fs.writeFileSync(draftPath, `${body}\n`);
  }

  return {
    mode: "social-content-queue",
    title: "MyBingoCard social/content draft queue",
    summary: `${ideas.length} internal content draft idea(s) generated. Nothing was posted externally.`,
    status: "draft",
    nextAction: "Review the draft artifact before posting anywhere.",
    color: 0x2563eb,
    webhook: "events",
    shouldPost: true,
    dedupeKey: `social-content-queue:${day}`,
    draftPath,
    fields: [
      { name: "Ideas", value: ideas.map((idea) => `${idea.channel}: ${idea.title}`).join("\n"), inline: false },
    ],
  };
}

async function runMode(mode, state, options) {
  switch (mode) {
    case "owner-brief":
      return ownerBrief(state, options);
    case "high-intent-followup":
      return highIntentFollowup(state, options);
    case "support-inbox-cleanup":
      return supportInboxCleanup(options);
    case "revenue-watchdog":
      return revenueWatchdog(options);
    case "seo-search-watchdog":
      return seoSearchWatchdog(options);
    case "product-friction":
      return productFriction(options);
    case "social-content-queue":
      return socialContentQueue(options);
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}

async function main() {
  loadEnvFile(path.join(APP_DIR, ".env.local"));
  ensureDir(STATE_ROOT);
  ensureDir(DRAFT_DIR);

  const modeArg = argValue("--mode", "owner-brief");
  const selectedModes = modeArg === "all" ? MODES : modeArg.split(",").map((mode) => mode.trim()).filter(Boolean);
  const unknown = selectedModes.filter((mode) => !MODES.includes(mode));
  if (unknown.length) {
    throw new Error(`Unknown mode(s): ${unknown.join(", ")}. Valid modes: ${MODES.join(", ")}, all`);
  }

  const options = {
    modeArg,
    discord: hasArg("--discord"),
    noPost: hasArg("--no-post"),
    dryRun: hasArg("--dry-run"),
    json: hasArg("--json"),
    forcePost: hasArg("--force-post"),
    hours: Number(argValue("--hours", "0")) || undefined,
  };

  const state = readJson(STATE_FILE, {});
  state.version = 1;
  state.lastRun = state.lastRun || {};

  for (const mode of selectedModes) {
    const result = await runMode(mode, state, options);
    state.lastRun[mode] = new Date().toISOString();
    await dispatchResult(state, result, options);
  }

  if (!options.dryRun) writeJson(STATE_FILE, state);
  if (mongoClient) await mongoClient.close();
}

main().catch(async (error) => {
  console.error(`[mybingocard-ops-loops] ${error.stack || error.message}`);
  if (mongoClient) await mongoClient.close().catch(() => {});
  process.exit(1);
});
