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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const plan = searchParams.get("plan") || "";
    const sortBy = searchParams.get("sort") || "newest";
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db("mybingocard");

    // Build filter query using $and to safely combine search + plan filters
    const conditions: Record<string, unknown>[] = [];

    if (search) {
      // Escape regex special characters to prevent ReDoS / injection
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      conditions.push({
        $or: [
          { name: { $regex: escapedSearch, $options: "i" } },
          { email: { $regex: escapedSearch, $options: "i" } },
        ],
      });
    }

    if (plan) {
      switch (plan) {
        case "premium":
          conditions.push({ planType: "PREMIUM", subscriptionStatus: "active" });
          break;
        case "free":
          conditions.push({
            $or: [{ planType: { $exists: false } }, { planType: "FREE" }, { planType: null }],
          });
          break;
        case "trialing":
          conditions.push({ subscriptionStatus: "trialing" });
          break;
        case "lifetime":
          conditions.push({ planType: "LIFETIME" });
          break;
        case "past_due":
          conditions.push({ subscriptionStatus: "past_due" });
          break;
        case "canceled":
          conditions.push({ subscriptionStatus: "canceled" });
          break;
      }
    }

    const filter: Record<string, unknown> =
      conditions.length > 1
        ? { $and: conditions }
        : conditions.length === 1
          ? (conditions[0] as Record<string, unknown>)
          : {};

    // Build sort
    let sortObj: Record<string, 1 | -1>;
    switch (sortBy) {
      case "oldest":
        sortObj = { createdAt: 1 };
        break;
      case "last_active":
        sortObj = { updatedAt: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    type UserResult = {
      _id: unknown;
      name: string;
      email: string;
      planType: string;
      subscriptionStatus: string;
      createdAt: unknown;
      lastActive: unknown;
      image?: string;
      cardCount: number;
      trialEndsAt: unknown;
      requiresCheckout: boolean;
      stripeCustomerId: string | null;
      customerType?: string;
    };

    let usersWithCards: UserResult[];
    let totalUsers: number;

    if (sortBy === "most_cards") {
      // Use aggregation with $lookup for card-count sorting
      const pipeline = [
        ...(Object.keys(filter).length > 0 ? [{ $match: filter }] : []),
        {
          $lookup: {
            from: "cards",
            let: { uid: { $toString: "$_id" } },
            pipeline: [
              { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
              { $count: "count" },
            ],
            as: "cardData",
          },
        },
        {
          $addFields: {
            cardCount: {
              $ifNull: [{ $arrayElemAt: ["$cardData.count", 0] }, 0],
            },
          },
        },
        { $sort: { cardCount: -1 as const } },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  name: 1, email: 1, planType: 1, subscriptionStatus: 1,
                  createdAt: 1, updatedAt: 1, image: 1, cardCount: 1,
                  trialEndsAt: 1, requiresCheckout: 1, stripeCustomerId: 1, customerType: 1,
                },
              },
            ],
            total: [{ $count: "count" }],
          },
        },
      ];

      const results = await db.collection("users").aggregate(pipeline).toArray();
      const result = results[0] as { data?: Record<string, unknown>[]; total?: { count: number }[] } | undefined;
      const users = (result?.data || []) as Record<string, unknown>[];
      totalUsers = result?.total?.[0]?.count || 0;

      usersWithCards = users.map((user) => ({
        _id: user._id,
        name: (user.name as string) || "No name",
        email: user.email as string,
        planType: (user.planType as string) || "FREE",
        subscriptionStatus: (user.subscriptionStatus as string) || "inactive",
        createdAt: user.createdAt,
        lastActive: user.updatedAt,
        image: user.image as string | undefined,
        cardCount: (user.cardCount as number) || 0,
        trialEndsAt: user.trialEndsAt || null,
        requiresCheckout: (user.requiresCheckout as boolean) || false,
        stripeCustomerId: (user.stripeCustomerId as string) || null,
        customerType: (user.customerType as string) || undefined,
      }));
    } else {
      const [users, count] = await Promise.all([
        db
          .collection("users")
          .find(filter, {
            projection: {
              name: 1, email: 1, planType: 1, subscriptionStatus: 1,
              createdAt: 1, updatedAt: 1, image: 1,
              trialEndsAt: 1, requiresCheckout: 1, stripeCustomerId: 1, customerType: 1,
            },
          })
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection("users").countDocuments(filter),
      ]);
      totalUsers = count;

      const userIds = users.map((u) => u._id.toString());
      const cardCounts = await db
        .collection("cards")
        .aggregate([
          { $match: { userId: { $in: userIds } } },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
        ])
        .toArray();

      const cardCountMap = new Map(
        cardCounts.map((c) => [c._id, c.count])
      );

      usersWithCards = users.map((user) => ({
        _id: user._id,
        name: user.name || "No name",
        email: user.email,
        planType: user.planType || "FREE",
        subscriptionStatus: user.subscriptionStatus || "inactive",
        createdAt: user.createdAt,
        lastActive: user.updatedAt,
        image: user.image,
        cardCount: cardCountMap.get(user._id.toString()) || 0,
        trialEndsAt: user.trialEndsAt || null,
        requiresCheckout: user.requiresCheckout || false,
        stripeCustomerId: user.stripeCustomerId || null,
        customerType: user.customerType || undefined,
      }));
    }

    await trackActivity({
      event: "admin_users_accessed",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
        page,
        result_count: usersWithCards.length,
      },
    });

    return NextResponse.json({
      users: usersWithCards,
      totalUsers,
      page,
      limit,
      totalPages: Math.ceil(totalUsers / limit),
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
