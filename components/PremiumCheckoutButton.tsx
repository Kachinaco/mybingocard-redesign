"use client";

import { useState } from "react";
import { redirectToCheckout } from "@/lib/upgrade";
import { trackClientActivity } from "@/lib/activity-client";

interface PremiumCheckoutButtonProps {
  className?: string;
  successPath?: string;
  source: string;
  label?: string;
}

export default function PremiumCheckoutButton({
  className,
  successPath,
  source,
  label = "Continue",
}: PremiumCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    try {
      trackClientActivity("plan_selected", {
        plan: "premium",
        price: 0,
        source,
      });

      await redirectToCheckout({
        label: "Activate premium tools",
        successPath,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        className ||
        "inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg transition-all"
      }
    >
      {loading ? "Loading..." : label}
    </button>
  );
}
