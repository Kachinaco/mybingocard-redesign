import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail, checkTrialExpiry } from "@/lib/db/users";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    user = await checkTrialExpiry(user);

    let trialDaysLeft = 0;
    if (user.subscriptionStatus === "trialing" && user.trialEndsAt) {
      trialDaysLeft = Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    const trialEligible = user.planType === "FREE" && !user.stripeSubscriptionId && !user.trialEndsAt;

    return NextResponse.json({
      planType: user.planType,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd || false,
      cancelAt: user.cancelAt || null,
      trialEligible,
      trialDaysLeft,
      trialEndsAt: user.trialEndsAt || null,
    });
  } catch (error: any) {
    console.error("Get user plan error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user plan" },
      { status: 500 }
    );
  }
}
