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

    const client = await clientPromise;
    const db = client.db("mybingocard");

    // Run all queries in parallel
    const [totalUsers, paidUsers, totalCards, recentSignups] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("users").countDocuments({
        planType: "PREMIUM",
        subscriptionStatus: "active",
      }),
      db.collection("cards").countDocuments(),
      db.collection("users").countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const revenueEstimate = paidUsers * 4.99;

    await trackActivity({
      event: "admin_dashboard_accessed",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
      },
    });

    return NextResponse.json({
      totalUsers,
      paidUsers,
      totalCards,
      revenueEstimate,
      recentSignups,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
