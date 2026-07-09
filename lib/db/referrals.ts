import { ObjectId } from "bson";
import crypto from "crypto";
import { getSqliteStore } from "@/lib/db/sqlite";

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

export function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex");
}

export async function getReferralByCode(code: string): Promise<ReferralCodeUser | null> {
  return getSqliteStore().findOne<ReferralCodeUser>("users", { referralCode: code });
}

export async function ensureUserReferralCode(email: string): Promise<string | null> {
  const store = getSqliteStore();
  const user = store.findOne<ReferralCodeUser>("users", { email });
  if (!user) return null;
  if (user.referralCode) return user.referralCode;

  const referralCode = generateReferralCode();
  store.updateOne("users", { email }, { $set: { referralCode } });
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

  const result = getSqliteStore().insertOne("referrals", referral as Referral);
  return { ...referral, _id: result.insertedId as ObjectId } as Referral;
}

export async function getUserReferrals(userId: string): Promise<Referral[]> {
  return getSqliteStore().findMany<Referral>(
    "referrals",
    { referrerId: userId },
    { sort: { createdAt: -1 } }
  );
}

export async function getReferralStats(userId: string) {
  const store = getSqliteStore();
  const total = store.count("referrals", { referrerId: userId });
  const signedUp = store.count("referrals", { referrerId: userId, status: "signed_up" });
  const rewarded = store.count("referrals", { referrerId: userId, status: "rewarded" });
  return { total, signedUp, rewarded };
}
