const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const APP_ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(APP_ROOT, ".env.local");
const REPORT_DATE = new Date();
const REPORT_DAY = REPORT_DATE.toISOString().slice(0, 10);
const OUTPUT_DIR = process.env.MYBINGOCARD_INSIGHTS_DIR || `/tmp/mybingocard-feature-insights-${REPORT_DAY}`;
const OBSIDIAN_NOTE =
  process.env.MYBINGOCARD_INSIGHTS_NOTE ||
  `/root/clawd/obsidian/clients/MyBingoCard/analytics-insights-${REPORT_DAY}.md`;

const FEATURE_DEFINITIONS = [
  {
    key: "create_edit_cards",
    label: "Create and edit cards",
    events: [
      "card_title_entered",
      "card_cells_added",
      "card_save_attempted",
      "card_save_succeeded",
      "card_created",
      "card_updated",
      "style_changed",
      "grid_size_changed",
      "free_space_toggled",
    ],
  },
  {
    key: "image_bingo",
    label: "Image bingo",
    events: ["image_picker_opened", "image_uploaded", "image_uploaded_local"],
  },
  {
    key: "print_export",
    label: "Print and export",
    events: ["export_pdf", "export_pdf_downloaded", "export_png", "export_png_downloaded", "card_printed"],
  },
  {
    key: "shared_play",
    label: "Share links and shared play",
    events: [
      "share_link_generated",
      "share_link_reused",
      "shared_card_viewed",
      "share_link_visited",
      "share_link_playing",
      "share_link_claimed",
      "card_share_link_copied",
      "card_shared",
      "social_share_clicked",
      "share_link_bingo",
    ],
  },
  {
    key: "templates",
    label: "Templates",
    events: ["templates_page_viewed", "template_clicked", "template_used"],
  },
  {
    key: "live_games",
    label: "Live games",
    events: [
      "game_created",
      "game_joined",
      "game_join_page_viewed",
      "game_player_page_viewed",
      "game_player_joined",
      "game_player_cell_marked",
      "game_player_bingo_claimed",
      "game_auto_call_toggled",
      "game_item_called",
      "game_cell_marked",
    ],
  },
  {
    key: "ai_generation",
    label: "AI generation",
    events: ["ai_generate_clicked", "ai_generate_completed", "ai_generate_failed", "ai_generate_gated", "first_ai_generation"],
  },
  {
    key: "batch_generation",
    label: "Batch generation",
    events: ["batch_tier_selected", "batch_cards_created", "batch_pdf_exported", "share_batch_modal_opened", "share_links_checkout_started"],
  },
  {
    key: "billing_upgrade",
    label: "Billing and upgrade",
    events: [
      "pricing_page_viewed",
      "upgrade_prompt_shown",
      "upgrade_prompt_clicked",
      "upgrade_dismissed",
      "plan_selected",
      "checkout_started",
      "checkout_loaded",
      "checkout_abandoned",
      "billing_payment_succeeded",
    ],
  },
  {
    key: "account_settings",
    label: "Account settings",
    events: [
      "settings_page_viewed",
      "settings_section_expanded",
      "profile_updated",
      "password_updated",
      "email_preferences_updated",
      "manage_subscription_clicked",
    ],
  },
  {
    key: "favorites",
    label: "Favorites",
    events: ["favorite_toggled"],
  },
];

function loadEnv() {
  try {
    for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      const value = match[2].trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (error) {
    console.warn(`Could not load ${ENV_PATH}: ${error.message}`);
  }
}

function cleanActivityMatch(since, extra = {}) {
  return {
    createdAt: { $gte: since },
    ...extra,
    $and: [
      {
        $or: [
          { userAgent: { $exists: false } },
          { userAgent: { $not: /HeadlessChrome|Playwright|Puppeteer/i } },
        ],
      },
      {
        $or: [
          { "metadata.userAgent": { $exists: false } },
          { "metadata.userAgent": { $not: /HeadlessChrome|Playwright|Puppeteer/i } },
        ],
      },
      {
        $or: [
          { email: { $exists: false } },
          { email: null },
          { email: { $not: /(^test|testqa|qa|example\.com)/i } },
        ],
      },
      {
        $or: [
          { event: { $exists: false } },
          { event: { $not: /^admin_/ } },
        ],
      },
    ],
  };
}

function cleanUserMatch(extra = {}) {
  return {
    ...extra,
    $and: [
      {
        $or: [
          { email: { $exists: false } },
          { email: null },
          { email: { $not: /(^test|testqa|qa|example\.com)/i } },
        ],
      },
      {
        $or: [
          { customerType: { $exists: false } },
          { customerType: { $nin: ["test"] } },
        ],
      },
    ],
  };
}

function identityExpression() {
  return {
    $ifNull: [
      "$userId",
      {
        $ifNull: [
          "$anonymousId",
          {
            $ifNull: ["$sessionId", "$ipAddress"],
          },
        ],
      },
    ],
  };
}

function safePct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function hostFromReferrer(referrer) {
  if (!referrer || typeof referrer !== "string") return "";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return /mybingocard\.com$/i.test(host) ? "internal" : host;
  } catch {
    return referrer.slice(0, 80);
  }
}

