import { NextResponse } from "next/server";
import { getBatchPack, isBatchCount } from "@/lib/batchPacks";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { readJsonObject } from "@/lib/request-json";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");

export async function POST(request: Request) {
  try {
    const requestContext = getRequestActivityContext(request);
    const body = await readJsonObject(request);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const { batchCount } = body.data;

    if (!isBatchCount(batchCount)) {
      return NextResponse.json({ error: "Invalid batch size" }, { status: 400 });
    }

    const batchPack = getBatchPack(batchCount);
    if (!batchPack) {
      return NextResponse.json({ error: "Invalid batch pack" }, { status: 400 });
    }

    await trackActivity({
      event: "guest_batch_checkout_disabled_free_for_all",
      source: "server",
      userId: null,
      email: null,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        purchaseType: "batch_pack",
        batchCount: batchPack.count,
        amount: 0,
        guestCheckout: true,
      },
    });

    return NextResponse.json({
      free: true,
      url: `${appUrl}/create?batchMode=1&batchCount=${batchCount}&free=1`,
      message: "Batch generation is free right now. Sign in to save and generate your batch.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create free batch link";
    console.error("Guest batch checkout disabled error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
