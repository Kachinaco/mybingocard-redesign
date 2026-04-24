import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe, PLANS, getPlanByPriceId, LIFETIME_PRICE_ID } from "@/lib/stripe/config";
import { getUserByEmail } from "@/lib/db/users";
import { getBatchPack, isBatchCount } from "@/lib/batchPacks";
import { upsertBatchPurchaseFromCheckout } from "@/lib/db/batchPurchases";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import clientPromise from "@/lib/mongodb";
import { notifyCheckoutStarted } from "@/lib/discord";
import { hasPremiumAccess, isActiveLikeSubscriptionStatus } from "@/lib/subscription-status";
import type Stripe from "stripe";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");
const TRIAL_CHECKOUT_REUSE_WINDOW_MS = 30 * 60 * 1000;

async function findReusableTrialCheckoutSession(email: string) {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const recentStarted = await db.collection("activity_events")
    .find(
      {
        event: "checkout_started",
        email,
        "metadata.purchaseType": "trial",
        createdAt: { $gte: new Date(Date.now() - TRIAL_CHECKOUT_REUSE_WINDOW_MS) },
      },
      { projection: { "metadata.checkoutSessionId": 1 } }
    )
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  const seen = new Set<string>();

  for (const entry of recentStarted) {
    const checkoutSessionId = (entry as { metadata?: { checkoutSessionId?: string } })?.metadata?.checkoutSessionId;
    if (!checkoutSessionId || seen.has(checkoutSessionId)) {
      continue;
    }

    seen.add(checkoutSessionId);

    try {
      const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
      if (
        session.mode === "subscription" &&
        session.status === "open" &&
        typeof session.client_secret === "string" &&
        session.client_secret.length > 0
      ) {
        return session;
      }
    } catch (error) {
      console.error("Failed to inspect existing trial checkout session:", error);
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);

    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { priceId, purchaseType, batchCount, returnPath } = body;
    const user = await getUserByEmail(session.user.email);

    // Find Stripe customer
    let customerId = user?.stripeCustomerId || null;
    if (!customerId) {
      const existing = await stripe.customers.list({ email: session.user.email, limit: 1 });
      if (existing.data.length > 0 && existing.data[0] && !("deleted" in existing.data[0])) {
        customerId = existing.data[0].id;
      }
    }

    // ---- BATCH PACK CHECKOUT ----
    if (purchaseType === "batch_pack") {
      if (!isBatchCount(batchCount)) {
        return NextResponse.json({ error: "Invalid batch size" }, { status: 400 });
      }

      if (user?.planType === "PREMIUM") {
        return NextResponse.json({ error: "Premium already includes batch generation." }, { status: 400 });
      }

      const batchPack = getBatchPack(batchCount);
      if (!batchPack) {
        return NextResponse.json({ error: "Invalid batch size" }, { status: 400 });
      }

      // Free tier batch pack — no checkout needed
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
          metadata: { purchaseType: "batch_pack", batchCount: batchPack.count, amount: 0 },
        });

        const redirectUrl = returnPath || `/create?batchPurchase=success&batchCount=${batchCount}`;
        return NextResponse.json({ free: true, batchCount: batchPack.count, redirectUrl });
      }

      // Paid batch pack — embedded checkout
      const batchReturnUrl = `${appUrl}${returnPath || `/create?batchPurchase=success&batchCount=${batchCount}`}&session_id={CHECKOUT_SESSION_ID}`;

      const checkoutParams: Stripe.Checkout.SessionCreateParams = {
        ui_mode: "embedded",
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: batchPack.currency,
            unit_amount: batchPack.amount,
            product_data: {
              name: `${batchPack.count} Bingo Card Batch`,
              description: `One-time batch generation for ${batchPack.count} unique bingo cards`,
            },
          },
          quantity: 1,
        }],
        return_url: batchReturnUrl,
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

      if (customerId) {
        checkoutParams.customer = customerId;
      } else {
        checkoutParams.customer_email = session.user.email;
      }

      const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

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
          checkoutMode: "embedded",
        },
      });

      notifyCheckoutStarted(
        session.user.email, session.user.name || "", "one_time",
        `${batchPack.count} Card Batch`, batchPack.amount, batchPack.currency, checkoutSession.id
      ).catch(console.error);

      return NextResponse.json({ clientSecret: checkoutSession.client_secret, sessionId: checkoutSession.id });
    }

    // ---- LIFETIME PREMIUM CHECKOUT ----
    if (purchaseType === "lifetime") {
      // Check if user already has premium
      if (user?.planType === "PREMIUM") {
        return NextResponse.json({ error: "You already have Premium access." }, { status: 409 });
      }

      const lifetimeReturnUrl = `${appUrl}${returnPath || "/dashboard?checkout=complete"}&session_id={CHECKOUT_SESSION_ID}`;

      const checkoutParams: Stripe.Checkout.SessionCreateParams = {
        ui_mode: "embedded",
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{ price: LIFETIME_PRICE_ID, quantity: 1 }],
        return_url: lifetimeReturnUrl,
        client_reference_id: session.user.id,
        metadata: {
          purchaseType: "lifetime",
          userId: session.user.id,
          userEmail: session.user.email,
          planType: "PREMIUM",
        },
      };

      if (customerId) {
        checkoutParams.customer = customerId;
      } else {
        checkoutParams.customer_email = session.user.email;
      }

      const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

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
          purchaseType: "lifetime",
          amount: 1499,
          checkoutSessionId: checkoutSession.id,
          checkoutMode: "embedded",
        },
      });

      notifyCheckoutStarted(
        session.user.email, session.user.name || "", "one_time",
        "Premium Lifetime", 1499, "usd", checkoutSession.id
      ).catch(console.error);

      return NextResponse.json({ clientSecret: checkoutSession.client_secret, sessionId: checkoutSession.id });
    }

    // ---- TRIAL SUBSCRIPTION CHECKOUT (7-day free trial) ----
    if (purchaseType === "trial") {
      const trialPriceId = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID;
      if (!trialPriceId) {
        return NextResponse.json({ error: "Trial not configured" }, { status: 500 });
      }

      if (hasPremiumAccess(user)) {
        return NextResponse.json({ error: "Already subscribed", alreadySubscribed: true }, { status: 409 });
      }

      if (customerId) {
        const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
        const existingSubscription = subs.data.find((subscription) => isActiveLikeSubscriptionStatus(subscription.status));
        if (existingSubscription) {
          return NextResponse.json({ error: "Already subscribed", alreadySubscribed: true }, { status: 409 });
        }
      }

      const existingCheckoutSession = await findReusableTrialCheckoutSession(session.user.email);
      if (existingCheckoutSession?.client_secret) {
        return NextResponse.json({
          clientSecret: existingCheckoutSession.client_secret,
          sessionId: existingCheckoutSession.id,
          reused: true,
        });
      }

      const trialReturnUrl = `${appUrl}${returnPath || "/create?trial=started"}&session_id={CHECKOUT_SESSION_ID}`;

      const checkoutParams: Stripe.Checkout.SessionCreateParams = {
        ui_mode: "embedded",
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: trialPriceId, quantity: 1 }],
        return_url: trialReturnUrl,
        client_reference_id: session.user.email,
        metadata: {
          userId: session.user.email,
          planType: "PREMIUM",
          purchaseType: "trial",
        },
        subscription_data: {
          trial_period_days: 7,
          metadata: { userId: session.user.email, planType: "PREMIUM" },
        },
      };

      if (customerId) {
        checkoutParams.customer = customerId;
      } else {
        checkoutParams.customer_email = session.user.email;
      }

      const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

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
          purchaseType: "trial",
          trialDays: 7,
          checkoutSessionId: checkoutSession.id,
          checkoutMode: "embedded",
        },
      });

      notifyCheckoutStarted(
        session.user.email, session.user.name || "", "subscription",
        "7-Day Free Trial", 0, "usd", checkoutSession.id
      ).catch(console.error);

      return NextResponse.json({
        clientSecret: checkoutSession.client_secret,
        sessionId: checkoutSession.id,
        reused: false,
      });
    }

    // ---- SUBSCRIPTION CHECKOUT ----
    if (!priceId) {
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
    }

    const planType = getPlanByPriceId(priceId);
    if (!planType) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    const plan = PLANS[planType];

    // Check for existing active subscription
    if (customerId) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 5 });
      const alreadySubscribed = subs.data.some(s =>
        s.items.data.some(item => item.price.id === priceId)
      );
      if (alreadySubscribed) {
        return NextResponse.json({ error: "Already subscribed", alreadySubscribed: true }, { status: 409 });
      }
    }

    const subReturnUrl = `${appUrl}${returnPath || "/dashboard?checkout=complete"}&session_id={CHECKOUT_SESSION_ID}`;

    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      ui_mode: "embedded",
      mode: "subscription",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: subReturnUrl,
      client_reference_id: session.user.email,
      metadata: {
        userId: session.user.email,
        planType,
        planName: plan.name,
        purchaseType: "subscription",
      },
      subscription_data: {
        metadata: { userId: session.user.email, planType },
      },
    };

    if (customerId) {
      checkoutParams.customer = customerId;
    } else {
      checkoutParams.customer_email = session.user.email;
    }

    const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

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
        purchaseType: "subscription",
        checkoutSessionId: checkoutSession.id,
        checkoutMode: "embedded",
      },
    });

    notifyCheckoutStarted(
      session.user.email, session.user.name || "", "subscription",
      plan.name, Math.round(plan.price * 100), "usd", checkoutSession.id
    ).catch(console.error);

    return NextResponse.json({ clientSecret: checkoutSession.client_secret, sessionId: checkoutSession.id });
  } catch (error: any) {
    console.error("Embedded checkout error:", error);
    return NextResponse.json({ error: error.message || "Failed to create checkout" }, { status: 500 });
  }
}
