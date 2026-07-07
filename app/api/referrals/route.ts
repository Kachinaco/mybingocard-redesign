import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureUserReferralCode, getReferralStats, getUserReferrals } from "@/lib/db/referrals";
import { trackActivity } from "@/lib/activity";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const referralCode = await ensureUserReferralCode(session.user.email);

    const referrals = await getUserReferrals(session.user.id);
    const stats = await getReferralStats(session.user.id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mybingocard.com";

    trackActivity({
      event: "referral_dashboard_accessed",
      source: "server",
      userId: session.user.id,
      email: session.user.email,
      pathname: "/api/referrals",
      metadata: {
        referral_code: referralCode,
        total_referrals: stats?.total || 0,
      },
    }).catch(() => {});

    return NextResponse.json({
      referralCode,
      referralLink: referralCode ? `${appUrl}/r/${referralCode}` : null,
      stats,
      referrals: referrals.map(r => ({
        email: r.referredEmail,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Referrals error:", error);
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
  }
}
