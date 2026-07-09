import { ObjectId } from "bson";
import { getSqliteStore } from "@/lib/db/sqlite";

export interface Coupon {
  _id: ObjectId;
  code: string;
  discountPercent?: number;
  discountAmount?: number;
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

  const result = getSqliteStore().insertOne("coupons", coupon as Coupon);
  return { ...coupon, _id: result.insertedId as ObjectId } as Coupon;
}

export async function getAllCoupons(): Promise<Coupon[]> {
  return getSqliteStore().findMany<Coupon>("coupons", {}, { sort: { createdAt: -1 } });
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  return getSqliteStore().findOne<Coupon>("coupons", {
    code: code.toUpperCase(),
    active: true,
  });
}

export async function toggleCoupon(id: string, active: boolean): Promise<void> {
  getSqliteStore().updateOne(
    "coupons",
    { _id: new ObjectId(id) },
    { $set: { active } }
  );
}

export async function incrementCouponUsage(code: string): Promise<void> {
  getSqliteStore().updateOne(
    "coupons",
    { code: code.toUpperCase() },
    { $inc: { usedCount: 1 } }
  );
}
