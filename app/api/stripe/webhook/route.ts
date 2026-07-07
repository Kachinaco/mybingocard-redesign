import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, STRIPE_CONFIG, getPlanByPriceId, PLANS, getStripe } from "@/lib/stripe/config";
import {
  updateUserBillingRecoveryState,
  updateUserSubscription,
  getUserByEmail,
  createUser,
} from "@/lib/db/users";
import { getBatchPack, isBatchCount } from "@/lib/batchPacks";
import {
  getBatchPurchaseById,
  upsertBatchPurchaseFromCheckout,
} from "@/lib/db/batchPurchases";
import {
  sendAbandonedCheckoutEmail,
  sendBillingFailedEmail,
  sendBillingSuccessEmail,
  sendShareLinkInvitationEmail,
  sendShareLinkSummaryEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionCanceledEmail,
} from "@/lib/email";
import {
  createSubscription,
  updateSubscription,
  getSubscriptionByUserId,
  PLAN_LIMITS,
  type SubscriptionPlan,
} from "@/lib/db/subscriptions";
import {
  countSharedLinksByStripeSession,
  createSharedLink,
  deleteShareEmailCheckoutRefById,
  deleteShareLinkCheckoutRefsByIds,
  findExistingSharedLinkIds,
  generateLinkId,
  getShareEmailCheckoutRefForCheckout,
  getShareLinkCheckoutRefById,
  insertPreparedSharedLinks,
  revokeSharedLinksByStripeSession,
  type SharedLink,
} from "@/lib/db/sharedLinks";
import {
  getCardById,
  getCardsByBatchIdForUser,
  getCardTitlesByIds,
  getOwnedCardIds,
} from "@/lib/db/cards";
import {
  claimStripeWebhookEvent,
  insertWebhookPartialFailure,
} from "@/lib/db/stripe-webhooks";
import type Stripe from "stripe";
import { trackActivity } from "@/lib/activity";
import { isUserOnTrial } from "@/lib/subscription-status";
import {
  notifyCheckoutActivated,
  notifyCheckoutCompleted,
  notifyCheckoutExpired,
  notifyDisputeUpdate,
  notifyRefundIssued,
  notifyRenewalFailed,
  notifyRenewalPaid,
  notifySubscription,
  notifyTrialStarted,
  notifyTrialEndingSoon,
} from "@/lib/discord";
import { sendMetaConversionEvent } from "@/lib/meta-conversions";

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
): "active" | "trialing" | "inactive" | "past_due" | "canceled" {
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

function getPlanName(priceId?: string | null) {
  if (!priceId) return "Subscription";
  const planType = getPlanByPriceId(priceId);
  return planType ? PLANS[planType].name : "Subscription";
}

function getLocalSubscriptionPlan(planType: keyof typeof PLANS): SubscriptionPlan {
  return planType === "PREMIUM" ? "unlimited" : "free";
}

function mapLocalSubscriptionStatus(
  status: Stripe.Subscription.Status
): "active" | "trialing" | "past_due" | "canceled" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      return "canceled";
  }
}

async function upsertLocalSubscriptionFromStripe(
  email: string,
  subscription: Stripe.Subscription,
  customerId?: string
) {
  const priceId = subscription.items.data[0]?.price.id;
  const planType = priceId ? getPlanByPriceId(priceId) : null;
  if (!planType) return;

  const userRecord = await getUserByEmail(email);
  if (!userRecord?._id) return;

  const userId = userRecord._id.toString();
  const plan = getLocalSubscriptionPlan(planType);
  const stripeCustomerId =
    customerId ||
    (typeof subscription.customer === "string" ? subscription.customer : undefined);
  const updateData = {
    plan,
    status: mapLocalSubscriptionStatus(subscription.status),
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    limits: PLAN_LIMITS[plan],
    currentPeriodStart: toDate(subscription.items.data[0]?.current_period_start) ?? undefined,
    currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end) ?? undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  const existingSub = await getSubscriptionByUserId(userId);
  if (existingSub) {
    await updateSubscription(userId, updateData);
  } else {
    await createSubscription({
      userId,
      plan,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
    });
    await updateSubscription(userId, updateData);
  }
}

async function cancelLocalSubscription(email: string, subscription?: Stripe.Subscription) {
  const userRecord = await getUserByEmail(email);
  if (!userRecord?._id) return;

  const userId = userRecord._id.toString();
  const existingSub = await getSubscriptionByUserId(userId);
  if (!existingSub) return;

  await updateSubscription(userId, {
    plan: "free",
    status: "canceled",
    ...(subscription ? { stripeSubscriptionId: subscription.id } : {}),
    stripePriceId: undefined,
    limits: PLAN_LIMITS.free,
    currentPeriodStart: undefined,
    currentPeriodEnd: undefined,
    cancelAtPeriodEnd: false,
  });
}

