import { PLANS } from "./stripe/config";
import type { PlanType } from "./stripe/config";

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

/**
 * Check if a user can create a new card based on their plan limits
 */
export function canCreateCard(
  planType: PlanType,
  cardsCreatedThisMonth: number
): PermissionCheck {
  const plan = PLANS[planType];

  // Unlimited cards for Business plan
  if (plan.limits.maxCards === -1) {
    return { allowed: true };
  }

  // Check if user has reached their monthly limit
  if (cardsCreatedThisMonth >= plan.limits.maxCards) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${plan.limits.maxCards} cards. Upgrade to create more.`,
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can use a specific grid size
 */
export function canUseGridSize(
  planType: PlanType,
  gridSize: number
): PermissionCheck {
  const plan = PLANS[planType];

  if (gridSize > plan.limits.maxSize) {
    return {
      allowed: false,
      reason: `${gridSize}x${gridSize} grids require ${
        gridSize > 4 ? "Business" : "Pro"
      } plan. Your plan supports up to ${plan.limits.maxSize}x${plan.limits.maxSize}.`,
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can export in HD quality
 */
export function canExportHD(planType: PlanType): PermissionCheck {
  const plan = PLANS[planType];

  if (!(plan.features as readonly string[]).includes("HD PDF export")) {
    return {
      allowed: false,
      reason: "HD exports require Pro or Business plan.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can access all templates
 */
export function canAccessAllTemplates(planType: PlanType): PermissionCheck {
  const plan = PLANS[planType];

  if (!(plan.features as readonly string[]).includes("Access to all templates")) {
    return {
      allowed: false,
      reason: "Premium templates require Pro or Business plan.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can remove branding/watermarks
 */
export function canRemoveBranding(planType: PlanType): PermissionCheck {
  const plan = PLANS[planType];

  if (!(plan.features as readonly string[]).includes("No watermark")) {
    return {
      allowed: false,
      reason: "Removing watermarks requires Pro or Business plan.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can access priority support
 */
export function hasPrioritySupport(planType: PlanType): boolean {
  const plan = PLANS[planType];
  return (plan.features as readonly string[]).includes("Priority support");
}

/**
 * Get all permissions for a plan type
 */
export function getPlanPermissions(planType: PlanType) {
  const plan = PLANS[planType];

  const features = plan.features as readonly string[];
  return {
    maxCards: plan.limits.maxCards,
    maxGridSize: plan.limits.maxSize,
    canExportHD: features.includes("HD PDF export"),
    canAccessAllTemplates: features.includes("Access to all templates"),
    canRemoveBranding: features.includes("No watermark"),
    hasPrioritySupport: features.includes("Priority support"),
    planName: plan.name,
    planPrice: plan.price,
  };
}
