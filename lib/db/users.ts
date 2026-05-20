import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { PlanType } from "@/lib/stripe/config";

export interface User {
  _id: ObjectId;
  email: string;
  name?: string;
  image?: string;
  password?: string;
  emailVerified?: Date;
  planType: PlanType;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  subscriptionStatus?: "active" | "trialing" | "inactive" | "past_due" | "canceled" | "lifetime";
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: Date | null;
  trialEndsAt?: Date | null;
  referralCode?: string;
  createdAt: Date;
  updatedAt: Date;
  // UTM / referral tracking
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  last_utm_source?: string;
  last_utm_medium?: string;
  last_utm_campaign?: string;
  last_utm_content?: string;
  last_utm_term?: string;
  last_referrer?: string;
  anonymousId?: string;
  signupMethod?: "google" | "apple" | "credentials" | "magic_link" | "share_link";
  signupDevice?: string;   // "Chrome 146 / Windows" parsed from UA
  signupCountry?: string;  // "PH" from IP geolocation
  signupLanguage?: string; // "en-PH" from Accept-Language header
  requiresCheckout?: boolean;
  // Behavior counters
  totalCardsCreated?: number;
  lastCardCreatedAt?: Date;
  totalExports?: number;
  lastExportAt?: Date;
  featuresUsed?: string[];
  loginCount?: number;
  lastLoginAt?: Date;
  customerType?: "real" | "admin" | "complimentary" | "test" | "guest";
}

export type UserAttributionFields = Pick<
  User,
  "utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term" | "referrer"
>;

export async function getUserByEmail(email: string): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const user = await db.collection<User>("users").findOne({ email });
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const user = await db.collection<User>("users").findOne({
    _id: new ObjectId(id)
  });
  return user;
}

export async function createUser(data: {
  email: string;
  password?: string;
  name?: string;
  image?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  last_utm_source?: string;
  last_utm_medium?: string;
  last_utm_campaign?: string;
  last_utm_content?: string;
  last_utm_term?: string;
  last_referrer?: string;
  signupMethod?: "google" | "apple" | "credentials" | "magic_link";
  signupDevice?: string;
  signupLanguage?: string;
}): Promise<User> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const hashedPassword = data.password
    ? await bcrypt.hash(data.password, 10)
    : undefined;

  const user: Partial<User> = {
    email: data.email,
    name: data.name,
    image: data.image,
    password: hashedPassword,
    planType: "FREE",
    subscriptionStatus: "inactive",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...(data.utm_source && { utm_source: data.utm_source }),
    ...(data.utm_medium && { utm_medium: data.utm_medium }),
    ...(data.utm_campaign && { utm_campaign: data.utm_campaign }),
    ...(data.utm_content && { utm_content: data.utm_content }),
    ...(data.utm_term && { utm_term: data.utm_term }),
    ...(data.referrer && { referrer: data.referrer }),
    ...(data.last_utm_source && { last_utm_source: data.last_utm_source }),
    ...(data.last_utm_medium && { last_utm_medium: data.last_utm_medium }),
    ...(data.last_utm_campaign && { last_utm_campaign: data.last_utm_campaign }),
    ...(data.last_utm_content && { last_utm_content: data.last_utm_content }),
    ...(data.last_utm_term && { last_utm_term: data.last_utm_term }),
    ...(data.last_referrer && { last_referrer: data.last_referrer }),
    ...(data.signupMethod && { signupMethod: data.signupMethod }),
    ...(data.signupDevice && { signupDevice: data.signupDevice }),
    ...(data.signupLanguage && { signupLanguage: data.signupLanguage }),
    referralCode: crypto.randomBytes(4).toString("hex"),
  };

  const result = await db.collection<User>("users").insertOne(user as User);

  return {
    ...user,
    _id: result.insertedId,
  } as User;
}

function buildMissingAttributionUpdates(
  current: Partial<UserAttributionFields>,
  incoming: Partial<UserAttributionFields>
): Partial<UserAttributionFields> {
  const updates: Partial<UserAttributionFields> = {};

  if (incoming.utm_source && !current.utm_source) updates.utm_source = incoming.utm_source;
  if (incoming.utm_medium && !current.utm_medium) updates.utm_medium = incoming.utm_medium;
  if (incoming.utm_campaign && !current.utm_campaign) updates.utm_campaign = incoming.utm_campaign;
  if (incoming.utm_content && !current.utm_content) updates.utm_content = incoming.utm_content;
  if (incoming.utm_term && !current.utm_term) updates.utm_term = incoming.utm_term;
  if (incoming.referrer && !current.referrer) updates.referrer = incoming.referrer;

  return updates;
}

export async function updateUser(
  id: string,
  data: Partial<User>
): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const result = await db.collection<User>("users").findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...data,
        updatedAt: new Date()
      }
    },
    { returnDocument: "after" }
  );

  return result;
}

export async function updateUserAttribution(
  id: string,
  data: Partial<UserAttributionFields>
): Promise<User | null> {
  const current = await getUserById(id);
  if (!current) return null;

  const updates = buildMissingAttributionUpdates(current, data);
  if (Object.keys(updates).length === 0) {
    return current;
  }

  return updateUser(id, updates);
}

