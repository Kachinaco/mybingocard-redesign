import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAdminSessionEmail, requireAdmin } from "@/lib/admin";
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

    await trackActivity({
      event: "admin_trial_extension_blocked",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
        target_user_id: id,
        reason: "trials_retired",
      },
    });

    return NextResponse.json(
      { error: "Trials are retired. Move the user to Premium or Lifetime instead." },
      { status: 410 }
    );
  } catch (error) {
    console.error("Admin extend trial error:", error);
    return NextResponse.json(
      { error: "Failed to retire trial extension request" },
      { status: 500 }
    );
  }
}
