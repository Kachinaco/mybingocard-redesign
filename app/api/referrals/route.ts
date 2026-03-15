import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { getUserReferrals, getReferralStats, generateReferralCode } from "@/lib/db/referrals";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  // Ensure user has a referral code
  let user = await db.collection("users").findOne({ email: session.user.email });
  if (!user?.referralCode) {
    const code = generateReferralCode();
    await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { referralCode: code } }
    );
    user = await db.collection("users").findOne({ email: session.user.email });
  }

  const referrals = await getUserReferrals(session.user.id);
  const stats = await getReferralStats(session.user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mybingocard.com";

  return NextResponse.json({
    referralCode: user?.referralCode,
    referralLink: `${appUrl}/r/${user?.referralCode}`,
    stats,
    referrals: referrals.map(r => ({
      email: r.referredEmail,
      status: r.status,
      createdAt: r.createdAt,
    })),
  });
}