function normalizeSourceLabel(source) {
  const value = String(source || "").trim();
  if (!value) return "direct / unknown";
  const host = hostFromReferrer(value);
  return host || value;
}

function sourceFromPageView(doc) {
  const utm = doc.metadata?.utm || {};
  const source =
    utm.source ||
    utm.utm_source ||
    doc.metadata?.client_context?.utm?.source ||
    doc.metadata?.client_context?.utm?.utm_source ||
    "";
  const medium = utm.medium || utm.utm_medium || doc.metadata?.client_context?.utm?.medium || "";
  if (source) return medium ? `${source} / ${medium}` : source;

  const referrer =
    doc.metadata?.referrer ||
    doc.metadata?.client_context?.referrer ||
    doc.referrer ||
    "";
  const host = hostFromReferrer(referrer);
  if (!host || host === "internal") return "direct / unknown";
  return host;
}

function formatRows(rows, formatter, empty = "No data") {
  if (!rows.length) return empty;
  return rows.map(formatter).join("\n");
}

async function getFeatureStats(db, since) {
  const stats = [];
  for (const feature of FEATURE_DEFINITIONS) {
    const [row] = await db
      .collection("activity_events")
      .aggregate([
        { $match: cleanActivityMatch(since, { event: { $in: feature.events } }) },
        {
          $group: {
            _id: null,
            events: { $sum: 1 },
            visitors: { $addToSet: identityExpression() },
            lastSeenAt: { $max: "$createdAt" },
          },
        },
      ])
      .toArray();

    stats.push({
      key: feature.key,
      label: feature.label,
      events: row?.events || 0,
      uniqueVisitors: (row?.visitors || []).filter(Boolean).length,
      lastSeenAt: row?.lastSeenAt || null,
      trackedEvents: feature.events,
    });
  }

  return stats.sort((a, b) => b.uniqueVisitors - a.uniqueVisitors || b.events - a.events);
}

async function countUniqueEvent(db, since, event, extra = {}) {
  const [row] = await db
    .collection("activity_events")
    .aggregate([
      { $match: cleanActivityMatch(since, { event, ...extra }) },
      {
        $group: {
          _id: null,
          events: { $sum: 1 },
          visitors: { $addToSet: identityExpression() },
        },
      },
    ])
    .toArray();

  return {
    event,
    events: row?.events || 0,
    uniqueVisitors: (row?.visitors || []).filter(Boolean).length,
  };
}

