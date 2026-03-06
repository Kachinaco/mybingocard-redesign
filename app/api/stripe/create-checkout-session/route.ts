import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/db/users";
import { stripe, PLANS, getPlanByPriceId } from "@/lib/stripe/config";
import type Stripe from "stripe";

const TRIAL_DAYS = 7;
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");

function buildCheckoutUrl(path: string | undefined, fallback: string): string {
  const safePath = path && path.startsWith("/") ? path : fallback;
  return `${appUrl}${safePath}`;
}

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
    const { priceId, successPath, cancelPath } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    const planType = getPlanByPriceId(priceId);
    if (!planType) {
      return NextResponse.json(
        { error: "Invalid price ID" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(session.user.email);
    const plan = PLANS[planType];
    const trialEligible = Boolean(
      user && user.planType === "FREE" && !user.stripeSubscriptionId && !user.trialEndsAt
    );

    const metadata: Record<string, string> = {
      userId: session.user.email,
      planType,
      planName: plan.name,
      purchaseType: trialEligible ? "trial_subscription" : "subscription",
    };

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: {
        userId: session.user.email,
        planType,
      },
    };

    if (trialEligible) {
      subscriptionData.trial_period_days = TRIAL_DAYS;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      payment_method_collection: "always",
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: buildCheckoutUrl(successPath, "/dashboard?success=true"),
      cancel_url: buildCheckoutUrl(cancelPath, "/pricing?canceled=true"),
      customer_email: session.user.email,
      client_reference_id: session.user.email,
      metadata,
      subscription_data: subscriptionData,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      trialEligible,
    });
  } catch (error: any) {
    console.error("Create checkout session error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
