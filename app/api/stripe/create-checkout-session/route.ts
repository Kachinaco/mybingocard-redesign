import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe, PLANS, getPlanByPriceId } from "@/lib/stripe/config";
import { getUserByEmail, updateUserSubscription } from "@/lib/db/users";
import { getBatchPack, isBatchCount } from "@/lib/batchPacks";
import { upsertBatchPurchaseFromCheckout } from "@/lib/db/batchPurchases";
import type Stripe from "stripe";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { notifyCheckoutStarted } from "@/lib/discord";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");

function buildCheckoutUrl(path: string | undefined, fallback: string): string {
  const safePath = path && path.startsWith("/") ? path : fallback;
  return `${appUrl}${safePath}`;
}

function isActiveLikeStatus(status: Stripe.Subscription.Status): boolean {
  return ["active", "trialing", "past_due", "unpaid"].includes(status);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { priceId, successPath, cancelPath, purchaseType, batchCount } = body;
    const user = await getUserByEmail(session.user.email);
    const existingCustomers = await stripe.customers.list({
      email: session.user.email,
      limit: 10,
    });

    let reusableCustomerId = user?.stripeCustomerId || null;

    for (const customer of existingCustomers.data) {
      if ("deleted" in customer && customer.deleted) {
        continue;
      }

      if (!reusableCustomerId) {
        reusableCustomerId = customer.id;
      }
    }

    if (purchaseType === "batch_pack") {
      if (!session.user.id) {
        return NextResponse.json(
          { error: "Unauthorized - Please sign in" },
          { status: 401 }
        );
      }

      if (!isBatchCount(batchCount)) {
        return NextResponse.json(
          { error: "Invalid batch size" },
          { status: 400 }
        );
      }

      if (user?.planType === "PREMIUM") {
        return NextResponse.json(
          { error: "Premium already includes batch generation." },
          { status: 400 }
        );
      }

      const batchPack = getBatchPack(batchCount);
      if (!batchPack) {
        return NextResponse.json(
          { error: "Invalid batch size" },
          { status: 400 }
        );
      }

      // Free tier: no Stripe checkout needed, create purchase record directly
      if (batchPack.amount === 0) {
        await upsertBatchPurchaseFromCheckout({
          userId: session.user.id,
          email: session.user.email || "",
          batchCount: batchPack.count,
          amount: 0,
          currency: "usd",
          stripeSessionId: `free_${session.user.id}_${batchPack.count}_${Date.now()}`,
          stripePaymentIntentId: null,
        });

        await trackActivity({
          event: "batch_pack_free_claimed",
          source: "server",
          userId: session.user.id,
          email: session.user.email,
          pathname: requestContext.pathname,
          domain: requestContext.domain,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          metadata: {
            purchaseType: "batch_pack",
            batchCount: batchPack.count,
            amount: 0,
          },
        });

        return NextResponse.json({
          free: true,
          batchCount: batchPack.count,
          message: "Free batch pack activated. You can now generate cards.",
        });
      }

      const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: batchPack.currency,
              unit_amount: batchPack.amount,
              product_data: {
                name: `${batchPack.count} Bingo Card Batch`,
                description: `One-time batch generation for ${batchPack.count} unique bingo cards`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: buildCheckoutUrl(
          successPath,
          `/create?batchPurchase=success&batchCount=${batchPack.count}`
        ),
        cancel_url: buildCheckoutUrl(
          cancelPath,
          `/create?batchPurchase=canceled&batchCount=${batchPack.count}`
        ),
        client_reference_id: session.user.id,
        metadata: {
          purchaseType: "batch_pack",
          userId: session.user.id,
          userEmail: session.user.email,
          batchCount: String(batchPack.count),
          amount: String(batchPack.amount),
          currency: batchPack.currency,
        },
      };

      if (reusableCustomerId) {
        checkoutSessionParams.customer = reusableCustomerId;
      } else {
        checkoutSessionParams.customer_email = session.user.email;
      }

      const checkoutSession = await stripe.checkout.sessions.create(checkoutSessionParams);

      await trackActivity({
        event: "checkout_started",
        source: "server",
        userId: session.user.id,
        email: session.user.email,
        pathname: requestContext.pathname,
        domain: requestContext.domain,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: {
          purchaseType: "batch_pack",
          batchCount: batchPack.count,
          amount: batchPack.amount,
          checkoutSessionId: checkoutSession.id,
          successPath: successPath || null,
          cancelPath: cancelPath || null,
        },
      });

      notifyCheckoutStarted(
        session.user.email,
        session.user.name || "",
        "one_time",
        `${batchPack.count} Card Batch`,
        batchPack.amount,
        batchPack.currency,
        checkoutSession.id
      ).catch(console.error);

      return NextResponse.json({
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      });
    }

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

    const plan = PLANS[planType];
    let existingSubscription: Stripe.Subscription | null = null;

    for (const customer of existingCustomers.data) {
      if ("deleted" in customer && customer.deleted) {
        continue;
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 10,
      });

      const match = subscriptions.data.find((subscription) => {
        if (!isActiveLikeStatus(subscription.status)) {
          return false;
        }

        return subscription.items.data.some((item) => item.price.id === priceId);
      });

      if (match) {
        existingSubscription = match;
        reusableCustomerId = customer.id;
        break;
      }
    }

    if (existingSubscription && reusableCustomerId) {
      await updateUserSubscription(session.user.email, {
        planType,
        stripeCustomerId: reusableCustomerId,
        stripeSubscriptionId: existingSubscription.id,
        stripePriceId: priceId,
        status: existingSubscription.status === "active" || existingSubscription.status === "trialing"
          ? "active"
          : existingSubscription.status === "past_due" || existingSubscription.status === "unpaid"
            ? "past_due"
            : "inactive",
        currentPeriodStart: existingSubscription.items.data[0]?.current_period_start
          ? new Date(existingSubscription.items.data[0].current_period_start * 1000)
          : null,
        currentPeriodEnd: existingSubscription.items.data[0]?.current_period_end
          ? new Date(existingSubscription.items.data[0].current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: existingSubscription.cancel_at_period_end,
        cancelAt: existingSubscription.cancel_at
          ? new Date(existingSubscription.cancel_at * 1000)
          : null,
      });

      return NextResponse.json(
        {
          error: "A Premium subscription is already active for this account.",
          alreadySubscribed: true,
          redirectTo: buildCheckoutUrl(successPath, "/dashboard?success=true"),
        },
        { status: 409 }
      );
    }

    const metadata: Record<string, string> = {
      userId: session.user.email,
      planType,
      planName: plan.name,
      purchaseType: "subscription",
    };

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: {
        userId: session.user.email,
        planType,
      },
    };

    const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
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
      client_reference_id: session.user.email,
      metadata,
      subscription_data: subscriptionData,
    };

    if (reusableCustomerId) {
      checkoutSessionParams.customer = reusableCustomerId;
    } else {
      checkoutSessionParams.customer_email = session.user.email;
    }

    const checkoutSession = await stripe.checkout.sessions.create(checkoutSessionParams);

    await trackActivity({
      event: "checkout_started",
      source: "server",
      userId: session.user.id || null,
      email: session.user.email,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        planType,
        checkoutSessionId: checkoutSession.id,
        successPath: successPath || null,
        cancelPath: cancelPath || null,
      },
    });

    notifyCheckoutStarted(
      session.user.email,
      session.user.name || "",
      "subscription",
      plan.name,
      Math.round(plan.price * 100),
      "usd",
      checkoutSession.id
    ).catch(console.error);

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error: any) {
    console.error("Create checkout session error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
