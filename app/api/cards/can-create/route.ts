import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/db/users";
import { PLANS } from "@/lib/stripe/config";
import { getEffectiveCardLimit, hasPremiumAccess, isLegacyFreeUser } from "@/lib/subscription-status";
import clientPromise from "@/lib/mongodb";
import { trackActivity } from "@/lib/activity";

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
        cardsLimit: 1,
        planType,
      });
    }

    const totalCards = await db.collection("cards").countDocuments({
      userId: user._id.toString(),
    });

    const entitled = hasPremiumAccess(user);
    const legacyFree = isLegacyFreeUser(user);
    const maxCards = getEffectiveCardLimit(user);
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
      entitled,
      legacy_free: legacyFree,
      },
    }).catch(() => {});

    const reason = allowed
      ? undefined
      : legacyFree
        ? `You've reached the legacy free plan limit of ${maxCards} saved cards. Existing cards can still be edited.`
        : `You've used your ${maxCards} free saved card. Upgrade for unlimited cards, exports, sharing, and publishing.`;

    return NextResponse.json({
      allowed,
      reason,
      upgradeRequired: !allowed && !legacyFree,
      trialRequired: !allowed && !legacyFree,
      cardsCreated: totalCards,
      cardsLimit: maxCards,
      planType,
      legacyFreeAccess: legacyFree,
      hasPremiumAccess: entitled,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd || null,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd || false,
    });
  } catch (error: any) {
    console.error("Check card creation permission error:", error);
    return NextResponse.json(
      { error: "Failed to check permissions" },
      { status: 500 }
    );
  }
}
