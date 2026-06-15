"use client";

import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { registerCheckoutOpener } from "@/lib/upgrade";
import { trackClientActivity } from "@/lib/activity-client";

interface CheckoutContextType {
  openCheckout: (options?: {
    priceId?: string;
    purchaseType?: string;
    batchCount?: number;
    cardId?: string;
    emails?: string[];
    label?: string;
    returnPath?: string;
  }) => Promise<void>;
}

const CheckoutContext = createContext<CheckoutContextType>({
  openCheckout: async () => {},
});

export function useCheckout() {
  return useContext(CheckoutContext);
}

function freeAccessRedirect(returnPath?: string) {
  if (returnPath && returnPath.startsWith("/") && !returnPath.startsWith("//")) {
    return returnPath;
  }
  return "/dashboard?success=true&free=1";
}

export function CheckoutModalProvider({ children }: { children: ReactNode }) {
  const openCheckout = useCallback(async (options?: {
    priceId?: string;
    purchaseType?: string;
    batchCount?: number;
    cardId?: string;
    emails?: string[];
    label?: string;
    returnPath?: string;
  }) => {
    trackClientActivity("checkout_disabled_free_for_all", {
      purchaseType: options?.purchaseType || "subscription",
      batchCount: options?.batchCount,
      source: "checkout_modal_provider",
    });
    window.location.href = freeAccessRedirect(options?.returnPath);
  }, []);

  useEffect(() => {
    registerCheckoutOpener(openCheckout);
    return () => registerCheckoutOpener(null);
  }, [openCheckout]);

  return (
    <CheckoutContext.Provider value={{ openCheckout }}>
      {children}
    </CheckoutContext.Provider>
  );
}
