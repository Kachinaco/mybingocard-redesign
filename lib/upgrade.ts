export interface CheckoutOptions {
  successPath?: string;
  cancelPath?: string;
}

type CheckoutInvocation = CheckoutOptions | Pick<Event, "preventDefault">;

function isEventLike(value: CheckoutInvocation | undefined): value is Pick<Event, "preventDefault"> {
  return Boolean(value && typeof value === "object" && "preventDefault" in value);
}

export async function redirectToCheckout(invocation?: CheckoutInvocation): Promise<void> {
  if (isEventLike(invocation)) {
    invocation.preventDefault();
  }

  const options = isEventLike(invocation) ? {} : (invocation ?? {});
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID;
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
