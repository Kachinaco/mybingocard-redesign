import { NextResponse } from "next/server";
import { toggleCoupon } from "@/lib/db/coupons";
import { getAdminSessionEmail, requireAdmin } from "@/lib/admin";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestContext = getRequestActivityContext(request);
    const adminEmail = getAdminSessionEmail(session);

    const { id } = await params;
    const { active } = await request.json();

    await toggleCoupon(id, active);

    await trackActivity({
      event: "coupon_toggled",
      source: "server",
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        admin_email: adminEmail,
        coupon_id: id,
        active_status: active,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin coupon toggle error:", error);
    return NextResponse.json({ error: "Failed to toggle coupon" }, { status: 500 });
  }
}
