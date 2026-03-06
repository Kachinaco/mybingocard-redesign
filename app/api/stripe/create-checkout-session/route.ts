import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe, STRIPE_CONFIG, PLANS, getPlanByPriceId, isOneTimePrice } from "@/lib/stripe/config";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { priceId, cardId } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Validate that the price ID exists in our plans
    const planType = getPlanByPriceId(priceId);
    if (!planType) {
      return NextResponse.json(
        { error: "Invalid price ID" },
        { status: 400 }
      );
    }

    const plan = PLANS[planType];
    const isOneTime = isOneTimePrice(priceId);

    // For one-time purchases, cardId is required
    if (isOneTime && !cardId) {
      return NextResponse.json(
        { error: "Card ID is required for one-time purchases" },
        { status: 400 }
      );
    }

    const metadata: Record<string, string> = {
      userId: session.user.email,
      planType: planType,
      planName: plan.name,
      purchaseType: isOneTime ? "one_time" : "subscription",
    };

    if (isOneTime && cardId) {
      metadata.cardId = cardId;
    }

    if (isOneTime) {
      // One-time payment for a specific card
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: STRIPE_CONFIG.successUrl,
        cancel_url: STRIPE_CONFIG.cancelUrl,
        customer_email: session.user.email,
        client_reference_id: session.user.email,
        metadata,
      });

      return NextResponse.json({
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      });
    } else {
      // Subscription checkout
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        allow_promotion_codes: true,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: STRIPE_CONFIG.successUrl,
        cancel_url: STRIPE_CONFIG.cancelUrl,
        customer_email: session.user.email,
        client_reference_id: session.user.email,
        metadata,
        subscription_data: {
          metadata: {
            userId: session.user.email,
            planType: planType,
          },
        },
      });

      return NextResponse.json({
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      });
    }
  } catch (error: any) {
    console.error("Create checkout session error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
