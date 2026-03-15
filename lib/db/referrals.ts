import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import crypto from "crypto";

export interface Referral {
  _id: ObjectId;
  referrerId: string;
  referredEmail: string;
  referredUserId?: string;
  status: "pending" | "signed_up" | "rewarded";
  createdAt: Date;
  rewardedAt?: Date;
}

// Generate a unique 8-char referral code
export function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex");
}

export async function getReferralByCode(code: string) {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  // Referral code is stored on user doc
  const user = await db.collection("users").findOne({ referralCode: code });
  return user;
}

export async function createReferral(data: {
  referrerId: string;
  referredEmail: string;
  referredUserId?: string;
}): Promise<Referral> {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const referral: Partial<Referral> = {
    referrerId: data.referrerId,
    referredEmail: data.referredEmail,
    referredUserId: data.referredUserId,
    status: "signed_up",
    createdAt: new Date(),
  };

  const result = await db.collection<Referral>("referrals").insertOne(referral as Referral);
  return { ...referral, _id: result.insertedId } as Referral;
}

export async function getUserReferrals(userId: string): Promise<Referral[]> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection<Referral>("referrals")
    .find({ referrerId: userId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getReferralStats(userId: string) {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const total = await db.collection("referrals").countDocuments({ referrerId: userId });
  const signedUp = await db.collection("referrals").countDocuments({ referrerId: userId, status: "signed_up" });
  const rewarded = await db.collection("referrals").countDocuments({ referrerId: userId, status: "rewarded" });
  return { total, signedUp, rewarded };
}
