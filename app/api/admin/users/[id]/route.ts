import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAdminSessionEmail, requireAdmin } from "@/lib/admin";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

export async function GET(
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

    const client = await clientPromise;
    const db = client.db("mybingocard");

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          password: 0,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's cards
    const cards = await db
      .collection("cards")
      .find({ userId: id })
      .sort({ createdAt: -1 })
      .toArray();

    // Get recent activity events for this user
    const activityFilter: Record<string, unknown>[] = [{ userId: id }];
    if (user.email) {
      activityFilter.push({ email: user.email });
    }
    const activityEvents = await db
      .collection("activity_events")
      .find({ $or: activityFilter })
      .sort({ createdAt: -1 })
      .limit(100)
      .project({
        event: 1,
        source: 1,
        metadata: 1,
        pathname: 1,
        sessionId: 1,
        anonymousId: 1,
        domain: 1,
        ipAddress: 1,
        userAgent: 1,
        createdAt: 1,
      })
      .toArray();

    await trackActivity({
      event: "admin_user_details_accessed",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
        target_user_id: id,
      },
    });

    return NextResponse.json({
      user,
      cards,
      activityEvents,
    });
  } catch (error) {
    console.error("Admin user detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user details" },
      { status: 500 }
    );
  }
}
