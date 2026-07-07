import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin, getAdminSessionEmail } from "@/lib/admin";
import { getUserById } from "@/lib/db/users";
import { sendAdminCustomEmail } from "@/lib/email";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestContext = getRequestActivityContext(request);
    const adminEmail = getAdminSessionEmail(session);
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body = await request.json();
    const { subject, message } = body as { subject?: string; message?: string };

    if (!subject?.trim()) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message body is required" },
        { status: 400 }
      );
    }

    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const sent = await sendAdminCustomEmail(
      user.email,
      subject.trim(),
      message.trim()
    );

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    await trackActivity({
      event: "admin_email_sent",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
        target_user_id: id,
        target_email: user.email,
        subject: subject.trim(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin send email error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