async function getSources(db, since) {
  const pageViews = await db
    .collection("activity_events")
    .find(cleanActivityMatch(since, { event: "page_view" }), {
      projection: {
        anonymousId: 1,
        userId: 1,
        sessionId: 1,
        ipAddress: 1,
        referrer: 1,
        metadata: 1,
        pathname: 1,
      },
    })
    .toArray();

  const bySource = new Map();
  for (const view of pageViews) {
    const source = sourceFromPageView(view);
    const visitor = view.userId || view.anonymousId || view.sessionId || view.ipAddress || "unknown";
    const current = bySource.get(source) || { source, pageViews: 0, visitors: new Set() };
    current.pageViews += 1;
    if (visitor) current.visitors.add(String(visitor));
    bySource.set(source, current);
  }

  const signupSources = await db
    .collection("users")
    .find(cleanUserMatch({ createdAt: { $gte: since } }), {
      projection: { utm_source: 1, utm_medium: 1, referrer: 1 },
    })
    .toArray();

  const signupSourceMap = new Map();
  for (const user of signupSources) {
    const source = user.utm_source
      ? normalizeSourceLabel(user.utm_medium ? `${user.utm_source} / ${user.utm_medium}` : user.utm_source)
      : normalizeSourceLabel(user.referrer);
    signupSourceMap.set(source, (signupSourceMap.get(source) || 0) + 1);
  }

  return {
    pageViews: Array.from(bySource.values())
      .map((row) => ({ source: row.source, pageViews: row.pageViews, uniqueVisitors: row.visitors.size }))
      .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors || b.pageViews - a.pageViews)
      .slice(0, 12),
    signupSources: Array.from(signupSourceMap.entries())
      .map(([source, signups]) => ({ source, signups }))
      .sort((a, b) => b.signups - a.signups)
      .slice(0, 12),
  };
}

async function getTopPages(db, since) {
  return db
    .collection("activity_events")
    .aggregate([
      { $match: cleanActivityMatch(since, { event: "page_view" }) },
      {
        $group: {
          _id: { $ifNull: ["$pathname", "$metadata.page"] },
          pageViews: { $sum: 1 },
          visitors: { $addToSet: identityExpression() },
        },
      },
      { $sort: { pageViews: -1 } },
      { $limit: 12 },
    ])
    .toArray()
    .then((rows) =>
      rows.map((row) => ({
        path: row._id || "(unknown)",
        pageViews: row.pageViews,
        uniqueVisitors: (row.visitors || []).filter(Boolean).length,
      })),
    );
}

async function getHotspots(db, since, event) {
  return db
    .collection("activity_events")
    .aggregate([
      { $match: cleanActivityMatch(since, { event }) },
      {
        $group: {
          _id: {
            page: { $ifNull: ["$pathname", "$metadata.page"] },
            text: { $ifNull: ["$metadata.text", "$metadata.label"] },
            tag: { $ifNull: ["$metadata.tag", ""] },
          },
          count: { $sum: 1 },
          visitors: { $addToSet: identityExpression() },
          lastSeenAt: { $max: "$createdAt" },
        },
      },
      { $sort: { count: -1, lastSeenAt: -1 } },
      { $limit: 8 },
    ])
    .toArray()
    .then((rows) =>
      rows.map((row) => ({
        page: row._id.page || "(unknown)",
        text: row._id.text || row._id.tag || "(no text)",
        count: row.count,
        uniqueVisitors: (row.visitors || []).filter(Boolean).length,
        lastSeenAt: row.lastSeenAt,
      })),
    );
}

async function getFunnel(db, since) {
  const pageViews = await countUniqueEvent(db, since, "page_view");
  const createViews = await db
    .collection("activity_events")
    .aggregate([
      { $match: cleanActivityMatch(since, { event: "page_view", $or: [{ pathname: "/create" }, { "metadata.page": "/create" }] }) },
      { $group: { _id: null, events: { $sum: 1 }, visitors: { $addToSet: identityExpression() } } },
    ])
    .toArray()
    .then(([row]) => ({
      event: "create_page_view",
      events: row?.events || 0,
      uniqueVisitors: (row?.visitors || []).filter(Boolean).length,
    }));
  const title = await countUniqueEvent(db, since, "card_title_entered");
  const cells = await countUniqueEvent(db, since, "card_cells_added");
  const save = await countUniqueEvent(db, since, "card_save_attempted");
  const created = await countUniqueEvent(db, since, "card_created");
  const signup = await countUniqueEvent(db, since, "signup_completed");
  const checkout = await countUniqueEvent(db, since, "checkout_started");
  const payment = await countUniqueEvent(db, since, "billing_payment_succeeded");

  return [pageViews, createViews, title, cells, save, created, signup, checkout, payment];
}

