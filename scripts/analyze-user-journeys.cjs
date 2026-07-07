const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { openSqliteShadowDatabase, useSqliteBackend } = require("./sqlite-shadow-store.cjs");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const OUT_DIR = process.env.MYBINGOCARD_JOURNEY_OUT_DIR || "/root/clawd/obsidian/research/mybingocard";
const RUN_DATE = process.env.MYBINGOCARD_JOURNEY_RUN_DATE || "2026-05-18";
const REPORT_PATH = path.join(OUT_DIR, `user-journey-analysis-${RUN_DATE}.md`);
const CSV_PATH = path.join(OUT_DIR, `user-journey-summary-${RUN_DATE}.csv`);
const JSON_PATH = path.join(OUT_DIR, `user-journey-summary-${RUN_DATE}.json`);

try {
  const env = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
} catch (error) {
  console.error(`Could not load ${ENV_PATH}:`, error.message);
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mybingocard";
const PHOENIX_TZ = "America/Phoenix";

const PASSIVE_EVENTS = new Set([
  "page_engagement",
  "performance_ttfb",
  "performance_cls",
  "performance_lcp",
  "performance_fid",
  "performance_inp",
  "scroll_depth_25",
  "scroll_depth_50",
  "scroll_depth_75",
  "scroll_depth_100",
  "session_summary",
  "tab_returned",
  "returning_visitor",
  "button_clicked",
  "form_field_focused",
  "form_field_blurred",
  "form_field_changed",
  "page_view",
]);

const CORE_EVENTS = new Set([
  "card_created",
  "first_card_created",
  "card_updated",
  "card_save_succeeded",
  "card_cells_added",
  "card_title_entered",
  "style_changed",
  "grid_size_changed",
  "free_space_toggled",
  "template_used",
  "template_clicked",
  "templates_page_viewed",
  "dashboard_viewed",
  "card_viewed",
  "post_save_card_viewed",
  "returned_to_card",
  "export_pdf",
  "export_pdf_started",
  "export_pdf_downloaded",
  "export_png",
  "export_png_started",
  "export_png_downloaded",
  "batch_pdf_exported",
  "batch_pdf_export_started",
  "batch_pdf_export_succeeded",
  "batch_cards_created",
  "card_printed",
  "print_started",
  "share_link_generated",
  "share_link_copied",
  "card_share_link_copied",
  "card_shared",
  "share_link_viewed",
  "share_link_reused",
  "share_link_email_sent",
  "social_share_clicked",
  "game_created",
  "game_started",
  "game_item_called",
  "game_cell_marked",
  "game_bingo_claimed",
  "game_completed",
  "game_player_joined",
  "game_player_page_viewed",
  "game_player_cell_marked",
  "game_player_bingo_claimed",
  "bingo_achieved",
  "play_started",
  "ai_generate_clicked",
  "ai_generate_completed",
  "ai_cells_generated",
  "ai_cells_applied",
  "first_ai_generation",
]);

const FRICTION_EVENTS = new Set([
  "dead_click",
  "rage_click",
  "slow_page_load",
  "card_save_blocked",
  "card_draft_lost",
  "login_failed",
  "signup_failed",
  "validation_error",
  "checkout_abandoned",
  "checkout_cancel_clicked",
  "trial_checkout_abandoned",
  "billing_payment_failed",
  "subscription_canceled",
  "card_limit_reached",
  "export_pdf_batch_required",
  "ai_generate_failed",
  "ai_generate_gated",
  "image_upload_failed",
  "game_join_failed",
  "game_stream_disconnected",
  "email_verification_failed",
  "email_unsubscribed",
  "account_deleted",
]);

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fmt(value) {
  const date = dateValue(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHOENIX_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function iso(value) {
  const date = dateValue(value);
  return date ? date.toISOString() : "";
}

function daysBetween(start, end) {
  const a = dateValue(start);
  const b = dateValue(end);
  if (!a || !b) return null;
  return Math.round(((b.getTime() - a.getTime()) / 86400000) * 10) / 10;
}

function escapeMd(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .trim();
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function normalizeEmail(value) {
  return String(value || "").toLowerCase().trim();
}

function getEventTime(event) {
  if (!event) return null;
  return dateValue(event.createdAt || event.datePlayed || event.receivedAt || event.sentAt || event.firstOpenedAt);
}

function eventLabel(event) {
  const bits = [event.event || event.type || event.kind || "event"];
  if (event.pathname) bits.push(event.pathname);
  if (event.metadata?.reason) bits.push(`reason=${event.metadata.reason}`);
  if (event.metadata?.error) bits.push(`error=${event.metadata.error}`);
  if (event.metadata?.provider) bits.push(`provider=${event.metadata.provider}`);
  return bits.join(" ");
}

function isReportableUser(user) {
  const email = normalizeEmail(user.email);
  const name = String(user.name || "").toLowerCase();
  const customerType = String(user.customerType || "").toLowerCase();
  if (!email || email.includes("@guest.mybingocard.local") || email.startsWith("guest-")) return false;
  if (["guest", "test", "admin"].includes(customerType)) return false;
  if (name.includes("cory")) return false;
  return true;
}

function classifyLifecycle({ user, events, cards, games, rooms, subscription, supportTickets }) {
  const coreEvents = events.filter((event) => CORE_EVENTS.has(event.event));
  const frictionEvents = events.filter((event) => FRICTION_EVENTS.has(event.event));
  const meaningfulEvents = coreEvents.filter((event) => !PASSIVE_EVENTS.has(event.event));
  const hasPaid =
    user.subscriptionStatus === "active" ||
    user.subscriptionStatus === "trialing" ||
    user.subscriptionStatus === "lifetime" ||
    Boolean(user.stripeSubscriptionId) ||
    Boolean(subscription);

  if (String(user.customerType || "").toLowerCase() === "admin") return "internal_admin";
  if (String(user.customerType || "").toLowerCase() === "test") return "test_account";
  if (String(user.customerType || "").toLowerCase() === "guest") return "guest_account";
  if (supportTickets.length > 0) return "support_contact";
  if (hasPaid && String(user.subscriptionStatus || "").toLowerCase() === "canceled") return "paid_then_canceled";
  if (hasPaid) return "paid_or_trial";
  if (cards.length >= 2 || games.length > 0 || rooms.length > 0 || meaningfulEvents.length >= 5) return "activated";
  if (cards.length === 1 || meaningfulEvents.length > 0) return "tried_once";
  if (frictionEvents.length > 0) return "friction_no_activation";
  return "signed_up_no_clear_activation";
}

function issueSeverity(flags) {
  if (flags.some((flag) => flag.severity === "high")) return "high";
  if (flags.some((flag) => flag.severity === "medium")) return "medium";
  if (flags.some((flag) => flag.severity === "low")) return "low";
  return "none";
}

function topCounts(items, keyFn, limit = 8) {
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

function uniqueDays(events) {
  return new Set(
    events
      .map((event) => getEventTime(event))
      .filter(Boolean)
      .map((date) => date.toISOString().slice(0, 10))
  ).size;
}

function buildFlags({ user, events, cards, subscription, supportTickets, emailPrefs, dripLogs, errorEvents }) {
  const flags = [];
  const counts = new Map();
  for (const event of events) counts.set(event.event, (counts.get(event.event) || 0) + 1);

  const add = (severity, code, detail) => flags.push({ severity, code, detail });

  if ((counts.get("login_failed") || 0) > 0) {
    add("high", "login_failed", `${counts.get("login_failed")} failed login event(s)`);
  }
  if ((counts.get("signup_failed") || 0) > 0) {
    add("high", "signup_failed", `${counts.get("signup_failed")} failed signup event(s)`);
  }
  if ((counts.get("email_verification_failed") || 0) > 0) {
    add("high", "email_verification_failed", `${counts.get("email_verification_failed")} failed email verification event(s)`);
  }
  if ((counts.get("billing_payment_failed") || 0) > 0) {
    add("high", "billing_payment_failed", `${counts.get("billing_payment_failed")} failed payment event(s)`);
  }
  if ((counts.get("subscription_canceled") || 0) > 0 || user.subscriptionStatus === "canceled") {
    add("high", "subscription_canceled", "subscription cancellation recorded");
  }
  if (supportTickets.length > 0) {
    add("high", "support_ticket", `${supportTickets.length} support ticket/reply record(s)`);
  }
  if ((counts.get("ai_generate_failed") || 0) > 0) {
    add("medium", "ai_generate_failed", `${counts.get("ai_generate_failed")} AI generation failure(s)`);
  }
  if ((counts.get("image_upload_failed") || 0) > 0) {
    add("medium", "image_upload_failed", `${counts.get("image_upload_failed")} image upload failure(s)`);
  }
  if ((counts.get("card_save_blocked") || 0) > 0) {
    add("medium", "card_save_blocked", `${counts.get("card_save_blocked")} save-blocked event(s)`);
  }
  if ((counts.get("card_draft_lost") || 0) > 0) {
    add("medium", "card_draft_lost", `${counts.get("card_draft_lost")} draft-lost event(s)`);
  }
  if ((counts.get("card_limit_reached") || 0) > 0) {
    add("medium", "card_limit_reached", `${counts.get("card_limit_reached")} card-limit event(s)`);
  }
  if ((counts.get("checkout_abandoned") || 0) > 0 || (counts.get("trial_checkout_abandoned") || 0) > 0) {
    add("medium", "checkout_abandoned", `${(counts.get("checkout_abandoned") || 0) + (counts.get("trial_checkout_abandoned") || 0)} abandoned checkout event(s)`);
  }
  if ((counts.get("checkout_cancel_clicked") || 0) > 0) {
    add("medium", "checkout_cancel_clicked", `${counts.get("checkout_cancel_clicked")} checkout cancel click(s)`);
  }
  if ((counts.get("export_pdf_batch_required") || 0) > 0) {
    add("medium", "export_batch_required", `${counts.get("export_pdf_batch_required")} batch-required export gate(s)`);
  }
  if ((counts.get("game_join_failed") || 0) > 0) {
    add("medium", "game_join_failed", `${counts.get("game_join_failed")} game join failure(s)`);
  }
  if ((counts.get("game_stream_disconnected") || 0) > 3) {
    add("medium", "game_stream_disconnected", `${counts.get("game_stream_disconnected")} game stream disconnect(s)`);
  }
  if ((counts.get("rage_click") || 0) > 0) {
    add((counts.get("rage_click") || 0) >= 5 ? "medium" : "low", "rage_click", `${counts.get("rage_click")} rage-click event(s)`);
  }
  if ((counts.get("dead_click") || 0) >= 10) {
    add("medium", "dead_clicks_many", `${counts.get("dead_click")} dead-click event(s)`);
  } else if ((counts.get("dead_click") || 0) > 0) {
    add("low", "dead_clicks", `${counts.get("dead_click")} dead-click event(s)`);
  }
  if ((counts.get("slow_page_load") || 0) > 0) {
    add("low", "slow_page_load", `${counts.get("slow_page_load")} slow-load event(s)`);
  }
  if ((counts.get("email_unsubscribed") || 0) > 0 || emailPrefs?.marketingEmails === false) {
    add("low", "unsubscribed", "marketing unsubscribe recorded");
  }
  if (errorEvents.length > 0) {
    add("low", "client_error", `${errorEvents.length} captured client/resource error(s)`);
  }
  const failedDrips = dripLogs.filter((log) => log.status === "failed");
  if (failedDrips.length > 0) {
    add("low", "drip_failed", `${failedDrips.length} failed drip email log(s)`);
  }
  if (cards.length === 0 && events.some((event) => event.event === "signup_completed")) {
    add("low", "no_card_after_signup", "signed up but no saved card record");
  }
  const subscriptionEntitled = subscription && ["active", "trialing", "past_due"].includes(subscription.status);
  const userEntitled = ["active", "trialing", "past_due", "lifetime"].includes(user.subscriptionStatus || "");
  if (subscriptionEntitled && !userEntitled) {
    add("medium", "subscription_state_mismatch", `subscription record ${subscription.status} but user status is ${user.subscriptionStatus || "unset"}`);
  } else if (!subscriptionEntitled && userEntitled && user.subscriptionStatus !== "lifetime") {
    add("medium", "subscription_state_mismatch", `user status ${user.subscriptionStatus || "unset"} but subscription record is ${subscription?.status || "missing"}`);
  }

  return flags;
}

function summarizeJourney({ user, events, cards, games, rooms, subscription, supportTickets, emailPrefs, dripLogs }) {
  const createdAt = dateValue(user.createdAt) || (user._id?.getTimestamp ? user._id.getTimestamp() : null);
  const sortedEvents = [...events].sort((a, b) => getEventTime(a) - getEventTime(b));
  const firstEvent = sortedEvents[0] || null;
  const lastEvent = sortedEvents[sortedEvents.length - 1] || null;
  const firstCard = [...cards].sort((a, b) => dateValue(a.createdAt) - dateValue(b.createdAt))[0] || null;
  const lastCard = [...cards].sort((a, b) => dateValue(b.updatedAt || b.createdAt) - dateValue(a.updatedAt || a.createdAt))[0] || null;
  const firstCore = sortedEvents.find((event) => CORE_EVENTS.has(event.event));
  const firstFriction = sortedEvents.find((event) => FRICTION_EVENTS.has(event.event));
  const loginEvents = sortedEvents.filter((event) => event.event === "login_succeeded");
  const checkoutEvents = sortedEvents.filter((event) => /checkout|billing|subscription|trial/.test(event.event || ""));
  const exportEvents = sortedEvents.filter((event) => /export|print/.test(event.event || ""));
  const shareEvents = sortedEvents.filter((event) => /share/.test(event.event || ""));
  const aiEvents = sortedEvents.filter((event) => /ai_/.test(event.event || ""));
  const gameEvents = sortedEvents.filter((event) => /game|bingo|play_/.test(event.event || ""));

  const milestones = [];
  if (createdAt) milestones.push({ time: createdAt, label: `Account created (${user.signupMethod || "unknown method"})` });
  if (firstEvent) milestones.push({ time: getEventTime(firstEvent), label: `First tracked event: ${eventLabel(firstEvent)}` });
  if (loginEvents[0]) milestones.push({ time: getEventTime(loginEvents[0]), label: "First login succeeded" });
  if (firstCard) milestones.push({ time: firstCard.createdAt, label: `First card saved: ${firstCard.title || "Untitled"}` });
  if (firstCore) milestones.push({ time: getEventTime(firstCore), label: `First core product action: ${eventLabel(firstCore)}` });
  if (checkoutEvents[0]) milestones.push({ time: getEventTime(checkoutEvents[0]), label: `First monetization event: ${eventLabel(checkoutEvents[0])}` });
  if (exportEvents[0]) milestones.push({ time: getEventTime(exportEvents[0]), label: `First export/print event: ${eventLabel(exportEvents[0])}` });
  if (shareEvents[0]) milestones.push({ time: getEventTime(shareEvents[0]), label: `First share event: ${eventLabel(shareEvents[0])}` });
  if (aiEvents[0]) milestones.push({ time: getEventTime(aiEvents[0]), label: `First AI event: ${eventLabel(aiEvents[0])}` });
  if (gameEvents[0] || games[0] || rooms[0]) {
    const gameTime = getEventTime(gameEvents[0] || {}) || dateValue(games[0]?.datePlayed) || dateValue(rooms[0]?.createdAt);
    milestones.push({ time: gameTime, label: `First game/live bingo signal: ${eventLabel(gameEvents[0] || { event: "game_record" })}` });
  }
  if (firstFriction) milestones.push({ time: getEventTime(firstFriction), label: `First friction signal: ${eventLabel(firstFriction)}` });
  if (supportTickets[0]) milestones.push({ time: supportTickets[0].receivedAt, label: `Support contact: ${supportTickets[0].subject || "support ticket"}` });
  if (emailPrefs?.marketingEmails === false) milestones.push({ time: emailPrefs.unsubscribedAt || emailPrefs.updatedAt, label: "Marketing unsubscribe recorded" });
  if (lastEvent) milestones.push({ time: getEventTime(lastEvent), label: `Latest tracked event: ${eventLabel(lastEvent)}` });

  const deduped = [];
  const seen = new Set();
  for (const item of milestones.sort((a, b) => dateValue(a.time) - dateValue(b.time))) {
    const key = `${iso(item.time)}:${item.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  const eventCounts = topCounts(sortedEvents, (event) => event.event, 10);
  const pageCounts = topCounts(sortedEvents, (event) => event.pathname, 6);

  return {
    createdAt,
    firstEventAt: getEventTime(firstEvent),
    lastEventAt: getEventTime(lastEvent) || dateValue(user.lastSeen) || dateValue(user.updatedAt),
    firstCardAt: dateValue(firstCard?.createdAt),
    lastCardAt: dateValue(lastCard?.updatedAt || lastCard?.createdAt),
    lastLoginAt: dateValue(user.lastLoginAt || loginEvents[loginEvents.length - 1]?.createdAt),
    loginCount: user.loginCount || loginEvents.length,
    activeDays: uniqueDays(sortedEvents),
    eventCounts,
    pageCounts,
    milestones: deduped,
    cardsCreated: cards.length,
    cardsUpdated: cards.filter((card) => card.updatedAt && card.createdAt && String(card.updatedAt) !== String(card.createdAt)).length,
    gamesPlayed: games.length,
    roomsHosted: rooms.length,
    subscription,
    supportTickets,
    emailPrefs,
    dripLogs,
  };
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const sqliteDb = useSqliteBackend() ? openSqliteShadowDatabase() : null;
  const client = sqliteDb ? null : new MongoClient(MONGODB_URI);
  if (client) await client.connect();
  const db = sqliteDb || client.db("mybingocard");

  const [
    users,
    activityEvents,
    cards,
    games,
    rooms,
    subscriptions,
    supportTickets,
    emailPrefs,
    dripLogs,
    dripOpens,
    checkoutReminders,
    errorEvents,
  ] = await Promise.all([
    db.collection("users").find({}).sort({ createdAt: 1 }).toArray(),
    db.collection("activity_events").find({}).sort({ createdAt: 1 }).toArray(),
    db.collection("cards").find({}).sort({ createdAt: 1 }).toArray(),
    db.collection("gameHistory").find({}).sort({ datePlayed: 1 }).toArray(),
    db.collection("game_rooms").find({}).sort({ createdAt: 1 }).toArray(),
    db.collection("subscriptions").find({}).sort({ createdAt: 1 }).toArray(),
    db.collection("support_tickets").find({}).sort({ receivedAt: 1 }).toArray(),
    db.collection("email_preferences").find({}).toArray(),
    db.collection("drip_log").find({}).sort({ sentAt: 1 }).toArray(),
    db.collection("drip_opens").find({}).sort({ firstOpenedAt: 1 }).toArray(),
    db.collection("checkout_reminder_log").find({}).sort({ sentAt: 1 }).toArray(),
    db.collection("error_events").find({}).sort({ createdAt: 1 }).toArray(),
  ]);

  const activityByUserId = new Map();
  const activityByEmail = new Map();
  const activityByAnon = new Map();
  for (const event of activityEvents) {
    if (event.userId) {
      const key = String(event.userId);
      if (!activityByUserId.has(key)) activityByUserId.set(key, []);
      activityByUserId.get(key).push(event);
    }
    if (event.email) {
      const key = normalizeEmail(event.email);
      if (!activityByEmail.has(key)) activityByEmail.set(key, []);
      activityByEmail.get(key).push(event);
    }
    if (event.anonymousId) {
      const key = String(event.anonymousId);
      if (!activityByAnon.has(key)) activityByAnon.set(key, []);
      activityByAnon.get(key).push(event);
    }
  }

  const cardsByUserId = new Map();
  for (const card of cards) {
    const key = String(card.userId || "");
    if (!cardsByUserId.has(key)) cardsByUserId.set(key, []);
    cardsByUserId.get(key).push(card);
  }

  const gamesByUserId = new Map();
  for (const game of games) {
    const key = String(game.userId || "");
    if (!gamesByUserId.has(key)) gamesByUserId.set(key, []);
    gamesByUserId.get(key).push(game);
  }

  const roomsByUserId = new Map();
  const roomsByEmail = new Map();
  for (const room of rooms) {
    if (room.hostUserId) {
      const key = String(room.hostUserId);
      if (!roomsByUserId.has(key)) roomsByUserId.set(key, []);
      roomsByUserId.get(key).push(room);
    }
    if (room.hostEmail) {
      const key = normalizeEmail(room.hostEmail);
      if (!roomsByEmail.has(key)) roomsByEmail.set(key, []);
      roomsByEmail.get(key).push(room);
    }
  }

  const subByUserId = new Map(subscriptions.map((sub) => [String(sub.userId), sub]));
  const emailPrefByEmail = new Map(emailPrefs.map((pref) => [normalizeEmail(pref.email), pref]));
  const dripLogsByEmail = new Map();
  const dripOpensByEmail = new Map();
  const remindersByEmail = new Map();
  const supportByEmail = new Map();
  const errorByUserId = new Map();
  const errorByEmail = new Map();

  for (const log of dripLogs) {
    const key = normalizeEmail(log.email);
    if (!dripLogsByEmail.has(key)) dripLogsByEmail.set(key, []);
    dripLogsByEmail.get(key).push(log);
  }
  for (const open of dripOpens) {
    const key = normalizeEmail(open.email);
    if (!dripOpensByEmail.has(key)) dripOpensByEmail.set(key, []);
    dripOpensByEmail.get(key).push(open);
  }
  for (const reminder of checkoutReminders) {
    const key = normalizeEmail(reminder.email);
    if (!remindersByEmail.has(key)) remindersByEmail.set(key, []);
    remindersByEmail.get(key).push(reminder);
  }
  for (const ticket of supportTickets) {
    const raw = ticket.email || "";
    const emailMatch = String(raw).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const key = normalizeEmail(emailMatch?.[0] || raw);
    if (!supportByEmail.has(key)) supportByEmail.set(key, []);
    supportByEmail.get(key).push(ticket);
  }
  for (const error of errorEvents) {
    if (error.userId) {
      const key = String(error.userId);
      if (!errorByUserId.has(key)) errorByUserId.set(key, []);
      errorByUserId.get(key).push(error);
    }
    if (error.email) {
      const key = normalizeEmail(error.email);
      if (!errorByEmail.has(key)) errorByEmail.set(key, []);
      errorByEmail.get(key).push(error);
    }
  }

  const analyses = [];
  for (const user of users) {
    const userId = user._id.toString();
    const email = normalizeEmail(user.email);
    const eventMap = new Map();
    for (const event of activityByUserId.get(userId) || []) eventMap.set(event._id.toString(), event);
    for (const event of activityByEmail.get(email) || []) eventMap.set(event._id.toString(), event);
    if (user.anonymousId) {
      for (const event of activityByAnon.get(String(user.anonymousId)) || []) eventMap.set(event._id.toString(), event);
    }
    const events = [...eventMap.values()].sort((a, b) => getEventTime(a) - getEventTime(b));
    const userCards = cardsByUserId.get(userId) || [];
    const userGames = gamesByUserId.get(userId) || [];
    const userRooms = [
      ...(roomsByUserId.get(userId) || []),
      ...(roomsByEmail.get(email) || []),
    ].filter((room, index, arr) => arr.findIndex((candidate) => candidate._id.toString() === room._id.toString()) === index);
    const subscription = subByUserId.get(userId) || null;
    const tickets = supportByEmail.get(email) || [];
    const prefs = emailPrefByEmail.get(email) || null;
    const userDripLogs = dripLogsByEmail.get(email) || [];
    const userDripOpens = dripOpensByEmail.get(email) || [];
    const reminders = remindersByEmail.get(email) || [];
    const userErrors = [
      ...(errorByUserId.get(userId) || []),
      ...(errorByEmail.get(email) || []),
    ].filter((error, index, arr) => arr.findIndex((candidate) => candidate._id.toString() === error._id.toString()) === index);

    const flags = buildFlags({
      user,
      events,
      cards: userCards,
      subscription,
      supportTickets: tickets,
      emailPrefs: prefs,
      dripLogs: userDripLogs,
      errorEvents: userErrors,
    });
    const journey = summarizeJourney({
      user,
      events,
      cards: userCards,
      games: userGames,
      rooms: userRooms,
      subscription,
      supportTickets: tickets,
      emailPrefs: prefs,
      dripLogs: userDripLogs,
    });

    const lifecycle = classifyLifecycle({
      user,
      events,
      cards: userCards,
      games: userGames,
      rooms: userRooms,
      subscription,
      supportTickets: tickets,
    });

    const latestMeaningful =
      [...events]
        .reverse()
        .find((event) => CORE_EVENTS.has(event.event) || FRICTION_EVENTS.has(event.event) || event.event === "login_succeeded") ||
      null;

    analyses.push({
      userId,
      name: user.name || "",
      email: user.email || "",
      reportable: isReportableUser(user),
      customerType: user.customerType || "",
      planType: user.planType || "FREE",
      subscriptionStatus: user.subscriptionStatus || "inactive",
      signupMethod: user.signupMethod || "",
      signupDevice: user.signupDevice || "",
      signupLanguage: user.signupLanguage || "",
      source: user.utm_source || user.referrer || user.last_utm_source || user.last_referrer || "direct/unknown",
      createdAt: iso(journey.createdAt),
      createdAtPhoenix: fmt(journey.createdAt),
      lastLoginAt: iso(journey.lastLoginAt),
      lastLoginAtPhoenix: fmt(journey.lastLoginAt),
      firstEventAt: iso(journey.firstEventAt),
      lastEventAt: iso(journey.lastEventAt),
      lastEventAtPhoenix: fmt(journey.lastEventAt),
      daysToFirstCard: daysBetween(journey.createdAt, journey.firstCardAt),
      daysSinceSignupToLastEvent: daysBetween(journey.createdAt, journey.lastEventAt),
      lifecycle,
      issueSeverity: issueSeverity(flags),
      flags,
      eventCount: events.length,
      activeDays: journey.activeDays,
      loginCount: journey.loginCount,
      cardCount: userCards.length,
      cardsUpdated: journey.cardsUpdated,
      gameHistoryCount: userGames.length,
      roomsHosted: userRooms.length,
      supportTicketCount: tickets.length,
      dripSentCount: userDripLogs.length,
      dripOpenCount: userDripOpens.length,
      checkoutReminderCount: reminders.length,
      errorEventCount: userErrors.length,
      latestMeaningfulEvent: latestMeaningful?.event || "",
      latestMeaningfulAtPhoenix: fmt(latestMeaningful?.createdAt),
      topEvents: journey.eventCounts,
      topPages: journey.pageCounts,
      milestones: journey.milestones.slice(0, 18).map((item) => ({
        time: iso(item.time),
        timePhoenix: fmt(item.time),
        label: item.label,
      })),
      recentEvents: [...events]
        .filter((event) => CORE_EVENTS.has(event.event) || FRICTION_EVENTS.has(event.event) || event.event === "login_succeeded")
        .slice(-10)
        .map((event) => ({
          time: iso(event.createdAt),
          timePhoenix: fmt(event.createdAt),
          event: event.event,
          path: event.pathname || "",
          detail: eventLabel(event),
        })),
      cards: userCards.slice(-8).map((card) => ({
        title: card.title || "Untitled",
        createdAtPhoenix: fmt(card.createdAt),
        updatedAtPhoenix: fmt(card.updatedAt),
        size: card.size,
        views: card.views || 0,
        isPublic: Boolean(card.isPublic),
      })),
      supportTickets: tickets.map((ticket) => ({
        receivedAtPhoenix: fmt(ticket.receivedAt),
        subject: ticket.subject || "",
        status: ticket.status || "",
        preview: String(ticket.preview || "").slice(0, 260),
      })),
    });
  }

  analyses.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2, none: 3 };
    return (
      severityOrder[a.issueSeverity] - severityOrder[b.issueSeverity] ||
      Number(b.reportable) - Number(a.reportable) ||
      String(b.lastEventAt || "").localeCompare(String(a.lastEventAt || ""))
    );
  });

  const reportable = analyses.filter((item) => item.reportable);
  const excluded = analyses.filter((item) => !item.reportable);
  const bySeverity = topCounts(reportable, (item) => item.issueSeverity, 10);
  const byLifecycle = topCounts(reportable, (item) => item.lifecycle, 12);
  const high = reportable.filter((item) => item.issueSeverity === "high");
  const medium = reportable.filter((item) => item.issueSeverity === "medium");
  const noActivation = reportable.filter((item) => item.lifecycle === "signed_up_no_clear_activation" || item.lifecycle === "friction_no_activation");

  const csvColumns = [
    "userId",
    "name",
    "email",
    "reportable",
    "customerType",
    "planType",
    "subscriptionStatus",
    "signupMethod",
    "signupDevice",
    "signupLanguage",
    "source",
    "createdAtPhoenix",
    "lastLoginAtPhoenix",
    "lastEventAtPhoenix",
    "lifecycle",
    "issueSeverity",
    "flagCodes",
    "eventCount",
    "activeDays",
    "loginCount",
    "cardCount",
    "cardsUpdated",
    "gameHistoryCount",
    "roomsHosted",
    "supportTicketCount",
    "dripSentCount",
    "dripOpenCount",
    "checkoutReminderCount",
    "errorEventCount",
    "latestMeaningfulEvent",
    "latestMeaningfulAtPhoenix",
    "daysToFirstCard",
    "daysSinceSignupToLastEvent",
  ];

  const csvLines = [
    csvColumns.join(","),
    ...analyses.map((item) =>
      csvColumns
        .map((column) => {
          if (column === "flagCodes") return csvCell(item.flags.map((flag) => flag.code).join(";"));
          return csvCell(item[column]);
        })
        .join(",")
    ),
  ];
  fs.writeFileSync(CSV_PATH, csvLines.join("\n") + "\n", "utf8");
  fs.writeFileSync(JSON_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), analyses }, null, 2), "utf8");

  const md = [];
  md.push(`# MyBingoCard User Journey Analysis - ${RUN_DATE}`);
  md.push("");
  md.push(`Generated: ${fmt(new Date())} Arizona time`);
  md.push("");
  md.push("## Scope");
  md.push("");
  md.push(`- Accounts reviewed from \`users\`: ${analyses.length}`);
  md.push(`- Reportable customer accounts: ${reportable.length}`);
  md.push(`- Excluded from business metrics but still audited: ${excluded.length} (guest/test/admin/Cory-named/internal-style accounts)`);
  md.push("- Joined data sources: users, activity_events, cards, gameHistory, game_rooms, subscriptions, support_tickets, email_preferences, drip_log, drip_opens, checkout_reminder_log, error_events.");
  md.push("- Matching keys: userId, lowercased email, and stored anonymousId where present.");
  md.push("");
  md.push("## Executive Summary");
  md.push("");
  md.push(`- Issue severity among reportable users: ${bySeverity.map(([key, count]) => `${key} ${count}`).join(", ") || "none"}.`);
  md.push(`- Lifecycle mix among reportable users: ${byLifecycle.map(([key, count]) => `${key} ${count}`).join(", ") || "none"}.`);
  md.push(`- High-priority accounts to inspect manually: ${high.length}.`);
  md.push(`- Medium-priority accounts: ${medium.length}.`);
  md.push(`- Signed-up/no clear activation or friction before activation: ${noActivation.length}.`);
  md.push("");
  md.push("## High Priority Accounts");
  md.push("");
  if (high.length === 0) {
    md.push("No high-priority reportable accounts found.");
  } else {
    md.push("| User | Email | Lifecycle | Last signal | Flags |");
    md.push("|---|---|---|---|---|");
    for (const item of high) {
      md.push(`| ${escapeMd(item.name || "(no name)")} | ${escapeMd(item.email)} | ${escapeMd(item.lifecycle)} | ${escapeMd(item.latestMeaningfulAtPhoenix || item.lastEventAtPhoenix)} ${escapeMd(item.latestMeaningfulEvent)} | ${escapeMd(item.flags.map((flag) => `${flag.code}: ${flag.detail}`).join("; "))} |`);
    }
  }
  md.push("");
  md.push("## Per-User Detail");
  md.push("");

  for (const item of analyses) {
    md.push(`### ${item.reportable ? "" : "[Excluded] "}${item.name || "(no name)"} - ${item.email || item.userId}`);
    md.push("");
    md.push(`- User ID: \`${item.userId}\``);
    md.push(`- Account: ${item.createdAtPhoenix || "unknown"}; source ${item.source}; signup ${item.signupMethod || "unknown"}; device ${item.signupDevice || "unknown"}; language ${item.signupLanguage || "unknown"}`);
    md.push(`- Status: ${item.planType}/${item.subscriptionStatus}; lifecycle ${item.lifecycle}; issue severity ${item.issueSeverity}; reportable ${item.reportable ? "yes" : "no"}`);
    md.push(`- Activity: ${item.eventCount} tracked events over ${item.activeDays} active day(s); ${item.loginCount} login(s); last login ${item.lastLoginAtPhoenix || "none recorded"}; last meaningful signal ${item.latestMeaningfulAtPhoenix || "none"} ${item.latestMeaningfulEvent || ""}`.trim());
    md.push(`- Product use: ${item.cardCount} card(s), ${item.cardsUpdated} updated card(s), ${item.gameHistoryCount} game history record(s), ${item.roomsHosted} live room(s) hosted`);
    md.push(`- Messaging/billing/support: ${item.dripSentCount} drip log(s), ${item.dripOpenCount} drip open(s), ${item.checkoutReminderCount} checkout reminder(s), ${item.supportTicketCount} support ticket(s), ${item.errorEventCount} captured error(s)`);
    if (item.flags.length > 0) {
      md.push(`- Issues: ${item.flags.map((flag) => `[${flag.severity}] ${flag.code}: ${flag.detail}`).join("; ")}`);
    } else {
      md.push("- Issues: none clearly recorded");
    }
    md.push("- Timeline:");
    if (item.milestones.length === 0) {
      md.push("  - No timeline events found.");
    } else {
      for (const milestone of item.milestones) {
        md.push(`  - ${milestone.timePhoenix || "unknown"} - ${escapeMd(milestone.label)}`);
      }
    }
    if (item.recentEvents.length > 0) {
      md.push("- Recent meaningful/friction events:");
      for (const event of item.recentEvents.slice(-6)) {
        md.push(`  - ${event.timePhoenix} - ${event.event}${event.path ? ` (${escapeMd(event.path)})` : ""}`);
      }
    }
    if (item.cards.length > 0) {
      md.push("- Recent cards:");
      for (const card of item.cards.slice(-5)) {
        md.push(`  - ${card.createdAtPhoenix} - ${escapeMd(card.title)} (${card.size}x${card.size}, views ${card.views}, public ${card.isPublic ? "yes" : "no"})`);
      }
    }
    if (item.supportTickets.length > 0) {
      md.push("- Support:");
      for (const ticket of item.supportTickets) {
        md.push(`  - ${ticket.receivedAtPhoenix} - ${escapeMd(ticket.subject)} [${escapeMd(ticket.status)}] ${escapeMd(ticket.preview)}`);
      }
    }
    md.push("");
  }

  md.push("## Completion Audit");
  md.push("");
  md.push("- Objective: inspect every MyBingoCard user and produce step-by-step end-to-end analysis with issues/friction identified.");
  md.push(`- Evidence of full-user coverage: users collection count ${users.length}; generated analysis rows ${analyses.length}; reportable rows ${reportable.length}; excluded audited rows ${excluded.length}.`);
  md.push("- Evidence of data-source coverage: report joins account, product, activity, game, billing, support, email, checkout-reminder, and captured-error collections listed in Scope.");
  md.push("- Known limitation: analysis uses recorded telemetry only. Missing client-side tracking or deleted users outside the current users collection cannot be reconstructed from this report.");

  fs.writeFileSync(REPORT_PATH, md.join("\n"), "utf8");

  console.log(JSON.stringify({
    reportPath: REPORT_PATH,
    csvPath: CSV_PATH,
    jsonPath: JSON_PATH,
    users: users.length,
    reportable: reportable.length,
    excluded: excluded.length,
    highPriority: high.length,
    mediumPriority: medium.length,
    noActivation: noActivation.length,
  }, null, 2));

  if (client) {
    await client.close();
  } else {
    sqliteDb.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
