import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAdminSessionEmail, requireAdmin } from "@/lib/admin";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
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

    const client = await clientPromise;
    const db = client.db("mybingocard");

    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate new trial end: 7 days from now, or 7 days from current trial end if it's in the future
    const now = new Date();
    const currentTrialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
    const base = currentTrialEnd && currentTrialEnd > now ? currentTrialEnd : now;
    const newTrialEnd = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Update the user record
    await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          trialEndsAt: newTrialEnd,
          subscriptionStatus: "trialing",
          updatedAt: new Date(),
        },
      }
    );

    // If there's a Stripe subscription with a trial, update it too
    if (user.stripeSubscriptionId) {
      try {
        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        if (subscription && subscription.status === "trialing") {
          await stripe.subscriptions.update(user.stripeSubscriptionId, {
            trial_end: Math.floor(newTrialEnd.getTime() / 1000),
          });
        }
      } catch (e) {
        console.error("Failed to update Stripe trial:", e);
        // Don't fail the whole request if Stripe update fails — the DB is already updated
      }
    }

    await trackActivity({
      event: "admin_trial_extended",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
        target_user_id: id,
        new_trial_end: newTrialEnd.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      trialEndsAt: newTrialEnd.toISOString(),
    });
  } catch (error) {
    console.error("Admin extend trial error:", error);
    return NextResponse.json(
      { error: "Failed to extend trial" },
      { status: 500 }
    );
  }
}
