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
      "3 bingo cards per month",
      "3x3 and 4x4 grids",
      "Basic templates",
      "Standard PDF export",
      "Share links",
      "Includes ads",
    ],
    limits: {
      maxCards: 3,
      maxSize: 4,
      maxBatchSize: 1,
      canExportPNG: false,
      canExportHD: false,
      canUseCustomFonts: false,
      canUseCustomColors: false,
      canUseAdvancedTemplates: false,
      adFree: false,
    },
  },
  PREMIUM: {
    name: "Premium",
    monthlyPrice: 4.99,
    price: 4.99,
    priceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "price_1T7OqQGk2tmTlW8Zn2uPMYGh",
    oneTimePriceId: process.env.STRIPE_PREMIUM_ONETIME_PRICE_ID || "price_1T7OqQGk2tmTlW8Z1UzmTHsf",
    oneTimePrice: 2.99,
    features: [
      "Unlimited bingo cards",
      "All grid sizes (3x3, 4x4, 5x5)",
      "All premium templates",
      "HD PDF & PNG export",
      "Custom colors & fonts",
      "Up to 100 cards per batch",
      "Ad-free experience",
      "Priority support",
    ],
    limits: {
      maxCards: -1, // unlimited
      maxSize: 5,
      maxBatchSize: 100,
      canExportPNG: true,
      canExportHD: true,
      canUseCustomFonts: true,
      canUseCustomColors: true,
      canUseAdvancedTemplates: true,
      adFree: true,
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;

export function getPlanByPriceId(priceId: string): PlanType | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if ("priceId" in plan && plan.priceId === priceId) {
      return key as PlanType;
    }
    if ("oneTimePriceId" in plan && (plan as any).oneTimePriceId === priceId) {
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

export function isOneTimePrice(priceId: string): boolean {
  return priceId === PLANS.PREMIUM.oneTimePriceId;
}
