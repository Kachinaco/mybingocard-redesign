import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAvailableBatchPurchases } from "@/lib/db/batchPurchases";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const purchases = await getAvailableBatchPurchases(session.user.id);
    const availableByCount = purchases.reduce<Record<string, number>>((acc, purchase) => {
      const key = String(purchase.batchCount);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      purchases: purchases.map((purchase) => ({
        id: purchase._id.toString(),
        batchCount: purchase.batchCount,
        amount: purchase.amount,
        currency: purchase.currency,
        purchasedAt: purchase.purchasedAt,
      })),
      availableByCount,
    });
  } catch (error) {
    console.error("Batch purchases error:", error);
    return NextResponse.json(
      { error: "Failed to load batch purchases" },
      { status: 500 }
    );
  }
}
