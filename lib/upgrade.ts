export interface CheckoutOptions {
  successPath?: string;
  cancelPath?: string;
  purchaseType?: string;
  batchCount?: number;
  label?: string;
}

type CheckoutInvocation = CheckoutOptions | Pick<Event, "preventDefault">;

function isEventLike(value: CheckoutInvocation | undefined): value is Pick<Event, "preventDefault"> {
  return Boolean(value && typeof value === "object" && "preventDefault" in value);
}

// Global checkout opener — set by CheckoutModalProvider
let _globalCheckoutOpener: ((options?: {
  priceId?: string;
  purchaseType?: string;
  batchCount?: number;
  label?: string;
  returnPath?: string;
}) => Promise<void>) | null = null;

export function registerCheckoutOpener(opener: typeof _globalCheckoutOpener) {
  _globalCheckoutOpener = opener;
}

export async function redirectToCheckout(invocation?: CheckoutInvocation): Promise<void> {
  if (isEventLike(invocation)) {
    invocation.preventDefault();
  }

  const options = isEventLike(invocation) ? {} : (invocation ?? {});
  const isLifetime = options.purchaseType === "lifetime";
  const priceId = isLifetime
    ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_ONETIME_PRICE_ID
    : process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID;

  // Use embedded checkout modal if available
  if (_globalCheckoutOpener) {
    await _globalCheckoutOpener({
      priceId: priceId || undefined,
      purchaseType: isLifetime ? "lifetime" : options.purchaseType,
      batchCount: options.batchCount,
      label: isLifetime ? "Premium Lifetime — $14.99 one-time" : options.label,
      returnPath: options.successPath,
    });
    return;
  }

  // Fallback: redirect to Stripe (should not happen if provider is mounted)
  if (!priceId) {
    window.alert("Checkout is temporarily unavailable. Please try again in a moment.");
    return;
  }

  try {
    const response = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId,
        successPath: options.successPath,
        cancelPath: options.cancelPath,
      }),
    });

    let data: { url?: string; error?: string } = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401) {
      const callbackUrl = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      return;
    }

    if (response.ok && data.url) {
      window.location.href = data.url;
      return;
    }

    window.alert(data.error || "Failed to start checkout. Please try again.");
  } catch {
    window.alert("Failed to start checkout. Please try again.");
  }
}
