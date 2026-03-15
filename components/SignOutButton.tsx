"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { trackClientActivity } from "@/lib/activity-client";

export default function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      trackClientActivity("sign_out_clicked", undefined, { keepalive: true });
      await signOut({ callbackUrl: "/" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors px-3 py-2 disabled:opacity-60"
    >
      {isLoading ? "Signing Out..." : "Sign Out"}
    </button>
  );
}
