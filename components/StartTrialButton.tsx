"use client";

import { useState } from "react";
import { redirectToCheckout } from "@/lib/upgrade";
import { trackClientActivity } from "@/lib/activity-client";

interface StartTrialButtonProps {
  className?: string;
  successPath?: string;
  source: string;
  label?: string;
}

export default function StartTrialButton({
  className,
  successPath = "/create?trial=started",
  source,
  label = "Start Trial",
}: StartTrialButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    try {
      trackClientActivity("plan_selected", {
        plan: "trial",
        price: 0,
        source,
      });

      await redirectToCheckout({
        purchaseType: "trial",
        label: "7-day free trial — then $4.99/mo. Cancel anytime.",
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
