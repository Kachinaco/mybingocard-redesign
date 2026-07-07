import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAdminSessionEmail, requireAdmin } from "@/lib/admin";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { getUserById, markAdminUserCancelAtPeriodEndById } from "@/lib/db/users";
import { getStripe } from "@/lib/stripe/config";

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

    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "User has no active subscription" },
        { status: 400 }
      );
    }

    // Cancel at period end via Stripe
    const stripe = getStripe();
    try {
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (e) {
      console.error("Failed to cancel Stripe subscription:", e);
      return NextResponse.json(
        { error: "Failed to cancel subscription in Stripe" },
        { status: 500 }
      );
    }

    await markAdminUserCancelAtPeriodEndById(id);

    await trackActivity({
      event: "admin_subscription_canceled",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
        target_user_id: id,
        stripe_subscription_id: user.stripeSubscriptionId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin cancel subscription error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
