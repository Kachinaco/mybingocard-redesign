import { checkTrialExpiry, getUserByEmail, type User } from "@/lib/db/users";

export function requiresBillingSetup(user: Pick<User, "planType" | "stripeSubscriptionId" | "trialEndsAt"> | null | undefined): boolean {
  return Boolean(user && user.planType === "FREE" && !user.stripeSubscriptionId && !user.trialEndsAt);
}

export async function getUserAccessState(email: string) {
  const existingUser = await getUserByEmail(email);
  if (!existingUser) {
    return { user: null, billingSetupRequired: false };
  }

  const user = await checkTrialExpiry(existingUser);
  return {
    user,
    billingSetupRequired: requiresBillingSetup(user),
  };
}
