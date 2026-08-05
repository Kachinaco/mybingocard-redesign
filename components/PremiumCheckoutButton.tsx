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
  label = "Upgrade",
}: PremiumCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    try {
      trackClientActivity("plan_selected", {
        plan: "premium",
        price: 7.99,
        source,
      });

      await redirectToCheckout({
        label: "Premium monthly, $7.99/mo",
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
        "inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-[#7c5cff] to-[#7c5cff] text-white text-sm font-semibold hover:shadow-lg transition-all"
      }
    >
      {loading ? "Loading..." : label}
    </button>
  );
}
