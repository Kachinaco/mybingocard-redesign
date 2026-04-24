import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/db/users";
import { getPlanPermissions } from "@/lib/permissions";
import { getTrialDaysLeft, isUserOnTrial } from "@/lib/subscription-status";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const permissions = getPlanPermissions(user.planType);

    const isOnTrial = isUserOnTrial(user);
    const trialDaysLeft = getTrialDaysLeft(user.trialEndsAt);

    return NextResponse.json({
      planType: user.planType,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd || false,
      cancelAt: user.cancelAt || null,
      plan: permissions,
      isOnTrial,
      trialEndsAt: user.trialEndsAt || null,
      trialDaysLeft,
    });
  } catch (error: any) {
    console.error("Get user plan error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user plan" },
      { status: 500 }
    );
  }
}
