import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/db/users";
import { canCreateCard } from "@/lib/permissions";
import { PLANS } from "@/lib/stripe/config";
import clientPromise from "@/lib/mongodb";

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

    // Count cards created this month
    const client = await clientPromise;
    const db = client.db("mybingocard");

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const cardsThisMonth = await db.collection("cards").countDocuments({
      userId: user._id.toString(),
      createdAt: { $gte: startOfMonth },
    });

    const planType = user.planType || "FREE";

    // Check permission
    const permission = canCreateCard(planType as keyof typeof PLANS, cardsThisMonth);
    const plan = PLANS[planType as keyof typeof PLANS];

    return NextResponse.json({
      allowed: permission.allowed,
      reason: permission.reason,
      upgradeRequired: permission.upgradeRequired,
      cardsCreatedThisMonth: cardsThisMonth,
      cardsLimit: plan.limits.maxCards,
      planType: planType,
    });
  } catch (error: any) {
    console.error("Check card creation permission error:", error);
    return NextResponse.json(
      { error: "Failed to check permissions" },
      { status: 500 }
    );
  }
}
