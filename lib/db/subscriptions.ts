import { ObjectId } from "bson";
import { getEffectiveCardLimit, hasPremiumAccess, NEW_FREE_CARD_LIMIT } from "@/lib/subscription-status";
import { getSqliteStore } from "@/lib/db/sqlite";

export type SubscriptionPlan = "free" | "starter" | "pro" | "unlimited";

export interface Subscription {
  _id: ObjectId;
  userId: ObjectId;
  plan: SubscriptionPlan;
  status: "active" | "trialing" | "canceled" | "past_due";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  limits: {
    maxCards: number; // Max cards user can create
    maxExports: number; // Max exports per month
    canAccessPremiumTemplates: boolean;
    canRemoveWatermark: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Plan limits configuration
export const PLAN_LIMITS = {
  free: {
    maxCards: NEW_FREE_CARD_LIMIT,
    maxExports: -1,
    canAccessPremiumTemplates: true,
    canRemoveWatermark: true,
  },
  starter: {
    maxCards: 25,
    maxExports: 100,
    canAccessPremiumTemplates: false,
    canRemoveWatermark: true,
  },
  pro: {
    maxCards: 100,
    maxExports: 500,
    canAccessPremiumTemplates: true,
    canRemoveWatermark: true,
  },
  unlimited: {
    maxCards: -1, // Unlimited
    maxExports: -1, // Unlimited
    canAccessPremiumTemplates: true,
    canRemoveWatermark: true,
  },
};

export function isSubscriptionEntitled(subscription: Pick<Subscription, "status">): boolean {
  return ["active", "trialing", "past_due"].includes(subscription.status);
}

export async function createSubscription(data: {
  userId: string;
  plan: SubscriptionPlan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
}): Promise<Subscription> {
  const subscription: Partial<Subscription> = {
    userId: new ObjectId(data.userId),
    plan: data.plan,
    status: "active",
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    stripePriceId: data.stripePriceId,
    cancelAtPeriodEnd: false,
    limits: PLAN_LIMITS[data.plan],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
    const result = getSqliteStore().insertOne("subscriptions", subscription as Subscription);
    return {
      ...subscription,
      _id: result.insertedId as ObjectId,
    } as Subscription;
  }

export async function getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    return getSqliteStore().findOne<Subscription>("subscriptions", {
      userId: new ObjectId(userId),
    });
  }

export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
    return getSqliteStore().findOne<Subscription>("subscriptions", { stripeSubscriptionId });
  }

export async function updateSubscription(
  userId: string,
  data: Partial<Subscription>
): Promise<Subscription | null> {
    return getSqliteStore().findOneAndUpdate<Subscription>(
      "subscriptions",
      { userId: new ObjectId(userId) },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
  }

export async function upgradePlan(userId: string, newPlan: SubscriptionPlan): Promise<Subscription | null> {
    return getSqliteStore().findOneAndUpdate<Subscription>(
      "subscriptions",
      { userId: new ObjectId(userId) },
      {
        $set: {
          plan: newPlan,
          limits: PLAN_LIMITS[newPlan],
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
  }

export async function cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true): Promise<Subscription | null> {
  const updateData: any = {
    cancelAtPeriodEnd,
    updatedAt: new Date(),
  };

  // If immediate cancellation, downgrade to free plan
  if (!cancelAtPeriodEnd) {
    updateData.plan = "free";
    updateData.status = "canceled";
    updateData.limits = PLAN_LIMITS.free;
  }
    return getSqliteStore().findOneAndUpdate<Subscription>(
      "subscriptions",
      { userId: new ObjectId(userId) },
      { $set: updateData },
      { returnDocument: "after" }
    );
  }

export async function checkUserLimit(userId: string, limitType: keyof Subscription["limits"]): Promise<boolean> {
  const subscription = await getSubscriptionByUserId(userId);

  if (!subscription || !isSubscriptionEntitled(subscription)) {
    return false;
  }

  const limit = subscription.limits[limitType];

  // -1 means unlimited
  if (limit === -1) {
    return true;
  }

  // For boolean limits, return the value directly
  if (typeof limit === "boolean") {
    return limit;
  }

  // For numeric limits, we need to check current usage
  // This would require additional logic to count current cards/exports
  return true; // Simplified for now
}

export async function getUserCardCount(userId: string): Promise<number> {
    return getSqliteStore().count("cards", { userId });
  }

export async function canCreateCard(userId: string): Promise<boolean> {
  const subscription = await getSubscriptionByUserId(userId);

  let user: any = null;
  try {
    user = getSqliteStore().findOne("users", { _id: new ObjectId(userId) });
  } catch {
    // userId not a valid ObjectId — fall through to legacy subscription/free checks
  }

  if (hasPremiumAccess(user)) {
    return true;
  }

  if (subscription && subscription.plan !== "free" && isSubscriptionEntitled(subscription)) {
    const maxCards = subscription.limits.maxCards;
    if (maxCards === -1) return true;
    const currentCount = await getUserCardCount(userId);
    return currentCount < maxCards;
  }

  if (user) {
    const effectiveCardLimit = getEffectiveCardLimit(user);
    if (effectiveCardLimit === -1) return true;
    const currentCount = await getUserCardCount(userId);
    return currentCount < effectiveCardLimit;
  }

  // Free plan: check card count against free limit
  if (PLAN_LIMITS.free.maxCards === -1) {
    return true;
  }

  const currentCount = await getUserCardCount(userId);
  return currentCount < PLAN_LIMITS.free.maxCards;
}

export async function getAllActiveSubscriptions(): Promise<Subscription[]> {
    return getSqliteStore().findMany<Subscription>("subscriptions", {
      status: { $in: ["active", "trialing", "past_due"] },
    });
  }
