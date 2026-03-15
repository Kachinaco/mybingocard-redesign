import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/db/users";
import { getStripe } from "@/lib/stripe/config";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return NextResponse.json({ success: true, message: "20% discount applied to your next bill!" });
}
