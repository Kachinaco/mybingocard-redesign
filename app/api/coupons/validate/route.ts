import { NextResponse } from "next/server";
import { getCouponByCode } from "@/lib/db/coupons";
import { trackActivity } from "@/lib/activity";
import { trackApiError } from "@/lib/api-error-tracking";
import { readJsonObject } from "@/lib/request-json";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body.ok) {
      return NextResponse.json({ valid: false, error: body.error }, { status: 400 });
    }

    const { code } = body.data;

    if (!code) {
      return NextResponse.json({ valid: false, error: "No code provided" });
    }

    const coupon = await getCouponByCode(code);

    if (!coupon) {
      trackActivity({
        event: "coupon_validation_attempted",
        source: "server",
        pathname: "/api/coupons/validate",
        metadata: { code, result: "invalid", reason: "not_found" },
      }).catch(() => {});
      return NextResponse.json({ valid: false, error: "Invalid coupon code" });
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      trackActivity({
        event: "coupon_validation_attempted",
        source: "server",
        pathname: "/api/coupons/validate",
        metadata: { code, result: "invalid", reason: "usage_limit_reached" },
      }).catch(() => {});
      return NextResponse.json({
        valid: false,
        error: "This coupon has reached its usage limit",
      });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      trackActivity({
        event: "coupon_validation_attempted",
        source: "server",
        pathname: "/api/coupons/validate",
        metadata: { code, result: "invalid", reason: "expired" },
      }).catch(() => {});
      return NextResponse.json({
        valid: false,
        error: "This coupon has expired",
      });
    }

    trackActivity({
      event: "coupon_validation_attempted",
      source: "server",
      pathname: "/api/coupons/validate",
      metadata: {
        code,
        result: "valid",
        discount_percent: coupon.discountPercent || null,
        discount_amount: coupon.discountAmount || null,
      },
    }).catch(() => {});

    return NextResponse.json({
      valid: true,
      discount: coupon.discountPercent
        ? `${coupon.discountPercent}% off`
        : `$${((coupon.discountAmount || 0) / 100).toFixed(2)} off`,
      stripePromotionCodeId: coupon.stripePromotionCodeId,
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    await trackApiError(error, {
      route: "/api/coupons/validate",
      method: "POST",
      statusCode: 500,
    });
    return NextResponse.json({ valid: false, error: "Validation failed" }, { status: 500 });
  }
}
