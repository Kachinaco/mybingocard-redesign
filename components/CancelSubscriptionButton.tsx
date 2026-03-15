"use client";

import { useState } from "react";
import CancelFlowModal from "./CancelFlowModal";

export default function CancelSubscriptionButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-sm text-slate-500 hover:text-red-600 transition-colors underline"
      >
        Cancel subscription
      </button>
      <CancelFlowModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
