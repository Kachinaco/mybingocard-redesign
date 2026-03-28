import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
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
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db("mybingocard");

    const [cards, totalCards] = await Promise.all([
      db
        .collection("cards")
        .find(
          {},
          {
            projection: {
              title: 1,
              userId: 1,
              size: 1,
              isPublic: 1,
              views: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("cards").countDocuments(),
    ]);

    // Get owner info for all cards
    const userIds = [...new Set(cards.map((c) => c.userId))];
    const users = await db
      .collection("users")
      .find(
        {
          _id: {
            $in: userIds
              .filter((id) => ObjectId.isValid(id))
              .map((id) => new ObjectId(id)),
          },
        },
        { projection: { name: 1, email: 1 } }
      )
      .toArray();

    const userMap = new Map(
      users.map((u) => [u._id.toString(), { name: u.name, email: u.email }])
    );

    const cardsWithOwner = cards.map((card) => ({
      _id: card._id,
      title: card.title || "Untitled",
      size: card.size,
      isPublic: card.isPublic || false,
      views: card.views || 0,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      owner: userMap.get(card.userId) || { name: "Unknown", email: "Unknown" },
    }));

    await trackActivity({
      event: "admin_cards_accessed",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
        result_count: cardsWithOwner.length,
      },
    });

    return NextResponse.json({
      cards: cardsWithOwner,
      totalCards,
      page,
      limit,
      totalPages: Math.ceil(totalCards / limit),
    });
  } catch (error) {
    console.error("Admin cards error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 }
    );
  }
}
