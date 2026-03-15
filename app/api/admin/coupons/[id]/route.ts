import { NextResponse } from "next/server";
import { toggleCoupon } from "@/lib/db/coupons";
import { requireAdmin } from "@/lib/admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { active } = await request.json();

  await toggleCoupon(id, active);

  return NextResponse.json({ success: true });
}
