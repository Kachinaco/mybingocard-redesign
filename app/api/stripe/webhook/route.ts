import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, STRIPE_CONFIG, getPlanByPriceId, PLANS } from "@/lib/stripe/config";
import { updateUserSubscription, getUserByEmail } from "@/lib/db/users";
import {
  sendBillingFailedEmail,
  sendBillingSuccessEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionCanceledEmail,
} from "@/lib/email";
import type Stripe from "stripe";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");

function fireAndForget(promise: Promise<unknown>, context: string) {
  promise.catch((error) => {
    console.error(`${context} failed:`, error);
  });
}

function toDate(timestamp?: number | null): Date | null {
  return typeof timestamp === "number" ? new Date(timestamp * 1000) : null;
}

function mapSubscriptionStatus(
  status: Stripe.Subscription.Status
): "active" | "inactive" | "past_due" | "canceled" | "trialing" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "inactive";
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          const userId = session.metadata?.userId || session.client_reference_id;
          const subscriptionId = session.subscription as string;

          if (userId && subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
            const priceId = subscription.items.data[0]?.price.id;
            const planType = priceId ? getPlanByPriceId(priceId) : null;

            if (planType) {
              await updateUserSubscription(userId, {
                planType,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: priceId,
                status: mapSubscriptionStatus(subscription.status),
                currentPeriodStart: toDate(subscription.items.data[0]?.current_period_start),
                currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end),
                trialEndsAt: toDate(subscription.trial_end),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                cancelAt: toDate(subscription.cancel_at),
              });

              console.log(`Subscription activated for user ${userId}: ${planType}`);

              const recipient =
                session.customer_details?.email ||
                (typeof session.customer_email === "string" ? session.customer_email : null) ||
                userId;

              if (recipient) {
                const user = await getUserByEmail(recipient);
                const planName = PLANS[planType].name;
                fireAndForget(
                  sendSubscriptionActivatedEmail(recipient, user?.name || recipient, planName),
                  `sendSubscriptionActivatedEmail(${recipient})`
                );
              }
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const priceId = subscription.items.data[0]?.price.id;
        const planType = priceId ? getPlanByPriceId(priceId) : null;

        if (userId && planType) {
          await updateUserSubscription(userId, {
            planType,
            stripePriceId: priceId,
            status: mapSubscriptionStatus(subscription.status),
            currentPeriodStart: toDate(subscription.items.data[0]?.current_period_start),
            currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end),
            trialEndsAt: toDate(subscription.trial_end),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            cancelAt: toDate(subscription.cancel_at),
          });

          console.log(`Subscription updated for user ${userId}: ${subscription.status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await updateUserSubscription(userId, {
            planType: "FREE",
            stripeSubscriptionId: null,
            stripePriceId: null,
            status: "canceled",
            currentPeriodStart: null,
            currentPeriodEnd: null,
            trialEndsAt: toDate(subscription.trial_end),
            cancelAtPeriodEnd: false,
            cancelAt: toDate(subscription.canceled_at),
          });

          console.log(`Subscription canceled for user ${userId}`);

          const user = await getUserByEmail(userId);
          fireAndForget(
            sendSubscriptionCanceledEmail(
              userId,
              user?.name || userId,
              subscription.items.data[0]?.current_period_end
                ? new Date(subscription.items.data[0].current_period_end * 1000)
                : null
            ),
            `sendSubscriptionCanceledEmail(${userId})`
          );
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
          const userId = subscription.metadata?.userId;

          if (userId) {
            await updateUserSubscription(userId, {
              status: mapSubscriptionStatus(subscription.status),
              currentPeriodStart: toDate(subscription.items.data[0]?.current_period_start),
              currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end),
              trialEndsAt: toDate(subscription.trial_end),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              cancelAt: toDate(subscription.cancel_at),
            });

            console.log(`Payment succeeded for user ${userId}`);

            const user = await getUserByEmail(userId);
            fireAndForget(
              sendBillingSuccessEmail(
                userId,
                user?.name || userId,
                invoice.amount_paid || invoice.amount_due || 0,
                (invoice.currency || "usd").toUpperCase(),
                subscription.items.data[0]?.current_period_end
                  ? new Date(subscription.items.data[0].current_period_end * 1000)
                  : null
              ),
              `sendBillingSuccessEmail(${userId})`
            );
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
          const userId = subscription.metadata?.userId;

          if (userId) {
            await updateUserSubscription(userId, {
              status: mapSubscriptionStatus(subscription.status),
              trialEndsAt: toDate(subscription.trial_end),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              cancelAt: toDate(subscription.cancel_at),
            });

            console.log(`Payment failed for user ${userId}`);

            const user = await getUserByEmail(userId);
            fireAndForget(
              sendBillingFailedEmail(
                userId,
                user?.name || userId,
                invoice.amount_due || invoice.amount_paid || 0,
                (invoice.currency || "usd").toUpperCase(),
                `${appUrl}/settings`
              ),
              `sendBillingFailedEmail(${userId})`
            );
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
