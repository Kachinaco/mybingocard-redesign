const CREATOR_ACTIVATION_EVENTS = [
  "card_created",
  "first_card_created",
  "card_save_succeeded",
];

const EVENT_READY_EVENTS = [
  "export_pdf",
  "export_png",
  "export_bulk_pdf",
  "batch_pdf_exported",
  "batch_pdf_export_succeeded",
  "batch_cards_created",
  "share_link_generated",
  "share_links_generated",
  "card_share_link_copied",
  "game_created",
  "game_started",
];

const EVENT_COMPLETION_EVENTS = [
  "export_pdf",
  "export_png",
  "export_bulk_pdf",
  "batch_pdf_exported",
  "batch_pdf_export_succeeded",
  "game_completed",
  "game_bingo_claimed",
];

const LIVE_GAME_EVENTS = [
  "game_created",
  "game_player_joined",
  "game_started",
  "game_completed",
];

const REVENUE_EVENTS = [
  "billing_payment_succeeded",
  "checkout_completed",
  "batch_pack_purchased",
  "email_share_batch_sent",
  "share_links_generated",
];

const OPERATOR_EVENTS = [
  ...EVENT_READY_EVENTS,
  "checkout_completed",
  "subscription_activated",
  "billing_payment_succeeded",
];

function dateDaysAgo(now, days) {
  return new Date(now.getTime() - days * 86400000);
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function money(value) {
  return Math.round(value * 100) / 100;
}

function msToMinutes(from, to) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 60000);
}

function percentile(values, percentileValue) {
  const sorted = values
    .filter((value) => typeof value === "number" && Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);
  if (!sorted.length) return null;

  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? null;
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return "";
}

function actorKey(value) {
  const userId = normalizeId(value.userId);
  if (userId) return `user:${userId}`;

  const email = normalizeEmail(value.email);
  if (email) return `email:${email}`;

  const metadata = value.metadata || {};
  const playerId = normalizeId(metadata.playerId);
  if (playerId) return `player:${playerId}`;

  const anonymousId = normalizeId(value.anonymousId);
  if (anonymousId) return `anon:${anonymousId}`;

  const sessionId = normalizeId(value.sessionId);
  if (sessionId) return `session:${sessionId}`;

  return "";
}

function roomCodeFromEvent(event) {
  const value = event?.metadata?.roomCode;
  return typeof value === "string" && value.trim() ? value.trim().toUpperCase() : "";
}

function isReportableCreator(user) {
  const email = normalizeEmail(user.email);
  const name = normalizeEmail(user.name);
  const customerType = normalizeEmail(user.customerType);

  if (!email || email.includes("@guest.mybingocard.local") || email.startsWith("guest-")) return false;
  if (["guest", "test", "admin"].includes(customerType)) return false;
  if (name.includes("cory")) return false;

  return true;
}

function addUserAliases(index, user, value) {
  const userId = normalizeId(user._id);
  const email = normalizeEmail(user.email);
  if (userId) index.set(`user:${userId}`, value);
  if (email) index.set(`email:${email}`, value);
}

function addEarliest(map, key, date) {
  if (!key || !date) return;
  const candidate = new Date(date);
  if (Number.isNaN(candidate.getTime())) return;
  const existing = map.get(key);
  if (!existing || candidate < existing) map.set(key, candidate);
}

function addLatest(map, key, date) {
  if (!key || !date) return;
  const candidate = new Date(date);
  if (Number.isNaN(candidate.getTime())) return;
  const existing = map.get(key);
  if (!existing || candidate > existing) map.set(key, candidate);
}

