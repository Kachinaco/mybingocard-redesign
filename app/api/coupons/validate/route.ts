import { NextResponse } from "next/server";
import { getCouponByCode } from "@/lib/db/coupons";

export async function POST(request: Request) {
  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ valid: false, error: "No code provided" });
  }

  const coupon = await getCouponByCode(code);

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Invalid coupon code" });
  }

  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({
      valid: false,
      error: "This coupon has reached its usage limit",
    });
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return NextResponse.json({
      valid: false,
      error: "This coupon has expired",
    });
  }

  return NextResponse.json({
    valid: true,
    discount: coupon.discountPercent
      ? `${coupon.discountPercent}% off`
      : `$${((coupon.discountAmount || 0) / 100).toFixed(2)} off`,
    stripePromotionCodeId: coupon.stripePromotionCodeId,
  });
}
