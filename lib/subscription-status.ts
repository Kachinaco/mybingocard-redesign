import type Stripe from "stripe";
import type { User } from "@/lib/db/users";

export const ACTIVE_LIKE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "unpaid"] as const;
export const LEGACY_FREE_ACCESS_CUTOFF = new Date("2026-06-03T07:00:00.000Z");
export const NEW_FREE_CARD_LIMIT = 1;
export const LEGACY_FREE_CARD_LIMIT = -1;
export const LEGACY_FREE_IMAGE_UPLOAD_LIMIT = 500;

type SubscriptionAccessUser = Pick<
  User,
  | "planType"
  | "subscriptionStatus"
  | "trialEndsAt"
  | "purchaseProvider"
  | "currentPeriodEnd"
>;

type LegacyAccessUser = SubscriptionAccessUser & Pick<User, "createdAt">;

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

export function hasPremiumAccess(user?: SubscriptionAccessUser | null): boolean {
  if (!user) return false;
  if (user.subscriptionStatus === "lifetime") return true;
  if (user.planType !== "PREMIUM") return false;
  if (user.purchaseProvider === "apple") {
    const currentPeriodEnd = user.currentPeriodEnd;
    if (!currentPeriodEnd) return false;
    const end = currentPeriodEnd instanceof Date
      ? currentPeriodEnd
      : new Date(String(currentPeriodEnd));
    if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) return false;
  }
  return isActiveLikeSubscriptionStatus(user.subscriptionStatus) || isUserOnTrial(user);
}

export function isLegacyFreeUser(
  user?: LegacyAccessUser | null
): boolean {
  if (!user || !user.createdAt) return false;
  if (hasPremiumAccess(user)) return false;

  const createdAt = user.createdAt instanceof Date
    ? user.createdAt
    : new Date(String(user.createdAt));

  if (Number.isNaN(createdAt.getTime())) return false;
  return createdAt < LEGACY_FREE_ACCESS_CUTOFF;
}

export function hasCardSaveAccess(
  user?: LegacyAccessUser | null
): boolean {
  if (!user) return false;
  return getEffectiveCardLimit(user) !== 0;
}

export function getEffectiveCardLimit(
  user?: LegacyAccessUser | null
): number {
  if (!user) return 0;
  if (hasPremiumAccess(user)) return -1;
  if (isLegacyFreeUser(user)) return LEGACY_FREE_CARD_LIMIT;
  return NEW_FREE_CARD_LIMIT;
}
