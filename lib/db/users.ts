import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
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
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  subscriptionStatus?: "active" | "inactive" | "past_due" | "canceled";
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // UTM / referral tracking
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
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

  if (Object.keys(updates).length === 0) {
    return current;
  }

  return updateUser(id, updates);
}

export async function updateUserSubscription(
  email: string,
  subscriptionData: {
    planType?: PlanType;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    status?: "active" | "inactive" | "past_due" | "canceled";
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
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
