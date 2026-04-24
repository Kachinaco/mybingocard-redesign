import type Stripe from "stripe";
import type { User } from "@/lib/db/users";

export const ACTIVE_LIKE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "unpaid"] as const;

export function hasFutureTrialEnd(trialEndsAt?: Date | string | null): boolean {
  if (!trialEndsAt) return false;
  const trialEnd = trialEndsAt instanceof Date ? trialEndsAt : new Date(String(trialEndsAt));
  if (Number.isNaN(trialEnd.getTime())) return false;
  return trialEnd.getTime() > Date.now();
}

export function getTrialDaysLeft(trialEndsAt?: Date | string | null): number | null {
  if (!hasFutureTrialEnd(trialEndsAt)) return null;
  const trialEnd = trialEndsAt instanceof Date ? trialEndsAt : new Date(String(trialEndsAt));
  return Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function isActiveLikeSubscriptionStatus(status?: Stripe.Subscription.Status | User["subscriptionStatus"] | null): boolean {
  if (!status) return false;
  return ACTIVE_LIKE_SUBSCRIPTION_STATUSES.includes(status as typeof ACTIVE_LIKE_SUBSCRIPTION_STATUSES[number]);
}

export function isUserOnTrial(user?: Pick<User, "planType" | "subscriptionStatus" | "trialEndsAt"> | null): boolean {
  if (!user) return false;
  if (user.planType !== "PREMIUM") return false;
  if (user.subscriptionStatus === "lifetime") return false;
  return hasFutureTrialEnd(user.trialEndsAt);
}

export function hasPremiumAccess(user?: Pick<User, "planType" | "subscriptionStatus" | "trialEndsAt"> | null): boolean {
  if (!user) return false;
  if (user.subscriptionStatus === "lifetime") return true;
  if (user.planType !== "PREMIUM") return false;
  return isActiveLikeSubscriptionStatus(user.subscriptionStatus) || isUserOnTrial(user);
}
