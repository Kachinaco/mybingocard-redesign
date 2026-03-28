"use client";

import { useState } from "react";
import { trackClientActivity } from "@/lib/activity-client";

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      trackClientActivity("manage_subscription_clicked");
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe billing portal
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open billing portal");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error opening billing portal:", error);
      alert("Failed to open billing portal. Please try again.");
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleManageSubscription}
      disabled={loading}
      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Loading..." : "Manage Subscription"}
    </button>
  );
}
