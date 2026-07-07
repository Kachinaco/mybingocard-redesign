import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteUserAccountData, getUserByEmail } from "@/lib/db/users";
import Stripe from "stripe";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { notifyAccountDeleted } from "@/lib/discord";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { confirmation } = await request.json();
    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Please type DELETE to confirm account deletion" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = user._id.toString();

    await trackActivity({
      event: "account_deleted",
      source: "server",
      userId,
      email: user.email,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        hadStripeSubscription: Boolean(user.stripeSubscriptionId),
      },
    });

    // Cancel Stripe subscription if active
    if (user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      } catch (e) {
        console.error("Failed to cancel Stripe subscription:", e);
      }
    }

    await deleteUserAccountData(user);

    notifyAccountDeleted(
      user.name || "",
      user.email,
      user.planType || "FREE",
      Boolean(user.stripeSubscriptionId)
    ).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
