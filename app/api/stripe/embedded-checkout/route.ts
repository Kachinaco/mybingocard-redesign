import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe, PLANS, getPlanByPriceId, LIFETIME_PRICE_ID, LIFETIME_PRICE, PREMIUM_TRIAL_DAYS } from "@/lib/stripe/config";
import { getUserByEmail } from "@/lib/db/users";
import { getCardById } from "@/lib/db/cards";
import { getBatchPack, isBatchCount } from "@/lib/batchPacks";
import { getShareEmailPack } from "@/lib/shareEmailPacks";
import { upsertBatchPurchaseFromCheckout } from "@/lib/db/batchPurchases";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { notifyCheckoutStarted } from "@/lib/discord";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type Stripe from "stripe";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");
const appOrigin = new URL(appUrl).origin;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let shareEmailCheckoutRefsIndexEnsured = false;

function normalizeEmails(input: unknown): string[] {
  const rawEmails = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/[,;\n]+/)
      : [];

  return Array.from(
    new Set(
      rawEmails
        .map((email) => String(email).trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

async function ensureShareEmailCheckoutRefsIndex() {
  if (shareEmailCheckoutRefsIndexEnsured) return;
  try {
    const client = await clientPromise;
    await client.db("mybingocard").collection("share_email_checkout_refs").createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 24 * 60 * 60, name: "share_email_checkout_refs_ttl" }
    );
  } catch (error) {
    console.error("share_email_checkout_refs index setup failed:", error);
  }
  shareEmailCheckoutRefsIndexEnsured = true;
}

function sanitizeReturnPath(path: unknown, fallback: string): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(path, appOrigin);
    if (parsed.origin !== appOrigin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function buildReturnUrl(path: unknown, fallback: string): string {
  const safePath = sanitizeReturnPath(path, fallback);
  const separator = safePath.includes("?") ? "&" : "?";
  return `${appOrigin}${safePath}${separator}session_id={CHECKOUT_SESSION_ID}`;
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

        const redirectUrl = sanitizeReturnPath(
          returnPath,
          `/create?batchPurchase=success&batchCount=${batchCount}`
        );
        return NextResponse.json({ free: true, batchCount: batchPack.count, redirectUrl });
      }

      // Paid batch pack — embedded checkout
      const batchReturnUrl = buildReturnUrl(
        returnPath,
        `/create?batchPurchase=success&batchCount=${batchCount}`
      );

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

    // ---- EMAIL SHARE PACK CHECKOUT ----
    if (purchaseType === "email_share_batch") {
      const cardId = typeof body.cardId === "string" ? body.cardId : "";
      const emails = normalizeEmails(body.emails ?? body.recipients);

      if (!cardId) {
        return NextResponse.json({ error: "cardId is required" }, { status: 400 });
      }

      if (!emails.length) {
        return NextResponse.json({ error: "Enter at least one email address." }, { status: 400 });
      }

      if (emails.length > 500) {
        return NextResponse.json({ error: "You can send to up to 500 emails at a time." }, { status: 400 });
      }

      const invalidEmails = emails.filter((email) => !EMAIL_PATTERN.test(email));
      if (invalidEmails.length) {
        return NextResponse.json(
          { error: `These emails do not look right: ${invalidEmails.join(", ")}` },
          { status: 400 }
        );
      }

      const card = await getCardById(cardId);
      if (!card) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
      }

      if (card.userId.toString() !== session.user.id) {
        return NextResponse.json({ error: "You do not own this card" }, { status: 403 });
      }

      if (user?.planType === "PREMIUM") {
        return NextResponse.json({ error: "Premium already includes email sharing." }, { status: 400 });
      }

      const emailPack = getShareEmailPack(emails.length);
      if (!emailPack) {
        return NextResponse.json({ error: "Too many email recipients." }, { status: 400 });
      }

      await ensureShareEmailCheckoutRefsIndex();
      const refId = new ObjectId();
      const client = await clientPromise;
      await client.db("mybingocard").collection("share_email_checkout_refs").insertOne({
        _id: refId,
        userId: session.user.id,
        userEmail: session.user.email,
        cardId,
        emails,
        createdAt: new Date(),
      });

      const shareEmailReturnUrl = buildReturnUrl(
        returnPath,
        `/cards/${cardId}?shareEmail=sent`
      );

      const checkoutParams: Stripe.Checkout.SessionCreateParams = {
        ui_mode: "embedded",
        mode: "payment",
        payment_method_types: ["card"],
        allow_promotion_codes: true,
        line_items: [{
          price_data: {
            currency: emailPack.currency,
            unit_amount: emailPack.amount,
            product_data: {
              name: `${emailPack.size} Email Share Pack`,
              description: `Send unique bingo card links to ${emails.length} ${emails.length === 1 ? "recipient" : "recipients"}.`,
            },
          },
          quantity: 1,
        }],
        return_url: shareEmailReturnUrl,
        client_reference_id: session.user.id,
        metadata: {
          purchaseType: "email_share_batch",
          userId: session.user.id,
          userEmail: session.user.email,
          cardId,
          recipientCount: String(emails.length),
          packSize: String(emailPack.size),
          amount: String(emailPack.amount),
          currency: emailPack.currency,
          refId: refId.toString(),
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
          purchaseType: "email_share_batch",
          cardId,
          recipientCount: emails.length,
          packSize: emailPack.size,
          amount: emailPack.amount,
          checkoutSessionId: checkoutSession.id,
          checkoutMode: "embedded",
        },
      });

      notifyCheckoutStarted(
        session.user.email,
        session.user.name || "",
        "one_time",
        `${emailPack.size} Email Share Pack`,
        emailPack.amount,
        emailPack.currency,
        checkoutSession.id
      ).catch(console.error);

      return NextResponse.json({ clientSecret: checkoutSession.client_secret, sessionId: checkoutSession.id });
    }

    // ---- LIFETIME PREMIUM CHECKOUT ----
    if (purchaseType === "lifetime") {
      // Check if user already has premium
      if (user?.planType === "PREMIUM") {
        return NextResponse.json({ error: "You already have Premium access." }, { status: 409 });
      }

      const lifetimeReturnUrl = buildReturnUrl(returnPath, "/dashboard?checkout=complete");

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
          amount: Math.round(LIFETIME_PRICE * 100),
          checkoutSessionId: checkoutSession.id,
          checkoutMode: "embedded",
        },
      });

      notifyCheckoutStarted(
        session.user.email, session.user.name || "", "one_time",
        "Premium Lifetime", Math.round(LIFETIME_PRICE * 100), "usd", checkoutSession.id
      ).catch(console.error);

      return NextResponse.json({ clientSecret: checkoutSession.client_secret, sessionId: checkoutSession.id });
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
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
      const alreadySubscribed = subs.data.some(s =>
        ["active", "trialing", "past_due", "unpaid"].includes(s.status) &&
        s.items.data.some(item => getPlanByPriceId(item.price.id) === planType)
      );
      if (alreadySubscribed) {
        return NextResponse.json({ error: "Already subscribed", alreadySubscribed: true }, { status: 409 });
      }
    }

    const subReturnUrl = buildReturnUrl(returnPath, "/dashboard?checkout=complete");

    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      ui_mode: "embedded",
      mode: "subscription",
      payment_method_types: ["card"],
      payment_method_collection: "always",
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
        trial_period_days: PREMIUM_TRIAL_DAYS,
        metadata: { userId: session.user.email, planType, purchaseType: "subscription_trial" },
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
