import { NextResponse } from "next/server";
import { ObjectId } from "bson";
import { getAdminSessionEmail, requireAdmin } from "@/lib/admin";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { deleteCard, getAdminCardsPage } from "@/lib/db/cards";

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
    const search = searchParams.get("search")?.trim() || "";
    const visibility = searchParams.get("visibility") || "all"; // "all" | "public" | "private"

    const result = await getAdminCardsPage({ page, limit, search, visibility });

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
        result_count: result.cards.length,
        search: search || undefined,
        visibility,
      },
    });

    return NextResponse.json(result);
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

    const deleted = await deleteCard(cardId);

    if (!deleted) {
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
