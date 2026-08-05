"use client";

import type { ReactNode } from "react";
import { redirectToCheckout } from "@/lib/upgrade";
import { useState } from "react";

export default function UpgradeButton({ className, children }: { className?: string; children?: ReactNode }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await redirectToCheckout();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className || "inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-[#7c5cff] to-[#7c5cff] text-white rounded-xl hover:shadow-lg hover:shadow-[#7c5cff] transition-all font-semibold text-sm"}
    >
      {loading ? "Redirecting..." : (children || "Upgrade Now")}
    </button>
  );
}
