"use client";

import { useState } from "react";
import ShareBatchModal from "./ShareBatchModal";

interface ShareBatchButtonProps {
  batchId: string;
  cardCount: number;
  batchTitle: string;
  variant?: "primary" | "subtle";
  className?: string;
}

export default function ShareBatchButton({
  batchId,
  cardCount,
  batchTitle,
  variant = "primary",
  className = "",
}: ShareBatchButtonProps) {
  const [open, setOpen] = useState(false);

  const baseClasses =
    "group relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors";

  const variantClasses =
    variant === "primary"
      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-200"
      : "bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${baseClasses} ${variantClasses} ${className}`}
        aria-label={`Create group invite for ${batchTitle}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        <span>Create Group Invite</span>

        {/* Tooltip */}
        <span
          className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-20"
          role="tooltip"
        >
          One link for your group chat. Starts at $0.50 for up to 5 cards.
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      </button>

      {open && (
        <ShareBatchModal
          batchId={batchId}
          cardCount={cardCount}
          batchTitle={batchTitle}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
