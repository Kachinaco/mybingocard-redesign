import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cookieStore = await cookies();
  cookieStore.set("mbc_referral", code, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });
  redirect("/signup?ref=" + code);
}
