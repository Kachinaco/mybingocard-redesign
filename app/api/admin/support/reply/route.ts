import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { requireAdmin, getAdminSessionEmail } from "@/lib/admin";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { sendSupportReplyEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestContext = getRequestActivityContext(request);
    const adminEmail = getAdminSessionEmail(session);

    const { ticketId, message } = await request.json();

    if (!ticketId || !message?.trim()) {
      return NextResponse.json(
        { error: "Missing ticketId or message" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");

    const ticket = await db
      .collection("support_tickets")
      .findOne({ _id: new ObjectId(ticketId) });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Extract the plain email address from "Name <email>" format
    const emailMatch = (ticket.email as string).match(/<([^>]+)>/);
    const recipientEmail = emailMatch ? emailMatch[1] : (ticket.email as string);

    const sent = await sendSupportReplyEmail(
      recipientEmail!,
      (ticket.subject as string) || "(no subject)",
      message.trim(),
      (ticket.messageId as string | undefined) || undefined
    );

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    // Log the reply on the ticket
    const replyEntry = {
      from: adminEmail,
      message: message.trim(),
      sentAt: new Date(),
    };
    await db.collection("support_tickets").updateOne(
      { _id: new ObjectId(ticketId) },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $push: { replies: replyEntry } as any,
        $set: { updatedAt: new Date() },
      }
    );

    await trackActivity({
      event: "support_ticket_replied",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
        ticket_id: ticketId,
        recipient: recipientEmail,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Support reply error:", error);
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}
