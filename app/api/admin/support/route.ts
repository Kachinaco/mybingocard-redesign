import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAdminSessionEmail, requireAdmin } from "@/lib/admin";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

export async function GET(request: Request) {
  try {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestContext = getRequestActivityContext(request);
    const adminEmail = getAdminSessionEmail(session);

    const client = await clientPromise;
    const db = client.db("mybingocard");

    const tickets = await db
      .collection("support_tickets")
      .find({})
      .sort({ receivedAt: -1 })
      .limit(100)
      .toArray();

    await trackActivity({
      event: "support_ticket_accessed",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
        result_count: tickets.length,
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Admin support tickets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestContext = getRequestActivityContext(request);
    const adminEmail = getAdminSessionEmail(session);

    const { ticketId, status } = await request.json();

    if (!ticketId || !status) {
      return NextResponse.json(
        { error: "Missing ticketId or status" },
        { status: 400 }
      );
    }

    if (!["open", "resolved"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'open' or 'resolved'" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");

    await db.collection("support_tickets").updateOne(
      { _id: new ObjectId(ticketId) },
      { $set: { status, updatedAt: new Date() } }
    );

    await trackActivity({
      event: "support_ticket_updated",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
        ticket_id: ticketId,
        new_status: status,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin support ticket update error:", error);
    return NextResponse.json(
      { error: "Failed to update support ticket" },
      { status: 500 }
    );
  }
}