function buildRecommendations({ feature30d, feature7d, funnel30d, sources30d, deadClicks30d, rageClicks30d }) {
  const recommendations = [];
  const byKey = Object.fromEntries(feature30d.map((feature) => [feature.key, feature]));
  const byKey7 = Object.fromEntries(feature7d.map((feature) => [feature.key, feature]));
  const pageViews = funnel30d.find((row) => row.event === "page_view")?.uniqueVisitors || 0;
  const createViews = funnel30d.find((row) => row.event === "create_page_view")?.uniqueVisitors || 0;
  const cardsCreated = funnel30d.find((row) => row.event === "card_created")?.uniqueVisitors || 0;
  const checkoutStarted = funnel30d.find((row) => row.event === "checkout_started")?.uniqueVisitors || 0;
  const paymentRow = funnel30d.find((row) => row.event === "billing_payment_succeeded");
  const paymentSucceeded = paymentRow?.uniqueVisitors || paymentRow?.events || 0;

  if (createViews && safePct(cardsCreated, createViews) < 40) {
    recommendations.push(
      `Improve the create flow: ${createViews} visitors reached /create but only ${cardsCreated} unique visitors reached card_created in 30 days.`,
    );
  }

  if ((byKey.image_bingo?.uniqueVisitors || 0) >= (byKey.print_export?.uniqueVisitors || 0) * 0.6) {
    recommendations.push(
      "Make image bingo more prominent on the home/create pages; it is one of the stronger feature signals and now works for free users.",
    );
  }

  if ((byKey.templates?.uniqueVisitors || 0) > 0 && (byKey.templates?.events || 0) > (byKey.templates?.uniqueVisitors || 0) * 2) {
    recommendations.push(
      "Template browsing is getting attention; add stronger template-to-create CTAs and track the selected template name on card creation.",
    );
  }

  if ((byKey.ai_generation?.uniqueVisitors || 0) <= 5 || (byKey7.ai_generation?.uniqueVisitors || 0) <= 2) {
    recommendations.push(
      "AI generation is underused recently; expose it as a clear helper in the empty card state and explain what it creates.",
    );
  }

  if ((byKey.live_games?.uniqueVisitors || 0) <= 5 || (byKey7.live_games?.uniqueVisitors || 0) <= 2) {
    recommendations.push(
      "Live games look low-usage compared with card creation; add a post-card-created prompt to host or share a live game.",
    );
  }

  if (checkoutStarted && safePct(paymentSucceeded, checkoutStarted) < 25) {
    recommendations.push(
      `Upgrade funnel needs attention: ${checkoutStarted} unique checkout starters and ${paymentSucceeded} payment completion events in 30 days.`,
    );
  }

  if (deadClicks30d.length || rageClicks30d.length) {
    recommendations.push(
      "Keep the dead-click/rage-click list on the admin dashboard and fix repeated hotspots first; these are likely UI elements people expect to do more.",
    );
  }

  const direct = sources30d.pageViews.find((row) => row.source === "direct / unknown");
  if (direct && pageViews && safePct(direct.uniqueVisitors, pageViews) > 50) {
    recommendations.push(
      "Attribution is still too vague: most page-view visitors are direct/unknown, so keep UTM links on campaigns and preserve first-touch source on signup.",
    );
  }

  return recommendations.slice(0, 8);
}

