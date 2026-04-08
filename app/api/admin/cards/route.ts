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
    const search = searchParams.get("search")?.trim() || "";
    const visibility = searchParams.get("visibility") || "all"; // "all" | "public" | "private"

    const client = await clientPromise;
    const db = client.db("mybingocard");

    // Build the card query filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardFilter: Record<string, any> = {};

    if (visibility === "public") {
      cardFilter.isPublic = true;
    } else if (visibility === "private") {
      cardFilter.isPublic = { $ne: true };
    }

    // If searching, we need to find matching user IDs first (for email search),
    // then combine with title search
    let userIdFilter: string[] | null = null;
    if (search) {
      const emailRegex = new RegExp(search, "i");
      const matchingUsers = await db
        .collection("users")
        .find({ email: emailRegex }, { projection: { _id: 1 } })
        .toArray();
      userIdFilter = matchingUsers.map((u) => u._id.toString());

      const titleCondition = { title: { $regex: search, $options: "i" } };
      if (userIdFilter.length > 0) {
        cardFilter.$or = [
          titleCondition,
          { userId: { $in: userIdFilter } },
        ];
      } else {
        Object.assign(cardFilter, titleCondition);
      }
    }

    const [cards, totalCards] = await Promise.all([
      db
        .collection("cards")
        .find(cardFilter, {
          projection: {
            title: 1,
            userId: 1,
            size: 1,
            cells: 1,
            isPublic: 1,
            views: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("cards").countDocuments(cardFilter),
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
      cells: card.cells || [],
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
        search: search || undefined,
        visibility,
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

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestContext = getRequestActivityContext(request);
    const adminEmail = getAdminSessionEmail(session);

    const { cardId } = await request.json();
    if (!cardId || !ObjectId.isValid(cardId)) {
      return NextResponse.json(
        { error: "Invalid card ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");

    const result = await db
      .collection("cards")
      .deleteOne({ _id: new ObjectId(cardId) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    await trackActivity({
      event: "admin_card_deleted",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
        deleted_card_id: cardId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin card delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete card" },
      { status: 500 }
    );
  }
}
