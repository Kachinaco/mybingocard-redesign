import clientPromise from "@/lib/mongodb";

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
}

export async function getAdminStats(): Promise<AdminStats> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const now = new Date();

  const standardMonthlyPriceId = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "";
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Real paying users: must have a Stripe subscription with the standard price,
  // only count "real" customers (exclude admin, complimentary, test)
  const realPayingFilter = {
    subscriptionStatus: "active",
    stripeSubscriptionId: { $exists: true, $ne: null },
    stripePriceId: standardMonthlyPriceId,
    customerType: "real",
  };

  // Split into two batches to stay within TS Promise.all tuple overload limits
  const [
    totalUsers,
    paidUsers,
    trialingUsers,
    canceledUsers,
    lifetimeUsers,
    pastDueUsers,
    totalCards,
    recentSignups,
    statusBreakdown,
    trialConversionData,
  ] = await Promise.all([
    db.collection("users").countDocuments(),
    db.collection("users").countDocuments(realPayingFilter),
    db.collection("users").countDocuments({
      $or: [
        { subscriptionStatus: "trialing" },
        { trialEndsAt: { $gt: now } },
      ],
    }),
    db.collection("users").countDocuments({
      subscriptionStatus: "canceled",
    }),
    db.collection("users").countDocuments({
      subscriptionStatus: "lifetime",
    }),
    db.collection("users").countDocuments({
      subscriptionStatus: "past_due",
    }),
    db.collection("cards").countDocuments(),
    db.collection("users").countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
    db
      .collection("users")
      .aggregate<{ _id: string; count: number }>([
        {
          $group: {
            _id: { $ifNull: ["$subscriptionStatus", "none"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("users")
      .aggregate<{ _id: string; count: number }>([
        { $match: { trialEndsAt: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$subscriptionStatus", "active"] },
                "converted",
                "not_converted",
              ],
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);

  const [
    signupsByMethodData,
    signupsBySourceData,
    paidBySourceData,
    signupsLast30Days,
    recentSignupsTrendData,
    netRevenueData,
  ] = await Promise.all([
    db
      .collection("users")
      .aggregate<{ _id: string; count: number }>([
        {
          $group: {
            _id: { $ifNull: ["$signupMethod", "unknown"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("users")
      .aggregate<{ _id: string; count: number }>([
        { $match: { utm_source: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: "$utm_source",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    db
      .collection("users")
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            ...realPayingFilter,
            utm_source: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: "$utm_source",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db.collection("users").countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    }),
    db
      .collection("users")
      .aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: fourteenDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    // Sum all successful payment amounts (stored in cents) from activity_events
    db
      .collection("activity_events")
      .aggregate<{ _id: null; totalCents: number }>([
        { $match: { event: "billing_payment_succeeded" } },
        {
          $group: {
            _id: null,
            totalCents: { $sum: "$metadata.amount" },
          },
        },
      ])
      .toArray(),
  ]);

  const mrr = paidUsers * 4.99;
  const totalNetRevenue = (netRevenueData[0]?.totalCents ?? 0) / 100;

  const subscriptionStatusBreakdown: Record<string, number> = {};
  for (const row of statusBreakdown) {
    subscriptionStatusBreakdown[row._id] = row.count;
  }

  const convertedTrials =
    trialConversionData.find((r) => r._id === "converted")?.count ?? 0;
  const unconvertedTrials =
    trialConversionData.find((r) => r._id === "not_converted")?.count ?? 0;
  const totalTrialsEver = convertedTrials + unconvertedTrials;
  const trialConversionRate =
    totalTrialsEver > 0
      ? Math.round((convertedTrials / totalTrialsEver) * 10000) / 100
      : 0;

  const signupsByMethod: Record<string, number> = {};
  for (const row of signupsByMethodData) {
    signupsByMethod[row._id] = row.count;
  }

  const signupsBySource: Record<string, number> = {};
  for (const row of signupsBySourceData) {
    signupsBySource[row._id] = row.count;
  }

  const paidBySource: Record<string, number> = {};
  for (const row of paidBySourceData) {
    paidBySource[row._id] = row.count;
  }

  // Fill in missing days with 0 counts for the 14-day trend
  const trendMap = new Map(
    recentSignupsTrendData.map((r) => [r._id, r.count])
  );
  const recentSignupsTrend: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    recentSignupsTrend.push({
      date: dateStr,
      count: trendMap.get(dateStr) ?? 0,
    });
  }

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
    subscriptionStatusBreakdown,
    signupsByMethod,
    signupsBySource,
    paidBySource,
    signupsLast30Days,
    recentSignupsTrend,
  };
}
