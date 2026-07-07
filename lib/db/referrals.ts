import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

export interface Referral {
  _id: ObjectId;
  referrerId: string;
  referredEmail: string;
  referredUserId?: string;
  status: "pending" | "signed_up" | "rewarded";
  createdAt: Date;
  rewardedAt?: Date;
}

interface ReferralCodeUser {
  _id: ObjectId;
  email?: string;
  name?: string;
  referralCode?: string;
}

// Generate a unique 8-char referral code
export function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex");
}

export async function getReferralByCode(code: string): Promise<ReferralCodeUser | null> {
  if (useSqliteDb()) {
    return getSqliteStore().findOne<ReferralCodeUser>("users", { referralCode: code });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  // Referral code is stored on user doc
  const user = await db.collection<ReferralCodeUser>("users").findOne({ referralCode: code });
  return user;
}

export async function ensureUserReferralCode(email: string): Promise<string | null> {
  if (useSqliteDb()) {
    const store = getSqliteStore();
    const user = store.findOne<ReferralCodeUser>("users", { email });
    if (!user) return null;
    if (user.referralCode) return user.referralCode;

    const referralCode = generateReferralCode();
    store.updateOne("users", { email }, { $set: { referralCode } });
    return referralCode;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const user = await db.collection<ReferralCodeUser>("users").findOne({ email });
  if (!user) return null;
  if (user.referralCode) return user.referralCode;

  const referralCode = generateReferralCode();
  await db.collection<ReferralCodeUser>("users").updateOne(
    { email },
    { $set: { referralCode } }
  );
  return referralCode;
}

export async function createReferral(data: {
  referrerId: string;
  referredEmail: string;
  referredUserId?: string;
}): Promise<Referral> {
  const referral: Partial<Referral> = {
    referrerId: data.referrerId,
    referredEmail: data.referredEmail,
    referredUserId: data.referredUserId,
    status: "signed_up",
    createdAt: new Date(),
  };

  if (useSqliteDb()) {
    const result = getSqliteStore().insertOne("referrals", referral as Referral);
    return { ...referral, _id: result.insertedId as ObjectId } as Referral;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const result = await db.collection<Referral>("referrals").insertOne(referral as Referral);
  return { ...referral, _id: result.insertedId } as Referral;
}

export async function getUserReferrals(userId: string): Promise<Referral[]> {
  if (useSqliteDb()) {
    return getSqliteStore().findMany<Referral>(
      "referrals",
      { referrerId: userId },
      { sort: { createdAt: -1 } }
    );
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection<Referral>("referrals")
    .find({ referrerId: userId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getReferralStats(userId: string) {
  if (useSqliteDb()) {
    const store = getSqliteStore();
    const total = store.count("referrals", { referrerId: userId });
    const signedUp = store.count("referrals", { referrerId: userId, status: "signed_up" });
    const rewarded = store.count("referrals", { referrerId: userId, status: "rewarded" });
    return { total, signedUp, rewarded };
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const total = await db.collection("referrals").countDocuments({ referrerId: userId });
  const signedUp = await db.collection("referrals").countDocuments({ referrerId: userId, status: "signed_up" });
  const rewarded = await db.collection("referrals").countDocuments({ referrerId: userId, status: "rewarded" });
  return { total, signedUp, rewarded };
}
