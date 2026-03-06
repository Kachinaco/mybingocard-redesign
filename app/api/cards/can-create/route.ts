import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail, checkTrialExpiry } from "@/lib/db/users";
import { PLANS } from "@/lib/stripe/config";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    user = await checkTrialExpiry(user);

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
        trialEligible: false,
      });
    }

    const trialEligible = planType === "FREE" && !user.stripeSubscriptionId && !user.trialEndsAt;

    const totalCards = await db.collection("cards").countDocuments({
      userId: user._id.toString(),
    });

    const maxCards = plan.limits.maxCards;
    const allowed = maxCards === -1 || totalCards < maxCards;

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
      trialEndsAt: user.trialEndsAt || null,
      trialEligible,
    });
  } catch (error: any) {
    console.error("Check card creation permission error:", error);
    return NextResponse.json(
      { error: "Failed to check permissions" },
      { status: 500 }
    );
  }
}
