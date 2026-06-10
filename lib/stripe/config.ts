import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return _stripe;
}

// For backward compatibility
export const stripe = {
  get checkout() { return getStripe().checkout; },
  get subscriptions() { return getStripe().subscriptions; },
  get webhooks() { return getStripe().webhooks; },
  get customers() { return getStripe().customers; },
  get billingPortal() { return getStripe().billingPortal; },
};

export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  successUrl: process.env.NEXT_PUBLIC_APP_URL + "/dashboard?success=true",
  cancelUrl: process.env.NEXT_PUBLIC_APP_URL + "/pricing?canceled=true",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
};

export const PREMIUM_MONTHLY_PRICE = 7.99;
export const PREMIUM_TRIAL_DAYS = 3;
export const LIFETIME_PRICE_ID = process.env.STRIPE_PREMIUM_ONETIME_PRICE_ID || "price_1TeG1ZGk2tmTlW8ZYqNKvjfX";
export const LIFETIME_PRICE = 29.99;

function splitPriceIds(value?: string): string[] {
  return (value || "")
    .split(/[;,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

// Subscription Plans - 2-tier: Free + Premium
export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    priceId: null,
    features: [
      "Unlimited saved bingo cards",
      "All grid sizes (3x3, 4x4, 5x5)",
      "All templates",
      "Image bingo cards",
      "PDF and PNG export",
      "Custom colors & fonts",
      "Paid printable batch packs",
      "AI-powered card generation",
      "Profile and saved-card access",
      "Paid batches, share links, and hosted bingo events are optional",
    ],
    limits: {
      maxCards: -1,
      maxSize: 5,
      maxBatchSize: 1,
      canExportPNG: true,
      canExportHD: true,
      canUseCustomFonts: true,
      canUseCustomColors: true,
      canUseAdvancedTemplates: true,
      canShuffleSharedCards: false,
      canUploadImages: true,
      maxImageUploads: 500,
      canUseAiGenerate: true,
      adFree: true,
    },
  },
  PREMIUM: {
    name: "Premium",
    monthlyPrice: PREMIUM_MONTHLY_PRICE,
    price: PREMIUM_MONTHLY_PRICE,
    priceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "price_1TeG1YGk2tmTlW8ZF1abKglT",
    features: [
      "Live bingo event hosting",
      "Direct player links and email sharing",
      "Unique shuffled card per viewer",
      "Printable batches up to 500 cards",
      "Paid sharing workflow for groups",
      "Priority support",
    ],
    limits: {
      maxCards: -1, // unlimited
      maxSize: 5,
      maxBatchSize: 500,
      canExportPNG: true,
      canExportHD: true,
      canUseCustomFonts: true,
      canUseCustomColors: true,
      canUseAdvancedTemplates: true,
      canShuffleSharedCards: true,
      canUploadImages: true,
      maxImageUploads: 500,
      canUseAiGenerate: true,
      adFree: true,
    },
  },
} as const;

export const PREMIUM_MONTHLY_PRICE_IDS = Array.from(new Set([
  PLANS.PREMIUM.priceId,
  ...splitPriceIds(process.env.STRIPE_PREMIUM_LEGACY_MONTHLY_PRICE_IDS || "price_1T7OqQGk2tmTlW8Zn2uPMYGh"),
])).filter(Boolean);

export type PlanType = keyof typeof PLANS;

export function getPlanByPriceId(priceId: string): PlanType | null {
  if (PREMIUM_MONTHLY_PRICE_IDS.includes(priceId)) {
    return "PREMIUM";
  }

  for (const [key, plan] of Object.entries(PLANS)) {
    if ("priceId" in plan && plan.priceId === priceId) {
      return key as PlanType;
    }
  }
  return null;
}

export function canUserAccessFeature(
  userPlan: PlanType,
  feature: string
): boolean {
  const plan = PLANS[userPlan];
  return (plan.limits as any)[feature] !== false;
}
