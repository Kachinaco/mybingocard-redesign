import { NextResponse } from "next/server";
import { createCoupon, getAllCoupons } from "@/lib/db/coupons";
import { getStripe } from "@/lib/stripe/config";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const session = await requireAdmin().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const coupons = await getAllCoupons();
  return NextResponse.json({ coupons });
}

export async function POST(request: Request) {
  const session = await requireAdmin().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { code, discountPercent, discountAmount, maxUses, expiresAt } =
    await request.json();

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const stripe = getStripe();

  // Create Stripe coupon
  const couponParams: any = {
    duration: "once",
    name: `Promo: ${code.toUpperCase()}`,
  };

  if (discountPercent) {
    couponParams.percent_off = discountPercent;
  } else if (discountAmount) {
    couponParams.amount_off = discountAmount;
    couponParams.currency = "usd";
  }

  const stripeCoupon = await stripe.coupons.create(couponParams);

  // Create Stripe promotion code
  const promoParams: any = {
    coupon: stripeCoupon.id,
    code: code.toUpperCase(),
  };

  if (maxUses) {
    promoParams.max_redemptions = maxUses;
  }

  if (expiresAt) {
    promoParams.expires_at = Math.floor(
      new Date(expiresAt).getTime() / 1000
    );
  }

  const promoCode = await stripe.promotionCodes.create(promoParams);

  // Save to DB
  const coupon = await createCoupon({
    code: code.toUpperCase(),
    discountPercent,
    discountAmount,
    maxUses: maxUses || 0,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    stripePromotionCodeId: promoCode.id,
    stripeCouponId: stripeCoupon.id,
  });

  return NextResponse.json({ coupon }, { status: 201 });
}
