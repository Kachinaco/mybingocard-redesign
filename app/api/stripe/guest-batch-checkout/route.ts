import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/config";
import { getBatchPack, isBatchCount } from "@/lib/batchPacks";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { readJsonObject } from "@/lib/request-json";
import type Stripe from "stripe";

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
    if (!batchPack || batchPack.amount === 0) {
      return NextResponse.json({ error: "Invalid batch pack" }, { status: 400 });
    }

    // Create Stripe Checkout in redirect mode — no auth needed
    // Stripe collects email + payment. Webhook handles account creation.
    const successUrl = `${appUrl}/create?batchPurchase=success&batchCount=${batchCount}&guest=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/create?batchPurchase=canceled&batchCount=${batchCount}`;

    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: batchPack.currency,
          unit_amount: batchPack.amount,
          product_data: {
            name: `${batchPack.count} Bingo Card Batch`,
            description: `One-time batch of ${batchPack.count} unique bingo cards. Sign in after purchase to generate your cards.`,
          },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        purchaseType: "batch_pack",
        batchCount: String(batchPack.count),
        amount: String(batchPack.amount),
        currency: batchPack.currency,
        guestCheckout: "true",
      },
    };

    const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

    await trackActivity({
      event: "guest_batch_checkout_started",
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
        amount: batchPack.amount,
        checkoutSessionId: checkoutSession.id,
        guestCheckout: true,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create checkout";
    console.error("Guest batch checkout error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
