"use client";

import { useState } from "react";
import CancelFlowModal from "./CancelFlowModal";
import { trackClientActivity } from "@/lib/activity-client";

export default function CancelSubscriptionButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => {
          setShowModal(true);
          trackClientActivity("cancel_subscription_initiated");
        }}
        className="text-sm text-slate-500 hover:text-red-600 transition-colors underline"
      >
        Cancel subscription
      </button>
      <CancelFlowModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
