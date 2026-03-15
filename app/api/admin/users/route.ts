import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: Request) {
  try {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db("mybingocard");

    const [users, totalUsers] = await Promise.all([
      db
        .collection("users")
        .find(
          {},
          {
            projection: {
              name: 1,
              email: 1,
              planType: 1,
              subscriptionStatus: 1,
              createdAt: 1,
              updatedAt: 1,
              image: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("users").countDocuments(),
    ]);

    // Get card counts for each user
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

    const usersWithCards = users.map((user) => ({
      _id: user._id,
      name: user.name || "No name",
      email: user.email,
      planType: user.planType || "FREE",
      subscriptionStatus: user.subscriptionStatus || "inactive",
      createdAt: user.createdAt,
      lastActive: user.updatedAt,
      image: user.image,
      cardCount: cardCountMap.get(user._id.toString()) || 0,
    }));

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