export async function updateUserLastAttribution(
  id: string,
  data: Partial<UserAttributionFields>
): Promise<User | null> {
  const updates: Partial<User> = {
    ...(data.utm_source ? { last_utm_source: data.utm_source } : {}),
    ...(data.utm_medium ? { last_utm_medium: data.utm_medium } : {}),
    ...(data.utm_campaign ? { last_utm_campaign: data.utm_campaign } : {}),
    ...(data.utm_content ? { last_utm_content: data.utm_content } : {}),
    ...(data.utm_term ? { last_utm_term: data.utm_term } : {}),
    ...(data.referrer ? { last_referrer: data.referrer } : {}),
  };

  if (Object.keys(updates).length === 0) {
    return getUserById(id);
  }

  return updateUser(id, updates);
}

export async function updateUserSignupMethod(
  id: string,
  signupMethod: NonNullable<User["signupMethod"]>
): Promise<User | null> {
  return updateUser(id, { signupMethod });
}

export async function ensureUserDefaults(id: string): Promise<User | null> {
  const current = await getUserById(id);
  if (!current) return null;

  const now = new Date();
  const updates: Partial<User> = {};

  if (current.createdAt === undefined) {
    updates.createdAt = current._id.getTimestamp();
  }

  if (current.updatedAt === undefined) {
    updates.updatedAt = now;
  }

  if (current.planType === undefined) {
    updates.planType = "FREE";
  }

  if (current.subscriptionStatus === undefined) {
    updates.subscriptionStatus = "inactive";
  }

  if (current.cancelAtPeriodEnd === undefined) {
    updates.cancelAtPeriodEnd = false;
  }

  if (current.emailVerified === undefined || current.emailVerified === null) {
    updates.emailVerified = now;
  }

  if (current.cancelAt === undefined) {
    updates.cancelAt = null;
  }

  if (!(current as any).referralCode) {
    (updates as any).referralCode = crypto.randomBytes(4).toString("hex");
  }

  if (Object.keys(updates).length === 0) {
    return current;
  }

  return updateUser(id, updates);
}




export async function updateUserSubscription(
  email: string,
  subscriptionData: {
    planType?: PlanType;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    status?: "active" | "trialing" | "inactive" | "past_due" | "canceled" | "lifetime";
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
      cancelAtPeriodEnd?: boolean;
    cancelAt?: Date | null;
    cancellationReason?: string | null;
    cancellationFeedback?: string | null;
    trialEndsAt?: Date | null;
  }
): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (subscriptionData.planType !== undefined) {
    updateData.planType = subscriptionData.planType;
  }

  if (subscriptionData.stripeCustomerId !== undefined) {
    updateData.stripeCustomerId = subscriptionData.stripeCustomerId;
  }

  if (subscriptionData.stripeSubscriptionId !== undefined) {
    updateData.stripeSubscriptionId = subscriptionData.stripeSubscriptionId;
  }

  if (subscriptionData.stripePriceId !== undefined) {
    updateData.stripePriceId = subscriptionData.stripePriceId;
  }

  if (subscriptionData.status !== undefined) {
    updateData.subscriptionStatus = subscriptionData.status;
  }

  if (subscriptionData.currentPeriodStart !== undefined) {
    updateData.currentPeriodStart = subscriptionData.currentPeriodStart;
  }

  if (subscriptionData.currentPeriodEnd !== undefined) {
    updateData.currentPeriodEnd = subscriptionData.currentPeriodEnd;
  }

  if (subscriptionData.cancelAtPeriodEnd !== undefined) {
    updateData.cancelAtPeriodEnd = subscriptionData.cancelAtPeriodEnd;
  }

  if (subscriptionData.cancelAt !== undefined) {
    updateData.cancelAt = subscriptionData.cancelAt;
  }

  if (subscriptionData.cancellationReason !== undefined) {
    updateData.cancellationReason = subscriptionData.cancellationReason;
  }

  if (subscriptionData.cancellationFeedback !== undefined) {
    updateData.cancellationFeedback = subscriptionData.cancellationFeedback;
  }

  if (subscriptionData.trialEndsAt !== undefined) {
    updateData.trialEndsAt = subscriptionData.trialEndsAt;
  }

  const result = await db.collection<User>("users").findOneAndUpdate(
    { email },
    { $set: updateData },
    { returnDocument: "after" }
  );

  return result;
}

export async function updateUserPassword(
  email: string,
  password: string
): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await db.collection<User>("users").updateOne(
    { email },
    {
      $set: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    }
  );

  return result.matchedCount > 0;
}

export async function incrementUserCounter(
  userId: string,
  field: string,
  value?: number
): Promise<void> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db.collection<User>("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $inc: { [field]: value || 1 } as any,
      $set: { updatedAt: new Date() },
    }
  );
}

export async function addFeatureUsed(
  userId: string,
  feature: string
): Promise<void> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db.collection<User>("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $addToSet: { featuresUsed: feature } as any,
      $set: { updatedAt: new Date() },
    }
  );
}

export async function incrementCardStats(userId: string): Promise<void> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db.collection<User>("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $inc: { totalCardsCreated: 1 } as any,
      $set: { lastCardCreatedAt: new Date(), updatedAt: new Date() },
    }
  );
}
