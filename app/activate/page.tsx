import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AccountPendingCheckoutGate from "@/components/AccountPendingCheckoutGate";
import { getUserByEmail } from "@/lib/db/users";
import { hasPremiumAccess } from "@/lib/subscription-status";

export const metadata: Metadata = {
  title: "Activate Account",
  description: "Choose Free or Premium access for your MyBingoCard account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ActivatePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/activate");
  }

  const user = session.user.email ? await getUserByEmail(session.user.email) : null;

  if (hasPremiumAccess(user)) {
    redirect("/dashboard");
  }

  return <AccountPendingCheckoutGate email={session.user.email || user?.email || ""} />;
}
