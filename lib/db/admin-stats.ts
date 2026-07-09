import { getSqliteStore } from "@/lib/db/sqlite";

export interface AdminStats {
  totalUsers: number;
  paidUsers: number;
  totalCards: number;
  recentSignups: number;
  mrr: number;
  revenueEstimate: number;
  totalNetRevenue: number;
  trialingUsers: number;
  canceledUsers: number;
  lifetimeUsers: number;
  pastDueUsers: number;
  trialConversionRate: number;
  totalTrialsEver: number;
  convertedTrials: number;
  unconvertedTrials: number;
  subscriptionStatusBreakdown: Record<string, number>;
  signupsByMethod: Record<string, number>;
  signupsBySource: Record<string, number>;
  paidBySource: Record<string, number>;
  signupsLast30Days: number;
  recentSignupsTrend: { date: string; count: number }[];
  deadClickHotspots: {
    page: string;
    tag: string;
    text: string;
    className: string;
    count: number;
    uniqueSessions: number;
    lastSeenAt: Date | null;
    popularity: "popular" | "very_popular";
  }[];
}

export async function getAdminStats(): Promise<AdminStats> {
  return getAdminStatsFromSqlite();
}

interface AdminUserDocument {
  subscriptionStatus?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  customerType?: string | null;
  trialEndsAt?: Date | string | null;
  createdAt?: Date | string | null;
  signupMethod?: string | null;
  utm_source?: string | null;
}

interface AdminActivityDocument {
  event?: string | null;
  pathname?: string | null;
  sessionId?: string | null;
  metadata?: {
    amount?: number | string | null;
    tag?: string | null;
    text?: string | null;
    className?: string | null;
  } | null;
  createdAt?: Date | string | null;
}

async function getAdminStatsFromSqlite(): Promise<AdminStats> {
  const store = getSqliteStore();
  const now = new Date();
  const standardMonthlyPriceId = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "";
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const realPayingFilter = {
    subscriptionStatus: "active",
    stripeSubscriptionId: { $exists: true, $ne: null },
    stripePriceId: standardMonthlyPriceId,
    customerType: "real",
  };

  const [
    totalUsers,
    paidUsers,
    trialingUsers,
    canceledUsers,
    lifetimeUsers,
    pastDueUsers,
    totalCards,
    recentSignups,
    signupsLast30Days,
  ] = await Promise.all([
    Promise.resolve(store.count("users")),
    Promise.resolve(store.count("users", realPayingFilter)),
    Promise.resolve(store.count("users", {
      $or: [
        { subscriptionStatus: "trialing" },
        { trialEndsAt: { $gt: now } },
      ],
    })),
    Promise.resolve(store.count("users", { subscriptionStatus: "canceled" })),
    Promise.resolve(store.count("users", { subscriptionStatus: "lifetime" })),
    Promise.resolve(store.count("users", { subscriptionStatus: "past_due" })),
    Promise.resolve(store.count("cards")),
    Promise.resolve(store.count("users", { createdAt: { $gte: sevenDaysAgo } })),
    Promise.resolve(store.count("users", { createdAt: { $gte: thirtyDaysAgo } })),
  ]);

  const users = store.findMany<AdminUserDocument>("users");
  const paymentEvents = store.findMany<AdminActivityDocument>("activity_events", {
    event: "billing_payment_succeeded",
  });
  const deadClickEvents = store.findMany<AdminActivityDocument>("activity_events", {
    event: "dead_click",
    createdAt: { $gte: fourteenDaysAgo },
  });

  const statusBreakdown = countBy(users, (user) => user.subscriptionStatus || "none");

  const trialUsers = users.filter((user) => user.trialEndsAt !== null && typeof user.trialEndsAt !== "undefined");
  const convertedTrials = trialUsers.filter((user) => user.subscriptionStatus === "active").length;
  const unconvertedTrials = trialUsers.length - convertedTrials;
  const totalTrialsEver = convertedTrials + unconvertedTrials;
  const trialConversionRate =
    totalTrialsEver > 0
      ? Math.round((convertedTrials / totalTrialsEver) * 10000) / 100
      : 0;

  const signupsByMethod = sortCountRecord(countBy(users, (user) => user.signupMethod || "unknown"));
  const signupsBySource = sortCountRecord(countBy(
    users.filter((user) => user.utm_source !== null && typeof user.utm_source !== "undefined"),
    (user) => String(user.utm_source)
  ), 10);
  const paidBySource = sortCountRecord(countBy(
    store.findMany<AdminUserDocument>("users", {
      ...realPayingFilter,
      utm_source: { $exists: true, $ne: null },
    }),
    (user) => String(user.utm_source)
  ));

  const totalNetRevenue = paymentEvents.reduce((total, event) => {
    const amount = Number(event.metadata?.amount ?? 0);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0) / 100;

  const trendMap = new Map<string, number>();
  for (const user of users) {
    const createdAt = asDate(user.createdAt);
    if (!createdAt || createdAt < fourteenDaysAgo) continue;
    const dateKey = createdAt.toISOString().slice(0, 10);
    trendMap.set(dateKey, (trendMap.get(dateKey) ?? 0) + 1);
  }

  const recentSignupsTrend: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    recentSignupsTrend.push({
      date: dateStr,
      count: trendMap.get(dateStr) ?? 0,
    });
  }

  const deadClickHotspots = buildDeadClickHotspots(deadClickEvents);
  const mrr = paidUsers * 7.99;

  return {
    totalUsers,
    paidUsers,
    totalCards,
    recentSignups,
    mrr,
    revenueEstimate: mrr,
    totalNetRevenue,
    trialingUsers,
    canceledUsers,
    lifetimeUsers,
    pastDueUsers,
    trialConversionRate,
    totalTrialsEver,
    convertedTrials,
    unconvertedTrials,
    subscriptionStatusBreakdown: statusBreakdown,
    signupsByMethod,
    signupsBySource,
    paidBySource,
    signupsLast30Days,
    recentSignupsTrend,
    deadClickHotspots,
  };
}