function metadataNumber(metadata, keys) {
  for (const key of keys) {
    const raw = metadata?.[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && raw.trim()) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function revenueCentsFromEvent(event) {
  const metadata = event.metadata || {};
  const amountCents = metadataNumber(metadata, ["amountCents", "amount_cents"]);
  if (amountCents) return amountCents;

  // Stripe webhook activity uses metadata.amount as cents for collected payments.
  return metadataNumber(metadata, ["amount"]);
}

function uniqueCount(values) {
  return new Set(values.filter(Boolean)).size;
}

function fallbackEventBreakdown(events, eventNames) {
  const counts = {};
  for (const name of eventNames) counts[name] = 0;
  for (const event of events) {
    if (Object.prototype.hasOwnProperty.call(counts, event.event)) counts[event.event] += 1;
  }
  return counts;
}

async function countEvents(db, since, eventNames) {
  const rows = await db
    .collection("activity_events")
    .aggregate([
      { $match: { createdAt: { $gte: since }, event: { $in: eventNames } } },
      { $group: { _id: "$event", count: { $sum: 1 } } },
    ])
    .toArray();

  const counts = {};
  for (const name of eventNames) counts[name] = 0;
  for (const row of rows) counts[row._id] = row.count;
  return counts;
}

async function getProductMetrics(db, options = {}) {
  const now = options.now || new Date();
  const windowDays = options.windowDays || 30;
  const since = dateDaysAgo(now, windowDays);
  const thirtyDaysAgo = dateDaysAgo(now, 30);
  const ninetyDaysAgo = dateDaysAgo(now, 90);
  const seasonalStart = dateDaysAgo(now, 180);
  const seasonalMaturityCutoff = dateDaysAgo(now, 45);

  const [
    cohortUsers,
    recentActivity,
    recentCards,
    paidUsers,
    seasonalActivity,
    repeatCreatorRows,
    eventCounts,
    completionCounts,
    liveGameCounts,
    revenueEvents,
  ] = await Promise.all([
    db
      .collection("users")
      .find(
        { createdAt: { $gte: since, $lte: now } },
        { projection: { _id: 1, email: 1, name: 1, createdAt: 1, customerType: 1, planType: 1, subscriptionStatus: 1 } }
      )
      .toArray(),
    db
      .collection("activity_events")
      .find(
        {
          createdAt: { $gte: since },
          event: { $in: [...new Set([...CREATOR_ACTIVATION_EVENTS, ...EVENT_READY_EVENTS, ...EVENT_COMPLETION_EVENTS, ...LIVE_GAME_EVENTS, ...REVENUE_EVENTS])] },
        },
        { projection: { event: 1, userId: 1, email: 1, anonymousId: 1, sessionId: 1, metadata: 1, createdAt: 1 } }
      )
      .toArray(),
    db
      .collection("cards")
      .find(
        { createdAt: { $gte: since } },
        { projection: { userId: 1, createdAt: 1, batchId: 1 } }
      )
      .toArray(),
    db
      .collection("users")
      .find(
        {
          $or: [
            { planType: { $nin: ["FREE", null, ""] }, subscriptionStatus: { $in: ["active", "trialing", "lifetime"] } },
            { subscriptionStatus: { $in: ["active", "trialing", "lifetime"] } },
          ],
          customerType: { $nin: ["guest", "test", "admin"] },
        },
        { projection: { _id: 1, email: 1 } }
      )
      .toArray(),
    db
      .collection("activity_events")
      .find(
        {
          createdAt: { $gte: seasonalStart },
          event: { $in: OPERATOR_EVENTS },
          $or: [{ userId: { $ne: null } }, { email: { $ne: null } }],
        },
        { projection: { event: 1, userId: 1, email: 1, metadata: 1, createdAt: 1 } }
      )
      .sort({ createdAt: 1 })
      .toArray(),
    db
      .collection("cards")
      .aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, userId: { $exists: true, $ne: null } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
        { $match: { count: { $gte: 2 } } },
      ])
      .toArray(),
    countEvents(db, since, EVENT_READY_EVENTS),
    countEvents(db, since, EVENT_COMPLETION_EVENTS),
    countEvents(db, since, LIVE_GAME_EVENTS),
    db
      .collection("activity_events")
      .find(
        { createdAt: { $gte: since }, event: { $in: REVENUE_EVENTS } },
        { projection: { event: 1, metadata: 1, createdAt: 1 } }
      )
      .toArray(),
  ]);

  const reportableUsers = cohortUsers.filter(isReportableCreator);
  const userLookup = new Map();
  const userState = new Map();

  for (const user of reportableUsers) {
    const userId = normalizeId(user._id);
    if (!userId || !user.createdAt) continue;
    const state = {
      user,
      createdAt: new Date(user.createdAt),
      firstCardAt: null,
      firstEventReadyAt: null,
      completedEvents: 0,
    };
    userState.set(userId, state);
    addUserAliases(userLookup, user, userId);
  }

  const firstCardByUser = new Map();
  for (const card of recentCards) {
    const key = normalizeId(card.userId);
    const userId = userLookup.get(`user:${key}`);
    if (userId) addEarliest(firstCardByUser, userId, card.createdAt);
  }

  for (const event of recentActivity) {
    const key = actorKey(event);
    const userId = userLookup.get(key);
    const state = userId ? userState.get(userId) : null;
    if (!state || !event.createdAt || new Date(event.createdAt) < state.createdAt) continue;

    if (CREATOR_ACTIVATION_EVENTS.includes(event.event)) {
      addEarliest(firstCardByUser, userId, event.createdAt);
    }

    if (EVENT_READY_EVENTS.includes(event.event)) {
      if (!state.firstEventReadyAt || new Date(event.createdAt) < state.firstEventReadyAt) {
        state.firstEventReadyAt = new Date(event.createdAt);
      }
    }

    if (EVENT_COMPLETION_EVENTS.includes(event.event)) {
      state.completedEvents += 1;
    }
  }

  for (const [userId, firstCardAt] of firstCardByUser.entries()) {
    const state = userState.get(userId);
    if (state) state.firstCardAt = firstCardAt;
  }

  const activatedStates = [...userState.values()].filter((state) => state.firstCardAt);
  const eventReadyStates = [...userState.values()].filter((state) => state.firstEventReadyAt);
  const timeToFirstCard = activatedStates
    .map((state) => msToMinutes(state.createdAt, state.firstCardAt))
    .filter((value) => value !== null);
  const timeToEventReady = eventReadyStates
    .map((state) => msToMinutes(state.createdAt, state.firstEventReadyAt))
    .filter((value) => value !== null);

  const eventReadyEvents = Object.values(eventCounts).reduce((sum, count) => sum + count, 0);
  const completedEvents = Object.values(completionCounts).reduce((sum, count) => sum + count, 0);

  const gameJoinEvents = recentActivity.filter((event) => event.event === "game_player_joined");
  const joinedRooms = gameJoinEvents.map(roomCodeFromEvent).filter(Boolean);
  const startedRooms = recentActivity.filter((event) => event.event === "game_started").map(roomCodeFromEvent).filter(Boolean);
  const completedRooms = recentActivity.filter((event) => event.event === "game_completed").map(roomCodeFromEvent).filter(Boolean);

  const billingRevenueEvents = revenueEvents.filter((event) => event.event === "billing_payment_succeeded");
  const revenueSourceEvents = billingRevenueEvents.length ? billingRevenueEvents : revenueEvents.filter((event) => event.event !== "checkout_completed");
  const totalRevenueCents = revenueSourceEvents.reduce((sum, event) => sum + revenueCentsFromEvent(event), 0);
  const revenueEventBreakdown = fallbackEventBreakdown(revenueEvents, REVENUE_EVENTS);

  const paidOperatorKeys = new Set();
  for (const user of paidUsers) {
    const userId = normalizeId(user._id);
    const email = normalizeEmail(user.email);
    if (userId) paidOperatorKeys.add(`user:${userId}`);
    if (email) paidOperatorKeys.add(`email:${email}`);
  }

  const activeOperatorKeys30d = new Set();
  const activeOperatorKeys90d = new Set();
  const seasonalByActor = new Map();
  for (const event of seasonalActivity) {
    const key = actorKey(event);
    if (!key) continue;
    if (new Date(event.createdAt) >= thirtyDaysAgo) activeOperatorKeys30d.add(key);
    if (new Date(event.createdAt) >= ninetyDaysAgo) activeOperatorKeys90d.add(key);
    addEarliest(seasonalByActor, key, event.createdAt);
    addLatest(seasonalByActor, `${key}:latest`, event.createdAt);
  }
  for (const key of paidOperatorKeys) {
    activeOperatorKeys30d.add(key);
    activeOperatorKeys90d.add(key);
  }

  const repeatCreatorKeys = new Set(repeatCreatorRows.map((row) => `user:${normalizeId(row._id)}`).filter((key) => key !== "user:"));
  for (const key of repeatCreatorKeys) activeOperatorKeys30d.add(key);

  let seasonalEligible = 0;
  let seasonalReturned = 0;
  let operator30Eligible = 0;
  let operator30Returned = 0;
  let operator90Eligible = 0;
  let operator90Returned = 0;

  for (const [key, firstSeen] of seasonalByActor.entries()) {
    if (key.endsWith(":latest")) continue;
    const latest = seasonalByActor.get(`${key}:latest`) || firstSeen;
    if (firstSeen <= seasonalMaturityCutoff) {
      seasonalEligible += 1;
      const seasonalThreshold = new Date(firstSeen.getTime() + 45 * 86400000);
      if (latest >= seasonalThreshold) seasonalReturned += 1;
    }
    const threshold30 = new Date(firstSeen.getTime() + 30 * 86400000);
    if (threshold30 <= now) {
      operator30Eligible += 1;
      if (latest >= threshold30) operator30Returned += 1;
    }
    const threshold90 = new Date(firstSeen.getTime() + 90 * 86400000);
    if (threshold90 <= now) {
      operator90Eligible += 1;
      if (latest >= threshold90) operator90Returned += 1;
    }
  }

  const guestPlayers = uniqueCount(
    gameJoinEvents.map((event) => {
      if (normalizeId(event.userId) || normalizeEmail(event.email)) return "";
      return actorKey(event);
    })
  );
  const operatorCount = activeOperatorKeys30d.size;
  const casualCreators = Math.max(0, activatedStates.length - operatorCount);

  const totalRevenue = money(totalRevenueCents / 100);

  return {
    windowDays,
    generatedAt: now,
    activation: {
      reportableCreators: reportableUsers.length,
      activatedCreators: activatedStates.length,
      activationRate: pct(activatedStates.length, reportableUsers.length),
      eventReadyCreators: eventReadyStates.length,
      eventReadyRate: pct(eventReadyStates.length, reportableUsers.length),
      completedCreators: [...userState.values()].filter((state) => state.completedEvents > 0).length,
      medianTimeToFirstCardMinutes: percentile(timeToFirstCard, 50),
      p75TimeToFirstCardMinutes: percentile(timeToFirstCard, 75),
      medianTimeToEventReadyMinutes: percentile(timeToEventReady, 50),
      p75TimeToEventReadyMinutes: percentile(timeToEventReady, 75),
    },
    events: {
      eventReadyEvents,
      completedEvents,
      completionRate: pct(completedEvents, eventReadyEvents),
      eventReadyEventsByType: eventCounts,
      completedEventsByType: completionCounts,
    },
    liveGames: {
      gamesCreated: liveGameCounts.game_created || 0,
      playersJoined: liveGameCounts.game_player_joined || 0,
      gamesStarted: liveGameCounts.game_started || 0,
      gamesCompleted: liveGameCounts.game_completed || 0,
      uniqueRoomsJoined: uniqueCount(joinedRooms),
      uniqueRoomsStarted: uniqueCount(startedRooms),
      uniqueRoomsCompleted: uniqueCount(completedRooms),
      joinedToStartedRate: pct(uniqueCount(startedRooms), uniqueCount(joinedRooms)),
      startedToCompletedRate: pct(uniqueCount(completedRooms), uniqueCount(startedRooms)),
      averagePlayersPerJoinedRoom: uniqueCount(joinedRooms) ? Math.round((gameJoinEvents.length / uniqueCount(joinedRooms)) * 10) / 10 : 0,
    },
    revenue: {
      totalRevenue,
      revenueEvents: revenueSourceEvents.length,
      revenuePerEventReadyCreator: eventReadyStates.length ? money(totalRevenue / eventReadyStates.length) : 0,
      revenuePerCompletedEvent: completedEvents ? money(totalRevenue / completedEvents) : 0,
      revenueEventsByType: revenueEventBreakdown,
    },
    operators: {
      active30d: activeOperatorKeys30d.size,
      active90d: activeOperatorKeys90d.size,
      repeatCreators30d: repeatCreatorKeys.size,
      seasonalReturnCreators: seasonalReturned,
      seasonalReturnEligible: seasonalEligible,
      seasonalReturnRate: pct(seasonalReturned, seasonalEligible),
      operatorReturn30dRate: pct(operator30Returned, operator30Eligible),
      operatorReturn90dRate: pct(operator90Returned, operator90Eligible),
    },
    segments: {
      guestPlayers,
      casualCreators,
      operators: operatorCount,
    },
  };
}

module.exports = {
  CREATOR_ACTIVATION_EVENTS,
  EVENT_READY_EVENTS,
  EVENT_COMPLETION_EVENTS,
  LIVE_GAME_EVENTS,
  REVENUE_EVENTS,
  OPERATOR_EVENTS,
  getProductMetrics,
  isReportableCreator,
};
