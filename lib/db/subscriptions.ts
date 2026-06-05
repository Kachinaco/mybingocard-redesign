import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import { getEffectiveCardLimit, hasPremiumAccess } from "@/lib/subscription-status";

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
    maxCards: 0,
    maxExports: 0,
    canAccessPremiumTemplates: false,
    canRemoveWatermark: false,
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
  const client = await clientPromise;
  const db = client.db("mybingocard");

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

  const result = await db.collection<Subscription>("subscriptions").insertOne(subscription as Subscription);

  return {
    ...subscription,
    _id: result.insertedId,
  } as Subscription;
}

export async function getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const subscription = await db.collection<Subscription>("subscriptions").findOne({
    userId: new ObjectId(userId),
  });

  return subscription;
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const subscription = await db.collection<Subscription>("subscriptions").findOne({
    stripeSubscriptionId,
  });

  return subscription;
}

export async function updateSubscription(
  userId: string,
  data: Partial<Subscription>
): Promise<Subscription | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<Subscription>("subscriptions").findOneAndUpdate(
    { userId: new ObjectId(userId) },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function upgradePlan(userId: string, newPlan: SubscriptionPlan): Promise<Subscription | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<Subscription>("subscriptions").findOneAndUpdate(
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

  return result;
}

export async function cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true): Promise<Subscription | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

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

  const result = await db.collection<Subscription>("subscriptions").findOneAndUpdate(
    { userId: new ObjectId(userId) },
    { $set: updateData },
    { returnDocument: "after" }
  );

  return result;
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
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const count = await db.collection("cards").countDocuments({
    userId: userId,
  });

  return count;
}

export async function canCreateCard(userId: string): Promise<boolean> {
  const subscription = await getSubscriptionByUserId(userId);

  if (subscription && isSubscriptionEntitled(subscription)) {
    const maxCards = subscription.limits.maxCards;
    if (maxCards === -1) return true;
    const currentCount = await getUserCardCount(userId);
    return currentCount < maxCards;
  }

  // No subscription record — fall back to users.planType field
  try {
    const client = await clientPromise;
    const db = client.db("mybingocard");
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { createdAt: 1, planType: 1, subscriptionStatus: 1, trialEndsAt: 1 } }
    );
    if (hasPremiumAccess(user as any)) {
      return true;
    }

    const effectiveCardLimit = getEffectiveCardLimit(user as any);
    if (effectiveCardLimit === -1) return true;
    const currentCount = await getUserCardCount(userId);
    return currentCount < effectiveCardLimit;
  } catch {
    // userId not a valid ObjectId — fall through to free limit
  }

  // Free plan: check card count against free limit
  if (PLAN_LIMITS.free.maxCards === -1) {
    return true;
  }

  const currentCount = await getUserCardCount(userId);
  return currentCount < PLAN_LIMITS.free.maxCards;
}

export async function getAllActiveSubscriptions(): Promise<Subscription[]> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const subscriptions = await db
    .collection<Subscription>("subscriptions")
    .find({ status: { $in: ["active", "trialing", "past_due"] } })
    .toArray();

  return subscriptions;
}