function countBy<T>(entries: T[], getKey: (entry: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    const key = getKey(entry);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function sortCountRecord(record: Record<string, number>, limit?: number): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record)
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
  );
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function buildDeadClickHotspots(events: AdminActivityDocument[]): AdminStats["deadClickHotspots"] {
  const groups = new Map<string, {
    page: string;
    tag: string;
    text: string;
    className: string;
    count: number;
    uniqueSessions: Set<string>;
    lastSeenAt: Date | null;
  }>();

  for (const event of events) {
    const page = event.pathname || "";
    const tag = event.metadata?.tag || "";
    const text = event.metadata?.text || "";
    const className = event.metadata?.className || "";
    const key = JSON.stringify([page, tag, text, className]);
    const group = groups.get(key) ?? {
      page,
      tag,
      text,
      className,
      count: 0,
      uniqueSessions: new Set<string>(),
      lastSeenAt: null,
    };
    const seenAt = asDate(event.createdAt);

    group.count += 1;
    if (event.sessionId) group.uniqueSessions.add(event.sessionId);
    if (seenAt && (!group.lastSeenAt || seenAt > group.lastSeenAt)) group.lastSeenAt = seenAt;
    groups.set(key, group);
  }

  return [...groups.values()]
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return (right.lastSeenAt?.getTime() ?? 0) - (left.lastSeenAt?.getTime() ?? 0);
    })
    .slice(0, 8)
    .map((group) => ({
      page: group.page,
      tag: group.tag,
      text: group.text,
      className: group.className,
      count: group.count,
      uniqueSessions: group.uniqueSessions.size,
      lastSeenAt: group.lastSeenAt,
      popularity: group.count >= 10 ? "very_popular" : "popular",
    }));
}
