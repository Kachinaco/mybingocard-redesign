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
        className="text-sm text-[#6b6459] hover:text-[#ff5d8f] transition-colors underline"
      >
        Cancel subscription
      </button>
      <CancelFlowModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
