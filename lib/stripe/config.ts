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

// Subscription Plans - 2-tier: Free + Premium
export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    priceId: null,
    features: [
      "3 bingo cards",
      "All grid sizes (3x3, 4x4, 5x5)",
      "5 starter templates",
      "Standard PDF export",
      "Share links",
      "Includes ads",
    ],
    limits: {
      maxCards: 3,
      maxSize: 5,
      maxBatchSize: 1,
      canExportPNG: false,
      canExportHD: false,
      canUseCustomFonts: false,
      canUseCustomColors: false,
      canUseAdvancedTemplates: false,
      canShuffleSharedCards: false,
      canUploadImages: false,
      maxImageUploads: 0,
      canUseAiGenerate: false,
      adFree: false,
    },
  },
  PREMIUM: {
    name: "Premium",
    monthlyPrice: 4.99,
    price: 4.99,
    priceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "price_1T7OqQGk2tmTlW8Zn2uPMYGh",
    features: [
      "Unlimited bingo cards",
      "All grid sizes (3x3, 4x4, 5x5)",
      "All premium templates",
      "AI-powered card generation",
      "HD PDF & PNG export",
      "Custom colors & fonts",
      "Up to 500 cards per batch",
      "Ad-free experience",
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

export const LIFETIME_PRICE_ID = process.env.STRIPE_PREMIUM_ONETIME_PRICE_ID || "price_1TIDDjGk2tmTlW8Zak5xV69e";
export const LIFETIME_PRICE = 14.99;

export type PlanType = keyof typeof PLANS;

export function getPlanByPriceId(priceId: string): PlanType | null {
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

