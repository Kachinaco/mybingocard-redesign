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
  if (typeof window !== "undefined") {
    window.location.href = options.successPath || "/dashboard?success=true&free=1";
  }
}
