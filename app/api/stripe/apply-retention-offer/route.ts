import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/db/users";
import { getStripe } from "@/lib/stripe/config";
import { trackActivity } from "@/lib/activity";
import { trackApiError } from "@/lib/api-error-tracking";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getUserByEmail(session.user.email);
    if (!user?.stripeSubscriptionId) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    const stripe = getStripe();

    // Create or get the retention coupon (20% off one month)
    let coupon;
    try {
      coupon = await stripe.coupons.retrieve("RETENTION_20PCT");
    } catch {
      coupon = await stripe.coupons.create({
        id: "RETENTION_20PCT",
        percent_off: 20,
        duration: "once",
        name: "Stay with us - 20% off",
      });
    }

    // Apply to subscription
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      discounts: [{ coupon: coupon.id }],
    });

    trackActivity({
      event: "retention_offer_applied",
      source: "server",
      userId: user._id?.toString() || null,
      email: session.user.email,
      pathname: "/api/stripe/apply-retention-offer",
      metadata: {
        subscription_id: user.stripeSubscriptionId,
        coupon_id: coupon.id,
        percent_off: coupon.percent_off,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "20% discount applied to your next bill!" });
  } catch (error) {
    console.error("Retention offer error:", error);
    await trackApiError(error, {
      route: "/api/stripe/apply-retention-offer",
      method: "POST",
      email: session.user.email,
      statusCode: 500,
      metadata: { event_context: "retention_offer_failed" },
    });
    return NextResponse.json({ error: "Failed to apply discount" }, { status: 500 });
  }
}
