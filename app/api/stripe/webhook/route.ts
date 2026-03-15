import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, STRIPE_CONFIG, getPlanByPriceId, PLANS, getStripe } from "@/lib/stripe/config";
import { updateUserSubscription, getUserByEmail } from "@/lib/db/users";
import { getBatchPack, isBatchCount } from "@/lib/batchPacks";
import { upsertBatchPurchaseFromCheckout } from "@/lib/db/batchPurchases";
import {
  sendAbandonedCheckoutEmail,
  sendBillingFailedEmail,
  sendBillingSuccessEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionCanceledEmail,
} from "@/lib/email";
import { createSubscription, updateSubscription, getSubscriptionByUserId, PLAN_LIMITS } from "@/lib/db/subscriptions";
import { ObjectId } from "mongodb";
import type Stripe from "stripe";
import { trackActivity } from "@/lib/activity";
import {
  notifyCheckoutActivated,
  notifyCheckoutExpired,
  notifyDisputeUpdate,
  notifyRefundIssued,
  notifyRenewalFailed,
  notifyRenewalPaid,
  notifySubscription,
} from "@/lib/discord";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");

function fireAndForget(promise: Promise<unknown>, context: string) {
  promise.catch((error) => {
    console.error(`${context} failed:`, error);
  });
}

function toDate(timestamp?: number | null): Date | null {
  return typeof timestamp === "number" ? new Date(timestamp * 1000) : null;
}

function isActiveLikeStatus(status: Stripe.Subscription.Status): boolean {
  return ["active", "trialing", "past_due", "unpaid"].includes(status);
}