function buildMarkdown(report) {
  const mostUsed = report.feature30d[0];
  const leastUsed = [...report.feature30d].reverse().find((feature) => feature.events > 0) || report.feature30d.at(-1);
  const trackedButUnused = report.feature30d.filter((feature) => feature.events === 0);

  return `# MyBingoCard Analytics Insights - ${report.reportDay}

Generated: ${report.generatedAt}

Scope: aggregate analytics only. This excludes HeadlessChrome/Playwright/Puppeteer checks, obvious QA/test emails, and admin-only events so the report is not dominated by our own QA.

## Direct Answers

- Most used feature: **${mostUsed.label}** (${mostUsed.uniqueVisitors} unique visitors, ${mostUsed.events} events in 30 days).
- Least used tracked feature with activity: **${leastUsed.label}** (${leastUsed.uniqueVisitors} unique visitors, ${leastUsed.events} events in 30 days).
- Tracked features with no clean activity: ${trackedButUnused.length ? trackedButUnused.map((feature) => `**${feature.label}**`).join(", ") : "none"}.
- Top traffic source from page views: **${report.sources30d.pageViews[0]?.source || "unknown"}** (${report.sources30d.pageViews[0]?.uniqueVisitors || 0} unique visitors, ${report.sources30d.pageViews[0]?.pageViews || 0} page views in 30 days).

## Feature Usage - 30 Days

${formatRows(
  report.feature30d,
  (feature) => `- ${feature.label}: ${feature.uniqueVisitors} unique visitors, ${feature.events} events, last seen ${feature.lastSeenAt || "never"}`,
)}

## Feature Usage - 7 Days

${formatRows(
  report.feature7d,
  (feature) => `- ${feature.label}: ${feature.uniqueVisitors} unique visitors, ${feature.events} events, last seen ${feature.lastSeenAt || "never"}`,
)}

## Where People Came From - 30 Days

Page-view sources:
${formatRows(
  report.sources30d.pageViews,
  (row) => `- ${row.source}: ${row.uniqueVisitors} unique visitors, ${row.pageViews} page views`,
)}

Signup sources:
${formatRows(
  report.sources30d.signupSources,
  (row) => `- ${row.source}: ${row.signups} signups`,
)}

## Top Pages - 30 Days

${formatRows(
  report.topPages30d,
  (row) => `- ${row.path}: ${row.uniqueVisitors} unique visitors, ${row.pageViews} page views`,
)}

## Funnel - 30 Days

${formatRows(
  report.funnel30d,
  (row) =>
    row.event === "billing_payment_succeeded" && row.events && !row.uniqueVisitors
      ? `- ${row.event}: ${row.events} server-side payment events; browser visitor IDs were not attached`
      : `- ${row.event}: ${row.uniqueVisitors} unique visitors, ${row.events} events`,
)}

## Friction

Dead clicks:
${formatRows(
  report.deadClicks30d,
  (row) => `- ${row.page} / ${row.text}: ${row.count} events, ${row.uniqueVisitors} unique visitors`,
)}

Rage clicks:
${formatRows(
  report.rageClicks30d,
  (row) => `- ${row.page} / ${row.text}: ${row.count} events, ${row.uniqueVisitors} unique visitors`,
)}

## What To Improve

${formatRows(report.recommendations, (item) => `- ${item}`, "No recommendations generated.")}
`;
}

async function run() {
  loadEnv();
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/mybingocard";
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db("mybingocard");
    const now = new Date();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [feature30d, feature7d, sources30d, topPages30d, funnel30d, deadClicks30d, rageClicks30d] =
      await Promise.all([
        getFeatureStats(db, since30d),
        getFeatureStats(db, since7d),
        getSources(db, since30d),
        getTopPages(db, since30d),
        getFunnel(db, since30d),
        getHotspots(db, since30d, "dead_click"),
        getHotspots(db, since30d, "rage_click"),
      ]);

    const report = {
      reportDay: REPORT_DAY,
      generatedAt: now.toISOString(),
      filters: {
        excludedAutomation: "HeadlessChrome|Playwright|Puppeteer",
        excludedTestEmails: "(^test|testqa|qa|example.com)",
        excludedAdminEvents: "admin_*",
      },
      feature30d,
      feature7d,
      sources30d,
      topPages30d,
      funnel30d,
      deadClicks30d,
      rageClicks30d,
      recommendations: buildRecommendations({
        feature30d,
        feature7d,
        funnel30d,
        sources30d,
        deadClicks30d,
        rageClicks30d,
      }),
    };

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.mkdirSync(path.dirname(OBSIDIAN_NOTE), { recursive: true });
    const jsonPath = path.join(OUTPUT_DIR, "report.json");
    const markdownPath = path.join(OUTPUT_DIR, "report.md");
    const markdown = buildMarkdown(report);

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(markdownPath, markdown);
    fs.writeFileSync(OBSIDIAN_NOTE, markdown);

    const mostUsed = feature30d[0];
    const leastUsed = [...feature30d].reverse().find((feature) => feature.events > 0) || feature30d.at(-1);

    console.log(
      JSON.stringify(
        {
          jsonPath,
          markdownPath,
          obsidianNote: OBSIDIAN_NOTE,
          mostUsed: mostUsed && {
            label: mostUsed.label,
            uniqueVisitors: mostUsed.uniqueVisitors,
            events: mostUsed.events,
          },
          leastUsed: leastUsed && {
            label: leastUsed.label,
            uniqueVisitors: leastUsed.uniqueVisitors,
            events: leastUsed.events,
          },
          topSource: sources30d.pageViews[0] || null,
          recommendations: report.recommendations,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
