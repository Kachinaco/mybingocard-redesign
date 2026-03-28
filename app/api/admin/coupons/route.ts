import { NextResponse } from "next/server";
import { createCoupon, getAllCoupons } from "@/lib/db/coupons";
import { getStripe } from "@/lib/stripe/config";
import { getAdminSessionEmail, requireAdmin } from "@/lib/admin";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

export async function GET(request: Request) {
  const session = await requireAdmin().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestContext = getRequestActivityContext(request);
  const adminEmail = getAdminSessionEmail(session);

  const coupons = await getAllCoupons();

  await trackActivity({
    event: "admin_coupons_accessed",
    source: "server",
    email: adminEmail,
    pathname: requestContext.pathname,
    domain: requestContext.domain,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      admin_email: adminEmail,
      result_count: coupons.length,
    },
  });

  return NextResponse.json({ coupons });
}

export async function POST(request: Request) {
  const session = await requireAdmin().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestContext = getRequestActivityContext(request);
  const adminEmail = getAdminSessionEmail(session);

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

  await trackActivity({
    event: "coupon_created",
    source: "server",
    email: adminEmail,
    pathname: requestContext.pathname,
    domain: requestContext.domain,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      admin_email: adminEmail,
      coupon_code: code.toUpperCase(),
      discount_percent: discountPercent || null,
      discount_amount: discountAmount || null,
      max_uses: maxUses || 0,
    },
  });

  return NextResponse.json({ coupon }, { status: 201 });
}