function mapSubscriptionStatus(
  status: Stripe.Subscription.Status
): "active" | "inactive" | "past_due" | "canceled" {
  switch (status) {
    case "trialing":
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

function getPlanName(priceId?: string | null) {
  if (!priceId) return "Subscription";
  const planType = getPlanByPriceId(priceId);
  return planType ? PLANS[planType].name : "Subscription";
}

async function findAlternateActiveSubscription(
  email: string,
  excludeSubscriptionId?: string
): Promise<{ customerId: string; subscription: Stripe.Subscription } | null> {
  const customers = await stripe.customers.list({ email, limit: 10 });

  for (const customer of customers.data) {
    if ("deleted" in customer && customer.deleted) {
      continue;
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });

    const match = subscriptions.data.find((subscription) => {
      if (subscription.id === excludeSubscriptionId) {
        return false;
      }

      return isActiveLikeStatus(subscription.status);
    });

    if (match) {
      return {
        customerId: customer.id,
        subscription: match,
      };
    }
  }

  return null;
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
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                cancelAt: toDate(subscription.cancel_at),
              });

              // Also upsert subscription record so canCreateCard() works correctly
              try {
                const userRecord = await getUserByEmail(userId);
                if (userRecord?._id) {
                  const planKey = planType === "PREMIUM" ? "unlimited" : "free";
                  const existingSub = await getSubscriptionByUserId(userRecord._id.toString());
                  if (existingSub) {
                    await updateSubscription(userRecord._id.toString(), {
                      plan: planKey as any,
                      status: "active",
                      stripeCustomerId: session.customer as string,
                      stripeSubscriptionId: subscriptionId,
                      stripePriceId: priceId,
                      limits: PLAN_LIMITS[planKey],
                      currentPeriodStart: toDate(subscription.items.data[0]?.current_period_start) ?? undefined,
                      currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end) ?? undefined,
                      cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    });
                  } else {
                    await createSubscription({
                      userId: userRecord._id.toString(),
                      plan: planKey as any,
                      stripeCustomerId: session.customer as string,
                      stripeSubscriptionId: subscriptionId,
                      stripePriceId: priceId,
                    });
                  }
                  console.log(`Subscription record upserted for user ${userId}: ${planKey}`);
                }
              } catch (subErr) {
                console.error("Failed to upsert subscription record:", subErr);
                // Non-fatal — user still has planType set on users collection
              }

              await trackActivity({
                event: "subscription_activated",
                source: "webhook",
                userId: null,
                email: typeof userId === "string" ? userId : null,
                metadata: {
                  planType,
                  status: subscription.status,
                  stripeCustomerId: session.customer as string,
                  stripeSubscriptionId: subscriptionId,
                  currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end),
                },
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
                notifyCheckoutActivated(
                  recipient,
                  user?.name || recipient,
                  "subscription",
                  planName,
                  session.amount_total,
                  session.currency,
                  session.id
                ).catch(console.error);
              }
            }
          }
        } else if (
          session.mode === "payment" &&
          session.metadata?.purchaseType === "batch_pack"
        ) {
          const userId = session.metadata?.userId || session.client_reference_id;
          const userEmail =
            session.metadata?.userEmail ||
            session.customer_details?.email ||
            (typeof session.customer_email === "string" ? session.customer_email : null);
          const batchCount = Number(session.metadata?.batchCount);

          if (session.payment_status === "paid" && userId && userEmail && isBatchCount(batchCount)) {
            const batchPack = getBatchPack(batchCount);
            if (batchPack) {
              await upsertBatchPurchaseFromCheckout({
                userId,
                email: userEmail,
                batchCount,
                amount: session.amount_total || batchPack.amount,
                currency: session.currency || batchPack.currency,
                stripeSessionId: session.id,
                stripePaymentIntentId:
                  typeof session.payment_intent === "string" ? session.payment_intent : null,
              });

              await trackActivity({
                event: "batch_pack_purchased",
                source: "webhook",
                userId,
                email: userEmail,
                metadata: {
                  batchCount,
                  amount: session.amount_total || batchPack.amount,
                  currency: (session.currency || batchPack.currency).toUpperCase(),
                  stripeSessionId: session.id,
                },
              });

              console.log(`Batch pack activated for user ${userEmail}: ${batchCount} cards`);
              const user = await getUserByEmail(userEmail);
              notifyCheckoutActivated(
                userEmail,
                user?.name || userEmail,
                "one_time",
                `Batch Pack (${batchCount} cards)`,
                session.amount_total || batchPack.amount,
                session.currency || batchPack.currency,
                session.id
              ).catch(console.error);
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
          if (!isActiveLikeStatus(subscription.status)) {
            const replacement = await findAlternateActiveSubscription(userId, subscription.id);

            if (replacement) {
              const replacementPriceId = replacement.subscription.items.data[0]?.price.id;
              const replacementPlanType = replacementPriceId
                ? getPlanByPriceId(replacementPriceId)
                : null;

              if (replacementPlanType) {
                await updateUserSubscription(userId, {
                  planType: replacementPlanType,
                  stripeCustomerId: replacement.customerId,
                  stripeSubscriptionId: replacement.subscription.id,
                  stripePriceId: replacementPriceId,
                  status: mapSubscriptionStatus(replacement.subscription.status),
                  currentPeriodStart: toDate(replacement.subscription.items.data[0]?.current_period_start),
                  currentPeriodEnd: toDate(replacement.subscription.items.data[0]?.current_period_end),
                  cancelAtPeriodEnd: replacement.subscription.cancel_at_period_end,
                  cancelAt: toDate(replacement.subscription.cancel_at),
                });

                console.log(
                  `Ignored subscription update for ${userId}; active replacement subscription ${replacement.subscription.id} remains`
                );
                break;
              }
            }
          }

          await updateUserSubscription(userId, {
            planType,
            stripePriceId: priceId,
            status: mapSubscriptionStatus(subscription.status),
            currentPeriodStart: toDate(subscription.items.data[0]?.current_period_start),
            currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            cancelAt: toDate(subscription.cancel_at),
          });

          await trackActivity({
            event: "subscription_updated",
            source: "webhook",
            userId: null,
            email: typeof userId === "string" ? userId : null,
            metadata: {
              planType,
              status: subscription.status,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end),
            },
          });

          console.log(`Subscription updated for user ${userId}: ${subscription.status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const replacement = await findAlternateActiveSubscription(userId, subscription.id);

          if (replacement) {
            const replacementPriceId = replacement.subscription.items.data[0]?.price.id;
            const replacementPlanType = replacementPriceId
              ? getPlanByPriceId(replacementPriceId)
              : null;

            if (replacementPlanType) {
              await updateUserSubscription(userId, {
                planType: replacementPlanType,
                stripeCustomerId: replacement.customerId,
                stripeSubscriptionId: replacement.subscription.id,
                stripePriceId: replacementPriceId,
                status: mapSubscriptionStatus(replacement.subscription.status),
                currentPeriodStart: toDate(replacement.subscription.items.data[0]?.current_period_start),
                currentPeriodEnd: toDate(replacement.subscription.items.data[0]?.current_period_end),
                cancelAtPeriodEnd: replacement.subscription.cancel_at_period_end,
                cancelAt: toDate(replacement.subscription.cancel_at),
              });

              console.log(
                `Ignored subscription cancellation for ${userId}; active replacement subscription ${replacement.subscription.id} remains`
              );
              break;
            }
          }

          await updateUserSubscription(userId, {
            planType: "FREE",
            stripeSubscriptionId: null,
            stripePriceId: null,
            status: "canceled",
            currentPeriodStart: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            cancelAt: toDate(subscription.canceled_at),
          });

          await trackActivity({
            event: "subscription_canceled",
            source: "webhook",
            userId: null,
            email: typeof userId === "string" ? userId : null,
            metadata: {
              status: subscription.status,
              canceledAt: toDate(subscription.canceled_at),
            },
          });

          console.log(`Subscription canceled for user ${userId}`);

          const user = await getUserByEmail(userId);
          if (user) {
            fireAndForget(
              sendSubscriptionCanceledEmail(
                userId,
                user.name || userId,
                subscription.items.data[0]?.current_period_end
                  ? new Date(subscription.items.data[0].current_period_end * 1000)
                  : null
              ),
              `sendSubscriptionCanceledEmail(${userId})`
            );
            notifySubscription(user.name || userId, userId, "FREE", "canceled").catch(console.error);
          }
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
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              cancelAt: toDate(subscription.cancel_at),
            });

            await trackActivity({
              event: "billing_payment_succeeded",
              source: "webhook",
              userId: null,
              email: typeof userId === "string" ? userId : null,
              metadata: {
                amount: invoice.amount_paid || invoice.amount_due || 0,
                currency: (invoice.currency || "usd").toUpperCase(),
                currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end),
              },
            });

            console.log(`Payment succeeded for user ${userId}`);

            const user = await getUserByEmail(userId);
            const product = `${getPlanName(subscription.items.data[0]?.price.id)} Renewal`;
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

            // The initial subscription invoice is already covered by checkout completion.
            if (invoice.billing_reason !== "subscription_create") {
              notifyRenewalPaid(
                userId,
                user?.name || userId,
                product,
                invoice.amount_paid || invoice.amount_due || 0,
                invoice.currency || "usd",
                invoice.id
              ).catch(console.error);
            }
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
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              cancelAt: toDate(subscription.cancel_at),
            });

            await trackActivity({
              event: "billing_payment_failed",
              source: "webhook",
              userId: null,
              email: typeof userId === "string" ? userId : null,
              metadata: {
                amount: invoice.amount_due || invoice.amount_paid || 0,
                currency: (invoice.currency || "usd").toUpperCase(),
                status: subscription.status,
              },
            });

            console.log(`Payment failed for user ${userId}`);

            const user = await getUserByEmail(userId);
            const product = `${getPlanName(subscription.items.data[0]?.price.id)} Renewal`;
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
            notifyRenewalFailed(
              userId,
              user?.name || userId,
              product,
              invoice.amount_due || invoice.amount_paid || 0,
              invoice.currency || "usd",
              invoice.id
            ).catch(console.error);
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const expiredSession = event.data.object as Stripe.Checkout.Session;
        const email = expiredSession.customer_details?.email || expiredSession.customer_email;
        const purchaseType = expiredSession.metadata?.purchaseType as "subscription" | "batch_pack" | undefined;
        const batchCount = expiredSession.metadata?.batchCount ? parseInt(expiredSession.metadata.batchCount) : undefined;

        if (email && purchaseType) {
          // Look up user name if we can
          const abandonedUser = await getUserByEmail(email);
          const userName = abandonedUser?.name || email;

          // Only send if this is a real purchase type we track
          if (purchaseType === "subscription" || purchaseType === "batch_pack") {
            await sendAbandonedCheckoutEmail(email, userName, purchaseType, batchCount).catch(console.error);
            console.log(`Abandoned checkout email sent to ${email} (${purchaseType})`);
            notifyCheckoutExpired(
              email,
              userName,
              purchaseType === "subscription"
                ? "Premium"
                : `Batch Pack (${batchCount || "Unknown"} cards)`,
              expiredSession.id
            ).catch(console.error);

            if (abandonedUser) {
              await trackActivity({
                event: "abandoned_checkout_email_sent",
                source: "server",
                userId: abandonedUser._id.toString(),
                email,
                pathname: "/api/stripe/webhook",
                domain: "mybingocard.com",
                metadata: { purchaseType, batchCount: batchCount || null },
              });
            }
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const email = charge.billing_details?.email || charge.receipt_email || "Unknown";
        const name = charge.billing_details?.name || email;

        notifyRefundIssued(
          email,
          name,
          charge.description || "Stripe Charge",
          charge.amount_refunded || charge.amount,
          charge.currency || "usd",
          charge.id
        ).catch(console.error);
        break;
      }

      case "charge.dispute.created":
      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === "string" ? dispute.charge : null;
        let email = "Unknown";
        let name = "Unknown";

        if (chargeId) {
          try {
            const charge = await getStripe().charges.retrieve(chargeId);
            email = charge.billing_details?.email || charge.receipt_email || email;
            name = charge.billing_details?.name || email;
          } catch (error) {
            console.error(`Failed to load charge ${chargeId} for dispute ${dispute.id}:`, error);
          }
        }

        const disputeStatus =
          event.type === "charge.dispute.created"
            ? "opened"
            : dispute.status === "won"
              ? "won"
              : dispute.status === "lost"
                ? "lost"
                : dispute.status || "closed";

        notifyDisputeUpdate(
          email,
          name,
          dispute.amount,
          dispute.currency || "usd",
          dispute.id,
          disputeStatus,
          dispute.reason
        ).catch(console.error);
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