async function updateBillingRecoveryState(
  email: string,
  data: {
    status: "failed" | "recovered" | "canceled";
    invoiceId?: string | null;
    attemptCount?: number | null;
    nextPaymentAttempt?: Date | null;
  }
) {
  await updateUserBillingRecoveryState(email, data);
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
  let body: string;
  try {
    body = await request.text();
  } catch (err) {
    console.error("Stripe webhook: failed to read request body:", err);
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

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
    // Global idempotency — ensures every Stripe event is processed at most once,
    // even across webhook retries. Relies on a unique index on `eventId`.
    try {
      const claimed = await claimStripeWebhookEvent({
        eventId: event.id,
        type: event.type,
      });

      if (!claimed) {
        console.log("Webhook event already processed:", event.id);
        return NextResponse.json({ received: true, duplicate: true });
      }
    } catch (idempotencyErr) {
      console.error("Webhook idempotency check failed:", idempotencyErr);
      throw idempotencyErr;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Track checkout completion for funnel analysis
        await trackActivity({
          event: "checkout_completed",
          source: "webhook",
          userId: null,
          email: session.customer_details?.email || session.customer_email || null,
          metadata: {
            mode: session.mode,
            purchaseType: session.metadata?.purchaseType || session.mode,
            amount: session.amount_total,
            currency: (session.currency || "usd").toUpperCase(),
            stripeSessionId: session.id,
          },
        });

        await sendMetaConversionEvent({
          eventName: "Purchase",
          eventId: session.id,
          eventSourceUrl: appUrl,
          email: session.customer_details?.email || session.customer_email || null,
          userId: session.metadata?.userId || session.client_reference_id || null,
          valueCents: session.amount_total,
          currency: session.currency || "usd",
          contentName: session.metadata?.purchaseType || session.mode || "checkout",
          contentType: "product",
          orderId: session.id,
        });

        notifyCheckoutCompleted(
          session.customer_details?.email || (typeof session.customer_email === "string" ? session.customer_email : null) || "Unknown",
          session.mode || "unknown",
          session.amount_total,
          session.currency
        ).catch(console.error);

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
                trialEndsAt: toDate(subscription.trial_end),
              });

              // Also upsert subscription record so canCreateCard() works correctly
              try {
                await upsertLocalSubscriptionFromStripe(userId, subscription, session.customer as string);
                console.log(`Subscription record upserted for user ${userId}: ${planType}`);
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

                if (subscription.trial_end) {
                  notifyTrialStarted(
                    user?.name || recipient,
                    recipient,
                    toDate(subscription.trial_end)
                  ).catch(console.error);
                }
              }
            }
          }
        } else if (
          session.mode === "payment" &&
          session.metadata?.purchaseType === "lifetime"
        ) {
          const userId = session.metadata?.userId || session.client_reference_id;
          const userEmail =
            session.metadata?.userEmail ||
            session.customer_details?.email ||
            (typeof session.customer_email === "string" ? session.customer_email : null);

          if (session.payment_status === "paid" && userEmail) {
            await updateUserSubscription(userEmail, {
              planType: "PREMIUM",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: null,
              stripePriceId: null,
              status: "lifetime",
              currentPeriodStart: new Date(),
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
              cancelAt: null,
            });

            // Also upsert subscription record
            try {
              const userRecord = await getUserByEmail(userEmail);
              if (userRecord?._id) {
                const existingSub = await getSubscriptionByUserId(userRecord._id.toString());
                if (existingSub) {
                  await updateSubscription(userRecord._id.toString(), {
                    plan: "unlimited" as any,
                    status: "active",
                    stripeCustomerId: session.customer as string,
                    stripeSubscriptionId: undefined,
                    stripePriceId: undefined,
                    limits: PLAN_LIMITS.unlimited,
                  });
                } else {
                  await createSubscription({
                    userId: userRecord._id.toString(),
                    plan: "unlimited" as any,
                    stripeCustomerId: session.customer as string,
                  });
                }
              }
            } catch (subErr) {
              console.error("Failed to upsert subscription record for lifetime:", subErr);
            }

            await trackActivity({
              event: "lifetime_purchase_activated",
              source: "webhook",
              userId: userId || null,
              email: userEmail,
              metadata: {
                purchaseType: "lifetime",
                amount: session.amount_total,
                currency: (session.currency || "usd").toUpperCase(),
                stripeSessionId: session.id,
              },
            });

            console.log(`Lifetime Premium activated for user ${userEmail}`);

            const user = await getUserByEmail(userEmail);
            if (user) {
              fireAndForget(
                sendSubscriptionActivatedEmail(userEmail, user.name || userEmail, "Premium Lifetime"),
                `sendSubscriptionActivatedEmail(${userEmail})`
              );
              notifyCheckoutActivated(
                userEmail,
                user.name || userEmail,
                "one_time",
                "Premium Lifetime",
                session.amount_total,
                session.currency,
                session.id
              ).catch(console.error);
            }
          }
        } else if (
          session.mode === "payment" &&
          session.metadata?.purchaseType === "batch_pack"
        ) {
          let userId = session.metadata?.userId || session.client_reference_id;
          const userEmail =
            session.metadata?.userEmail ||
            session.customer_details?.email ||
            (typeof session.customer_email === "string" ? session.customer_email : null);
          const batchCount = Number(session.metadata?.batchCount);
          const isGuestCheckout = session.metadata?.guestCheckout === "true";

          // Guest checkout: auto-create user if none exists
          if (isGuestCheckout && userEmail && !userId) {
            const existingUser = await getUserByEmail(userEmail);
            if (existingUser) {
              userId = existingUser._id?.toString() || null;
            } else {
              const newUser = await createUser({
                email: userEmail,
                name: session.customer_details?.name || undefined,
                signupMethod: "magic_link",
              });
              userId = newUser._id?.toString() || null;
              console.log(`Auto-created user for guest batch purchase: ${userEmail}`);
            }
          }

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
        } else if (
          session.mode === "payment" &&
          session.metadata?.purchaseType === "email_share_batch"
        ) {
          const ownerUserId = session.metadata?.userId || session.client_reference_id || null;
          const ownerEmail =
            session.metadata?.userEmail ||
            session.customer_details?.email ||
            (typeof session.customer_email === "string" ? session.customer_email : null);
          const cardId = session.metadata?.cardId || null;
          const refId = session.metadata?.refId || null;
          const recipientCount = Number(session.metadata?.recipientCount);

          if (
            session.payment_status === "paid" &&
            ownerUserId &&
            ownerEmail &&
            cardId &&
            refId &&
            Number.isFinite(recipientCount) &&
            recipientCount > 0
          ) {
            try {
              const existingLinksForSession = await countSharedLinksByStripeSession(session.id);
              if (existingLinksForSession > 0) {
                console.log(
                  `email_share_batch webhook: session ${session.id} already processed (${existingLinksForSession} links exist); skipping`
                );
                break;
              }

              const refDoc = await getShareEmailCheckoutRefForCheckout({
                id: refId,
                userId: ownerUserId,
                cardId,
              });

              const recipientEmails = Array.isArray((refDoc as any)?.emails)
                ? ((refDoc as any).emails as unknown[]).filter(
                    (value): value is string => typeof value === "string"
                  )
                : [];

              if (!refDoc || recipientEmails.length === 0) {
                console.error(`email_share_batch webhook: missing checkout ref ${refId}`);
                break;
              }

              const card = await getCardById(cardId);
              const cardOwnerId = (card as any)?.userId?.toString?.() || "";

              if (!card || cardOwnerId !== ownerUserId) {
                console.error(`email_share_batch webhook: card ${cardId} owner mismatch`);
                break;
              }

              const owner = await getUserByEmail(ownerEmail);
              const ownerName = owner?.name || ownerEmail;
              const perRecipientAmount = Math.max(
                0,
                Math.round((session.amount_total || 0) / recipientEmails.length)
              );
              const sent: string[] = [];
              const failed: string[] = [];

              for (const recipientEmail of recipientEmails) {
                try {
                  const sharedLink = await createSharedLink({
                    batchId: `email-share:${cardId}`,
                    cardId,
                    ownerUserId,
                    ownerEmail,
                    recipientEmail,
                    stripeSessionId: session.id,
                    amountCents: perRecipientAmount,
                  });
                  const linkUrl = `${appUrl}/play/${sharedLink.linkId}`;
                  const didSend = await sendShareLinkInvitationEmail(
                    recipientEmail,
                    null,
                    ownerName,
                    linkUrl,
                    (card as any).title || "Bingo Card"
                  );

                  if (didSend) {
                    sent.push(recipientEmail);
                  } else {
                    failed.push(recipientEmail);
                  }
                } catch (emailErr) {
                  console.error(`email_share_batch webhook: failed for ${recipientEmail}:`, emailErr);
                  failed.push(recipientEmail);
                }
              }

              await deleteShareEmailCheckoutRefById(refId);

              await trackActivity({
                event: "email_share_batch_sent",
                source: "webhook",
                userId: ownerUserId,
                email: ownerEmail,
                metadata: {
                  cardId,
                  requestedCount: recipientEmails.length,
                  sentCount: sent.length,
                  failedCount: failed.length,
                  amountCents: session.amount_total,
                  currency: (session.currency || "usd").toUpperCase(),
                  stripeSessionId: session.id,
                },
              });

              notifyCheckoutActivated(
                ownerEmail,
                ownerName,
                "one_time",
                `Email Share Pack (${sent.length}/${recipientEmails.length} sent)`,
                session.amount_total,
                session.currency || "usd",
                session.id
              ).catch(console.error);

              console.log(
                `Email share batch sent for user ${ownerEmail}: ${sent.length}/${recipientEmails.length} emails`
              );
            } catch (shareEmailErr) {
              console.error("Failed to send email share batch after checkout:", shareEmailErr);
            }
          }
        } else if (
          session.mode === "payment" &&
          session.metadata?.purchaseType === "share_links"
        ) {
          const ownerUserId = session.metadata?.userId || session.client_reference_id || null;
          const ownerEmail =
            session.metadata?.userEmail ||
            session.customer_details?.email ||
            (typeof session.customer_email === "string" ? session.customer_email : null);
          const batchId = session.metadata?.batchId || null;
          const count = Number(session.metadata?.count);
          const pricePerLinkCents = Number(session.metadata?.pricePerLinkCents) || 10;
          const expiresInDays = session.metadata?.expiresInDays
            ? Number(session.metadata.expiresInDays)
            : null;

          let recipientEmails: string[] = [];
          if (session.metadata?.recipientEmails) {
            try {
              const parsed = JSON.parse(session.metadata.recipientEmails);
              if (Array.isArray(parsed)) {
                recipientEmails = parsed.filter((value) => typeof value === "string");
              }
            } catch (err) {
              console.error("Failed to parse recipientEmails metadata:", err);
            }
          }

          let recipientPhones: string[] = [];
          if (session.metadata?.recipientPhones) {
            try {
              const parsed = JSON.parse(session.metadata.recipientPhones);
              if (Array.isArray(parsed)) {
                recipientPhones = parsed.filter((value) => typeof value === "string");
              }
            } catch (err) {
              console.error("Failed to parse recipientPhones metadata:", err);
            }
          }

          if (
            session.payment_status === "paid" &&
            ownerUserId &&
            ownerEmail &&
            batchId &&
            Number.isFinite(count) &&
            count > 0
          ) {
            try {
              // BUG #1 — Per-session idempotency. If another webhook retry already
              // created links for this checkout session, skip so we don't double-
              // create links or re-send emails.
              const existingLinksForSession = await countSharedLinksByStripeSession(session.id);
              if (existingLinksForSession > 0) {
                console.log(
                  `share_links webhook: session ${session.id} already processed (${existingLinksForSession} links exist); skipping`
                );
                break;
              }

              // Prefer cardIds passed directly through metadata. Fall back to
              // a stashed reference, then finally to the legacy batch lookup.
              let generatedCardIds: string[] = [];
              let cardIdsRefId: string | null = null;

              if (session.metadata?.cardIds) {
                try {
                  const parsed = JSON.parse(session.metadata.cardIds);
                  if (Array.isArray(parsed)) {
                    generatedCardIds = parsed.filter(
                      (value): value is string => typeof value === "string"
                    );
                  }
                } catch (err) {
                  console.error("Failed to parse cardIds metadata:", err);
                }
              } else if (session.metadata?.cardIdsRef) {
                try {
                  cardIdsRefId = session.metadata.cardIdsRef;
                  const refDoc = await getShareLinkCheckoutRefById(cardIdsRefId);
                  if (refDoc && Array.isArray((refDoc as any).cardIds)) {
                    generatedCardIds = ((refDoc as any).cardIds as unknown[]).filter(
                      (value): value is string => typeof value === "string"
                    );
                  }
                } catch (err) {
                  console.error("Failed to load cardIdsRef:", err);
                }
              }

              if (recipientEmails.length === 0 && session.metadata?.recipientEmailsRef) {
                try {
                  const refDoc = await getShareLinkCheckoutRefById(
                    session.metadata.recipientEmailsRef
                  );
                  if (refDoc && Array.isArray((refDoc as any).recipientEmails)) {
                    recipientEmails = ((refDoc as any).recipientEmails as unknown[]).filter(
                      (value): value is string => typeof value === "string"
                    );
                  }
                } catch (err) {
                  console.error("Failed to load recipientEmailsRef:", err);
                }
              }

              if (recipientPhones.length === 0 && session.metadata?.recipientPhonesRef) {
                try {
                  const refDoc = await getShareLinkCheckoutRefById(
                    session.metadata.recipientPhonesRef
                  );
                  if (refDoc && Array.isArray((refDoc as any).recipientPhones)) {
                    recipientPhones = ((refDoc as any).recipientPhones as unknown[]).filter(
                      (value): value is string => typeof value === "string"
                    );
                  }
                } catch (err) {
                  console.error("Failed to load recipientPhonesRef:", err);
                }
              }

              // Legacy fallback: resolve via batch_purchases if metadata was missing.
              if (generatedCardIds.length === 0) {
                const batchPurchase = await getBatchPurchaseById(batchId);

                if (batchPurchase && batchPurchase.userId !== ownerUserId) {
                  console.error(
                    `share_links webhook: batch ${batchId} owner mismatch (${batchPurchase.userId} vs ${ownerUserId})`
                  );
                } else if (batchPurchase) {
                  generatedCardIds = Array.isArray(batchPurchase.generatedCardIds)
                    ? batchPurchase.generatedCardIds
                    : [];
                } else {
                  generatedCardIds = (
                    await getCardsByBatchIdForUser(ownerUserId, batchId)
                  ).map((card) => card._id.toString());
                }
              }

              // BUG #6 — Defense in depth: verify every cardId in the list
              // actually belongs to the buyer. Never trust metadata alone.
              if (generatedCardIds.length > 0) {
                const ownedIds = new Set(
                  await getOwnedCardIds(ownerUserId, generatedCardIds)
                );

                if (ownedIds.size > 0) {
                  const verifiedIds: string[] = [];
                  for (const id of generatedCardIds) {
                    if (ownedIds.has(id)) verifiedIds.push(id);
                  }
                  if (verifiedIds.length !== generatedCardIds.length) {
                    console.error(
                      `share_links webhook: filtered ${
                        generatedCardIds.length - verifiedIds.length
                      } card(s) not owned by ${ownerUserId}`
                    );
                  }
                  generatedCardIds = verifiedIds;
                } else {
                  generatedCardIds = [];
                }
              }

              if (generatedCardIds.length === 0) {
                console.error(
                  `share_links webhook: batch ${batchId} has no cards to attach; skipping link creation`
                );
              } else {
                const linksToCreate = Math.min(count, generatedCardIds.length);
                const expiresAt =
                  expiresInDays && expiresInDays > 0
                    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
                    : undefined;

                // BUG #5 — Bulk pre-generate unique linkIds and use insertMany.
                // Pre-check to guarantee uniqueness, then retry any collisions.
                const generateBatchOfLinkIds = (n: number): string[] => {
                  const ids = new Set<string>();
                  while (ids.size < n) ids.add(generateLinkId());
                  return Array.from(ids);
                };

                let candidateLinkIds = generateBatchOfLinkIds(linksToCreate);
                for (let attempt = 0; attempt < 3; attempt++) {
                  const conflicts = await findExistingSharedLinkIds(candidateLinkIds);
                  if (conflicts.length === 0) break;
                  const conflictSet = new Set(conflicts);
                  candidateLinkIds = candidateLinkIds.map((id) =>
                    conflictSet.has(id) ? generateLinkId() : id
                  );
                }

                const now = new Date();
                const docsToInsert: Array<Omit<SharedLink, "_id">> = [];
                const plannedLinks: Array<{
                  linkId: string;
                  cardId: string;
                  recipientEmail?: string;
                }> = [];

                const failedLinks: Array<{
                  cardId: string;
                  recipientEmail?: string;
                  error: string;
                }> = [];

                for (let i = 0; i < linksToCreate; i++) {
                  try {
                    const cardId = generatedCardIds[i]!;
                    const linkId = candidateLinkIds[i]!;
                    const recipientEmail = recipientEmails[i];
                    const recipientPhone = recipientPhones[i];

                    const doc: Omit<SharedLink, "_id"> = {
                      linkId,
                      batchId,
                      cardId,
                      ownerUserId,
                      ownerEmail,
                      ...(recipientEmail ? { recipientEmail } : {}),
                      ...(recipientPhone ? { recipientPhone } : {}),
                      status: "pending",
                      stripeSessionId: session.id,
                      amountCents: pricePerLinkCents,
                      createdAt: now,
                      updatedAt: now,
                      ...(expiresAt ? { expiresAt } : {}),
                    };

                    docsToInsert.push(doc);
                    plannedLinks.push({
                      linkId,
                      cardId,
                      ...(recipientEmail ? { recipientEmail } : {}),
                    });
                  } catch (prepErr) {
                    console.error(
                      `share_links webhook: failed to prepare link ${i}:`,
                      prepErr
                    );
                    failedLinks.push({
                      cardId: generatedCardIds[i] || "unknown",
                      ...(recipientEmails[i] ? { recipientEmail: recipientEmails[i]! } : {}),
                      error:
                        prepErr instanceof Error ? prepErr.message : String(prepErr),
                    });
                  }
                }

                const successfulLinks: Array<{
                  linkId: string;
                  cardId: string;
                  recipientEmail?: string;
                }> = [];

                if (docsToInsert.length > 0) {
                  try {
                    const insertRes = await insertPreparedSharedLinks(docsToInsert);
                    const successfulIndexes = new Set(insertRes.insertedIndexes);
                    const failedByIndex = new Map(
                      insertRes.failed.map((failure) => [failure.index, failure.error])
                    );
                    // insertMany with ordered:false commits each doc atomically;
                    // inserted indexes map to the originally submitted array.
                    // Anything missing = failed.
                    for (let i = 0; i < plannedLinks.length; i++) {
                      if (successfulIndexes.has(i)) {
                        successfulLinks.push(plannedLinks[i]!);
                      } else {
                        failedLinks.push({
                          cardId: plannedLinks[i]!.cardId,
                          ...(plannedLinks[i]!.recipientEmail
                            ? { recipientEmail: plannedLinks[i]!.recipientEmail! }
                            : {}),
                          error:
                            failedByIndex.get(i) ||
                            "insertMany did not ack this document",
                        });
                      }
                    }
                    console.log(
                      `share_links webhook: bulk inserted ${successfulLinks.length}/${docsToInsert.length} links`
                    );
                  } catch (bulkErr: any) {
                    for (let i = 0; i < plannedLinks.length; i++) {
                      failedLinks.push({
                        cardId: plannedLinks[i]!.cardId,
                        ...(plannedLinks[i]!.recipientEmail
                          ? { recipientEmail: plannedLinks[i]!.recipientEmail! }
                          : {}),
                        error:
                          bulkErr instanceof Error
                            ? bulkErr.message
                            : String(bulkErr),
                      });
                    }
                    console.error(
                      "share_links webhook: bulk insert failed completely:",
                      bulkErr
                    );
                  }
                }

                const createdLinks = successfulLinks;

                // Fetch card titles in one query for the email body.
                const cardsById = await getCardTitlesByIds(
                  createdLinks.map((link) => link.cardId)
                );

                const owner = await getUserByEmail(ownerEmail);
                const ownerName = owner?.name || ownerEmail;

                // BUG #3 — Self-delivery. When the buyer didn't specify any
                // recipient emails, they expect to receive all the links
                // themselves. Send one summary email to the owner.
                const hasRecipientEmails = recipientEmails.length > 0;

                if (!hasRecipientEmails && createdLinks.length > 0) {
                  const summaryLinks = createdLinks.map((link) => ({
                    linkId: link.linkId,
                    linkUrl: `${appUrl}/play/${link.linkId}`,
                    cardTitle: cardsById[link.cardId]?.title || "Bingo Card",
                  }));

                  fireAndForget(
                    sendShareLinkSummaryEmail(ownerEmail, ownerName, summaryLinks),
                    `sendShareLinkSummaryEmail(${ownerEmail})`
                  );
                }

                // Send invitation emails to any recipients we have emails for.
                for (const link of createdLinks) {
                  if (!link.recipientEmail) continue;
                  const linkUrl = `${appUrl}/play/${link.linkId}`;
                  const cardTitle = cardsById[link.cardId]?.title || null;
                  fireAndForget(
                    sendShareLinkInvitationEmail(
                      link.recipientEmail,
                      null,
                      ownerName,
                      linkUrl,
                      cardTitle
                    ),
                    `sendShareLinkInvitationEmail(${link.recipientEmail})`
                  );
                }

                // BUG #4 — Partial failure handling. If anything failed, log it
                // so we can retry later and alert Discord.
                if (failedLinks.length > 0) {
                  try {
                    await insertWebhookPartialFailure({
                      type: "share_links",
                      stripeSessionId: session.id,
                      ownerUserId,
                      ownerEmail,
                      batchId,
                      requestedCount: count,
                      successfulCount: createdLinks.length,
                      failedCount: failedLinks.length,
                      failedLinks,
                      createdAt: new Date(),
                    });
                  } catch (persistErr) {
                    console.error(
                      "Failed to persist webhook_partial_failures record:",
                      persistErr
                    );
                  }

                  notifyCheckoutActivated(
                    ownerEmail,
                    ownerName,
                    "one_time",
                    `PARTIAL FAILURE: Share Links (${createdLinks.length}/${count})`,
                    session.amount_total || pricePerLinkCents * createdLinks.length,
                    session.currency || "usd",
                    session.id
                  ).catch(console.error);
                }

                await trackActivity({
                  event: "share_links_generated",
                  source: "webhook",
                  userId: ownerUserId,
                  email: ownerEmail,
                  metadata: {
                    batchId,
                    count: createdLinks.length,
                    requestedCount: count,
                    failedCount: failedLinks.length,
                    amountCents: session.amount_total || pricePerLinkCents * createdLinks.length,
                    currency: (session.currency || "usd").toUpperCase(),
                    stripeSessionId: session.id,
                    recipientEmailCount: recipientEmails.length,
                    recipientPhoneCount: recipientPhones.length,
                  },
                });

                console.log(
                  `Share links created for user ${ownerEmail}: ${createdLinks.length} links from batch ${batchId}`
                );

                if (failedLinks.length === 0) {
                  notifyCheckoutActivated(
                    ownerEmail,
                    ownerName,
                    "one_time",
                    `Share Links (${createdLinks.length})`,
                    session.amount_total || pricePerLinkCents * createdLinks.length,
                    session.currency || "usd",
                    session.id
                  ).catch(console.error);
                }
              }

              // BUG #8 — Clean up the checkout ref doc after successful use.
              const refIdsToDelete = new Set<string>();
              if (cardIdsRefId) {
                refIdsToDelete.add(cardIdsRefId);
              }
              if (session.metadata?.recipientEmailsRef) {
                refIdsToDelete.add(session.metadata.recipientEmailsRef);
              }
              if (session.metadata?.recipientPhonesRef) {
                refIdsToDelete.add(session.metadata.recipientPhonesRef);
              }

              if (refIdsToDelete.size > 0) {
                try {
                  await deleteShareLinkCheckoutRefsByIds(Array.from(refIdsToDelete));
                } catch (cleanupErr) {
                  console.error(
                    "Failed to delete share_link_checkout_refs doc:",
                    cleanupErr
                  );
                }
              }
            } catch (shareErr) {
              console.error("Failed to create share links after checkout:", shareErr);
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
                await upsertLocalSubscriptionFromStripe(
                  userId,
                  replacement.subscription,
                  replacement.customerId
                );

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
            cancellationReason: subscription.cancellation_details?.reason ?? null,
            cancellationFeedback: subscription.cancellation_details?.feedback ?? null,
          });
          await upsertLocalSubscriptionFromStripe(userId, subscription);

          await trackActivity({
            event: "subscription_updated",
            source: "webhook",
            userId: null,
            email: typeof userId === "string" ? userId : null,
            metadata: {
              planType,
              status: subscription.status,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              cancelAt: toDate(subscription.cancel_at),
              cancellationReason: subscription.cancellation_details?.reason ?? null,
              cancellationFeedback: subscription.cancellation_details?.feedback ?? null,
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
          // Never downgrade lifetime users
          const existingUser = await getUserByEmail(userId);
          if (existingUser?.subscriptionStatus === "lifetime") {
            console.log(`Ignored subscription deletion for lifetime user ${userId}`);
            break;
          }

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
              await upsertLocalSubscriptionFromStripe(
                userId,
                replacement.subscription,
                replacement.customerId
              );

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
            cancellationReason: subscription.cancellation_details?.reason ?? null,
            cancellationFeedback: subscription.cancellation_details?.feedback ?? null,
          });
          await cancelLocalSubscription(userId, subscription);
          await updateBillingRecoveryState(userId, {
            status: "canceled",
          });

          await trackActivity({
            event: "subscription_canceled",
            source: "webhook",
            userId: null,
            email: typeof userId === "string" ? userId : null,
            metadata: {
              status: subscription.status,
              canceledAt: toDate(subscription.canceled_at),
              cancellationReason: subscription.cancellation_details?.reason ?? null,
              cancellationFeedback: subscription.cancellation_details?.feedback ?? null,
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
            const priceId = subscription.items.data[0]?.price.id;
            const planType = priceId ? getPlanByPriceId(priceId) : null;
            await updateUserSubscription(userId, {
              ...(planType ? { planType } : {}),
              stripeSubscriptionId: subscription.id,
              stripePriceId: priceId || null,
              status: mapSubscriptionStatus(subscription.status),
              currentPeriodStart: toDate(subscription.items.data[0]?.current_period_start),
              currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              cancelAt: toDate(subscription.cancel_at),
            });
            await upsertLocalSubscriptionFromStripe(userId, subscription);
            await updateBillingRecoveryState(userId, {
              status: "recovered",
              invoiceId: invoice.id,
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
            const isTrialInvoice = invoice.billing_reason === "subscription_create" && isUserOnTrial({
              planType: "PREMIUM",
              subscriptionStatus: mapSubscriptionStatus(subscription.status),
              trialEndsAt: toDate(subscription.trial_end),
            });

            if (!isTrialInvoice) {
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
            const priceId = subscription.items.data[0]?.price.id;
            const planType = priceId ? getPlanByPriceId(priceId) : null;
            const nextPaymentAttempt = toDate(invoice.next_payment_attempt);
            await updateUserSubscription(userId, {
              ...(planType ? { planType } : {}),
              stripeSubscriptionId: subscription.id,
              stripePriceId: priceId || null,
              status: mapSubscriptionStatus(subscription.status),
              currentPeriodStart: toDate(subscription.items.data[0]?.current_period_start),
              currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              cancelAt: toDate(subscription.cancel_at),
            });
            await upsertLocalSubscriptionFromStripe(userId, subscription);
            await updateBillingRecoveryState(userId, {
              status: "failed",
              invoiceId: invoice.id,
              attemptCount: invoice.attempt_count ?? null,
              nextPaymentAttempt,
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
                attemptCount: invoice.attempt_count ?? null,
                nextPaymentAttempt,
                billingReason: invoice.billing_reason,
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
                `${appUrl}/settings`,
                invoice.attempt_count ?? null,
                nextPaymentAttempt
              ),
              `sendBillingFailedEmail(${userId})`
            );
            notifyRenewalFailed(
              userId,
              user?.name || userId,
              product,
              invoice.amount_due || invoice.amount_paid || 0,
              invoice.currency || "usd",
              invoice.id,
              invoice.attempt_count ?? null,
              nextPaymentAttempt
            ).catch(console.error);
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const expiredSession = event.data.object as Stripe.Checkout.Session;
        const email = expiredSession.customer_details?.email || expiredSession.customer_email;
        const purchaseType = expiredSession.metadata?.purchaseType as "subscription" | "batch_pack" | "trial" | undefined;
        const batchCount = expiredSession.metadata?.batchCount ? parseInt(expiredSession.metadata.batchCount) : undefined;

        if (email && purchaseType) {
          // Look up user name if we can
          const abandonedUser = await getUserByEmail(email);
          const userName = abandonedUser?.name || email;

          // Track checkout_abandoned as a distinct analytics event
          await trackActivity({
            event: "checkout_abandoned",
            source: "webhook",
            userId: abandonedUser?._id?.toString() || null,
            email,
            pathname: "/api/stripe/webhook",
            domain: "mybingocard.com",
            metadata: {
              purchaseType,
              batchCount: batchCount || null,
              checkoutSessionId: expiredSession.id,
              amountTotal: expiredSession.amount_total || null,
              currency: expiredSession.currency || null,
            },
          }).catch(console.error);

          // Only send if this is a real purchase type we track
          if (purchaseType === "subscription" || purchaseType === "batch_pack" || purchaseType === "trial") {
            await sendAbandonedCheckoutEmail(email, userName, purchaseType, batchCount).catch(console.error);
            console.log(`Abandoned checkout email sent to ${email} (${purchaseType})`);
            notifyCheckoutExpired(
              email,
              userName,
              purchaseType === "subscription" || purchaseType === "trial"
                ? "Premium Trial"
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

        // BUG #6 — Refund revocation. A refunded share_links purchase is a
        // fraud vector: the buyer keeps all the working links after getting
        // their money back. When we see a refund, look up the original
        // checkout session via payment_intent and mark every share link we
        // created from it as "refunded" so /play/[linkId] can reject it.
        const paymentIntentId =
          typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (paymentIntentId) {
          try {
            const sessionList = await stripe.checkout.sessions.list({
              payment_intent: paymentIntentId,
              limit: 1,
            });
            const refundedSession = sessionList.data[0];
            if (
              refundedSession &&
              refundedSession.metadata?.purchaseType === "share_links"
            ) {
              const revokedCount = await revokeSharedLinksByStripeSession(refundedSession.id);
              console.log(
                `share_links refund: revoked ${revokedCount} link(s) for session ${refundedSession.id}`
              );
              notifyRefundIssued(
                email,
                name,
                `Share Links REVOKED (${revokedCount} link${revokedCount === 1 ? "" : "s"})`,
                charge.amount_refunded || charge.amount,
                charge.currency || "usd",
                `${charge.id} | session=${refundedSession.id}`
              ).catch(console.error);
            }
          } catch (revokeErr) {
            console.error(
              `Failed to revoke share links for refunded payment_intent ${paymentIntentId}:`,
              revokeErr
            );
          }
        }
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

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.toString();
        let email: string | null = null;
        let name: string | null = null;

        // Try metadata first, then look up the Stripe customer
        email = subscription.metadata?.userId || null;
        if (!email && customerId) {
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (!("deleted" in customer && customer.deleted)) {
              email = customer.email || null;
              name = customer.name || null;
            }
          } catch (err) {
            console.error("Failed to retrieve customer for trial_will_end:", err);
          }
        }

        if (email) {
          const user = await getUserByEmail(email);
          name = name || user?.name || null;
        }

        const trialEndsAt = toDate(subscription.trial_end);
        const daysRemaining = trialEndsAt
          ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 3;

        await trackActivity({
          event: "trial_ending_soon",
          source: "webhook",
          userId: null,
          email,
          metadata: {
            email,
            trialEndsAt,
            daysRemaining,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: customerId || null,
          },
        });

        if (email) {
          notifyTrialEndingSoon(
            email,
            name || email,
            trialEndsAt || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          ).catch(console.error);
        }

        console.log(`Trial ending soon for ${email || customerId || "unknown"} — ${daysRemaining} days remaining`);
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
