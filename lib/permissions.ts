import { PLANS } from "./stripe/config";
import type { PlanType } from "./stripe/config";

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

function getPlan(planType: PlanType) {
  return PLANS[planType as keyof typeof PLANS] || PLANS.FREE;
}

/**
 * Check if a user can create a new card based on their plan limits
 */
export function canCreateCard(
  planType: PlanType,
  cardsCreatedThisMonth: number
): PermissionCheck {
  const plan = getPlan(planType);

  // Unlimited cards
  if (plan.limits.maxCards === -1) {
    return { allowed: true };
  }

  // Check if user has reached their limit
  if (cardsCreatedThisMonth >= plan.limits.maxCards) {
    return {
      allowed: false,
      reason: `You've reached your limit of ${plan.limits.maxCards} cards. Upgrade to create more.`,
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
  const plan = getPlan(planType);

  if (gridSize > plan.limits.maxSize) {
    return {
      allowed: false,
      reason: `${gridSize}x${gridSize} grids require Premium plan. Your plan supports up to ${plan.limits.maxSize}x${plan.limits.maxSize}.`,
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can export in HD quality
 */
export function canExportHD(planType: PlanType): PermissionCheck {
  const plan = getPlan(planType);

  if (!plan.limits.canExportHD) {
    return {
      allowed: false,
      reason: "HD exports require Premium plan.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can access all templates
 */
export function canAccessAllTemplates(planType: PlanType): PermissionCheck {
  const plan = getPlan(planType);

  if (!plan.limits.canUseAdvancedTemplates) {
    return {
      allowed: false,
      reason: "Premium templates require Premium plan.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can remove branding/watermarks
 */
export function canRemoveBranding(planType: PlanType): PermissionCheck {
  const plan = getPlan(planType);

  if (!plan.limits.adFree) {
    return {
      allowed: false,
      reason: "Removing watermarks requires Premium plan.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if a user's shared cards should show unique shuffled layouts per viewer
 */
export function canShuffleSharedCards(planType: PlanType): PermissionCheck {
  const plan = getPlan(planType);
  if (!(plan.limits as any).canShuffleSharedCards) {
    return {
      allowed: false,
      reason: "Unique cards per viewer requires Premium plan.",
      upgradeRequired: true,
    };
  }
  return { allowed: true };
}

/**
 * Check if a user can upload custom images to bingo cells
 */
export function canUploadImages(planType: PlanType): PermissionCheck {
  const plan = getPlan(planType);

  if (!(plan.limits as any).canUploadImages) {
    return {
      allowed: false,
      reason: "Custom image uploads require Premium plan. Free users can use the clip-art library.",
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can access priority support
 */
export function hasPrioritySupport(planType: PlanType): boolean {
  const plan = getPlan(planType);
  return (plan.features as readonly string[]).includes("Priority support");
}

/**
 * Get all permissions for a plan type
 */
export function getPlanPermissions(planType: PlanType) {
  const plan = getPlan(planType);

  return {
    maxCards: plan.limits.maxCards,
    maxGridSize: plan.limits.maxSize,
    canExportHD: plan.limits.canExportHD,
    canAccessAllTemplates: plan.limits.canUseAdvancedTemplates,
    canRemoveBranding: plan.limits.adFree,
    hasPrioritySupport: (plan.features as readonly string[]).includes("Priority support"),
    planName: plan.name,
    planPrice: plan.price,
  };
}
