import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getAdminSessionEmail, requireAdmin } from "@/lib/admin";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

export async function GET(request: Request) {
  try {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestContext = getRequestActivityContext(request);
    const adminEmail = getAdminSessionEmail(session);

    const client = await clientPromise;
    const db = client.db("mybingocard");
    const now = new Date();

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
      db.collection("users").countDocuments({
        subscriptionStatus: "active",
      }),
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
      // Subscription status breakdown via aggregation
      db.collection("users").aggregate<{ _id: string; count: number }>([
        {
          $group: {
            _id: { $ifNull: ["$subscriptionStatus", "none"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]).toArray(),
      // Trial conversion: users who ever had a trial (trialEndsAt set)
      // grouped by whether they converted to active
      db.collection("users").aggregate<{ _id: string; count: number }>([
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
      ]).toArray(),
    ]);

    // Real MRR: only active (non-trialing) subscribers
    const mrr = paidUsers * 4.99;

    // Build status breakdown as a clean object
    const subscriptionStatusBreakdown: Record<string, number> = {};
    for (const row of statusBreakdown) {
      subscriptionStatusBreakdown[row._id] = row.count;
    }

    // Trial conversion rate
    const convertedTrials = trialConversionData.find((r) => r._id === "converted")?.count ?? 0;
    const unconvertedTrials = trialConversionData.find((r) => r._id === "not_converted")?.count ?? 0;
    const totalTrialsEver = convertedTrials + unconvertedTrials;
    const trialConversionRate = totalTrialsEver > 0
      ? Math.round((convertedTrials / totalTrialsEver) * 10000) / 100
      : 0;

    await trackActivity({
      event: "admin_dashboard_accessed",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
      },
    });

    return NextResponse.json({
      totalUsers,
      paidUsers,
      totalCards,
      recentSignups,
      // Revenue
      mrr,
      revenueEstimate: mrr,
      // Subscription cohorts
      trialingUsers,
      canceledUsers,
      lifetimeUsers,
      pastDueUsers,
      // Trial funnel
      trialConversionRate,
      totalTrialsEver,
      convertedTrials,
      unconvertedTrials,
      // Full breakdown
      subscriptionStatusBreakdown,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
