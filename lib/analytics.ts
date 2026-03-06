// Google Analytics event tracking utility
// GA is loaded via next/script in layout.tsx with ID G-LWWM9BCCTR

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

type EventParams = Record<string, string | number | boolean>;

function trackEvent(eventName: string, params?: EventParams) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}

// Card events
export function trackCardCreated(cardId: string, size: number, isPublic: boolean) {
  trackEvent("card_created", {
    card_id: cardId,
    grid_size: `${size}x${size}`,
    is_public: isPublic,
  });
}

export function trackCardShared(cardId: string, method: string) {
  trackEvent("card_shared", {
    card_id: cardId,
    share_method: method,
  });
}

export function trackCardPrinted(cardId: string, format: "pdf" | "png" | "print") {
  trackEvent("card_downloaded", {
    card_id: cardId,
    export_format: format,
  });
}

export function trackTemplateUsed(templateId: string, templateTitle: string, isPremium: boolean) {
  trackEvent("template_used", {
    template_id: templateId,
    template_title: templateTitle,
    is_premium: isPremium,
  });
}

export function trackPremiumPurchase(planType: string) {
  trackEvent("premium_purchase", {
    plan_type: planType,
  });
}

export function trackEmailSignup(source: string) {
  trackEvent("email_signup", {
    signup_source: source,
  });
}
