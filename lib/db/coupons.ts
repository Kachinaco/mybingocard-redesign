import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

export interface Coupon {
  _id: ObjectId;
  code: string;
  discountPercent?: number;
  discountAmount?: number; // in cents
  maxUses: number;
  usedCount: number;
  expiresAt?: Date;
  active: boolean;
  stripePromotionCodeId?: string;
  stripeCouponId?: string;
  createdAt: Date;
}

export async function createCoupon(data: {
  code: string;
  discountPercent?: number;
  discountAmount?: number;
  maxUses: number;
  expiresAt?: Date;
  stripePromotionCodeId?: string;
  stripeCouponId?: string;
}): Promise<Coupon> {
  const coupon: Partial<Coupon> = {
    code: data.code.toUpperCase(),
    discountPercent: data.discountPercent,
    discountAmount: data.discountAmount,
    maxUses: data.maxUses,
    usedCount: 0,
    expiresAt: data.expiresAt,
    active: true,
    stripePromotionCodeId: data.stripePromotionCodeId,
    stripeCouponId: data.stripeCouponId,
    createdAt: new Date(),
  };

  if (useSqliteDb()) {
    const result = getSqliteStore().insertOne("coupons", coupon as Coupon);
    return { ...coupon, _id: result.insertedId as ObjectId } as Coupon;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  const result = await db
    .collection<Coupon>("coupons")
    .insertOne(coupon as Coupon);
  return { ...coupon, _id: result.insertedId } as Coupon;
}

export async function getAllCoupons(): Promise<Coupon[]> {
  if (useSqliteDb()) {
    return getSqliteStore().findMany<Coupon>("coupons", {}, { sort: { createdAt: -1 } });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db
    .collection<Coupon>("coupons")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  if (useSqliteDb()) {
    return getSqliteStore().findOne<Coupon>("coupons", {
      code: code.toUpperCase(),
      active: true,
    });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db
    .collection<Coupon>("coupons")
    .findOne({ code: code.toUpperCase(), active: true });
}

export async function toggleCoupon(id: string, active: boolean): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().updateOne(
      "coupons",
      { _id: new ObjectId(id) },
      { $set: { active } }
    );
    return;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db
    .collection("coupons")
    .updateOne({ _id: new ObjectId(id) }, { $set: { active } });
}

export async function incrementCouponUsage(code: string): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().updateOne(
      "coupons",
      { code: code.toUpperCase() },
      { $inc: { usedCount: 1 } }
    );
    return;
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");
  await db
    .collection("coupons")
    .updateOne({ code: code.toUpperCase() }, { $inc: { usedCount: 1 } });
}
