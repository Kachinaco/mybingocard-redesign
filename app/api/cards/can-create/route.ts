import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/db/users";
import { PLANS } from "@/lib/stripe/config";
import clientPromise from "@/lib/mongodb";
import { trackActivity } from "@/lib/activity";
import { sendCardLimitEmail } from "@/lib/email";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");
    const planType = user.planType || "FREE";
    const plan = PLANS[planType as keyof typeof PLANS];

    if (!plan) {
      return NextResponse.json({
        allowed: true,
        cardsCreated: 0,
        cardsLimit: -1,
        planType,
      });
    }

    const totalCards = await db.collection("cards").countDocuments({
      userId: user._id.toString(),
    });

    const maxCards = plan.limits.maxCards;
    const allowed = maxCards === -1 || totalCards < maxCards;

    trackActivity({
      event: "card_creation_check",
      source: "server",
      userId: user._id.toString(),
      email: session.user.email,
      pathname: "/api/cards/can-create",
      metadata: {
        allowed,
        cards_created: totalCards,
        cards_limit: maxCards,
        plan_type: planType,
      },
    }).catch(() => {});

    // Send card-limit upsell email (once per user)
    if (!allowed && planType === "FREE") {
      const alreadySent = await db.collection("drip_log").findOne({
        userId: user._id,
        campaignId: "card_limit_hit",
      });
      if (!alreadySent) {
        sendCardLimitEmail(session.user.email, user.name || "there").catch(() => {});
        db.collection("drip_log").insertOne({
          userId: user._id,
          campaignId: "card_limit_hit",
          email: session.user.email,
          subject: "You hit your card limit",
          sentAt: new Date(),
          status: "sent",
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      allowed,
      reason: allowed ? undefined : "You've reached your free card limit. Upgrade to Premium for unlimited cards.",
      upgradeRequired: !allowed,
      cardsCreated: totalCards,
      cardsLimit: maxCards,
      planType,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd || null,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd || false,
      requiresCheckout: user.requiresCheckout || false,
    });
  } catch (error: any) {
    console.error("Check card creation permission error:", error);
    return NextResponse.json(
      { error: "Failed to check permissions" },
      { status: 500 }
    );
  }
}
