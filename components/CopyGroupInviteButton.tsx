"use client";

import { useMemo, useState } from "react";
import { trackClientActivity } from "@/lib/activity-client";

interface CopyGroupInviteButtonProps {
  inviteCode: string;
  batchId: string;
  batchTitle: string;
  totalLinks: number;
  pendingLinks: number;
  compact?: boolean;
}

function buildInviteUrl(inviteCode: string): string {
  if (typeof window === "undefined") return `/b/${inviteCode}`;
  return `${window.location.origin}/b/${inviteCode}`;
}

export default function CopyGroupInviteButton({
  inviteCode,
  batchId,
  batchTitle,
  totalLinks,
  pendingLinks,
  compact = false,
}: CopyGroupInviteButtonProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const inviteUrl = useMemo(() => buildInviteUrl(inviteCode), [inviteCode]);
  const disabled = pendingLinks <= 0;

  const trackPayload = {
    inviteCode,
    batchId,
    batchTitle,
    total_links: totalLinks,
    pending_links: pendingLinks,
    source: "share_links_dashboard_group_invite",
  };

  const handleCopy = async () => {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      trackClientActivity("share_group_invite_copied", trackPayload);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = inviteUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
        trackClientActivity("share_group_invite_copied", {
          ...trackPayload,
          fallback: true,
        });
      } catch {
        // Ignore copy failures; the visible URL is still available.
      }
      document.body.removeChild(textarea);
    }
  };

  const handleNativeShare = async () => {
    if (disabled || typeof navigator === "undefined" || !navigator.share) {
      await handleCopy();
      return;
    }

    try {
      await navigator.share({
        title: batchTitle,
        text: `Tap this link to get your bingo card:`,
        url: inviteUrl,
      });
      setShared(true);
      setTimeout(() => setShared(false), 1800);
      trackClientActivity("share_group_invite_shared", trackPayload);
    } catch {
      // Share sheet cancellation is normal. Do not show an error.
    }
  };

  return (
    <div className={`flex ${compact ? "flex-col" : "flex-col sm:flex-row sm:items-center"} gap-2`}>
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
          disabled
            ? "cursor-not-allowed border-[#a39a88] bg-[#fff7ed] text-[#6b6459]"
            : copied
              ? "border-[#2ec4b6]/15 bg-[#2ec4b6]/10 text-[#2ec4b6]"
              : "border-[#7c5cff]/15 bg-[#7c5cff]/10 text-[#7c5cff] hover:bg-[#7c5cff]/15"
        }`}
      >
        {copied ? (
          <>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 12h8m-8 5h5M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
            Copy group invite
          </>
        )}
      </button>
      <button
        type="button"
        onClick={handleNativeShare}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
          disabled
            ? "cursor-not-allowed border-[#a39a88] bg-[#fff7ed] text-[#6b6459]"
            : shared
              ? "border-[#2ec4b6]/15 bg-[#2ec4b6]/10 text-[#2ec4b6]"
              : "border-[#a39a88] bg-white text-[#33312e] hover:bg-[#fff7ed]"
        }`}
      >
        {shared ? (
          <>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Shared
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342A3 3 0 109 12c0 .482-.114.938-.316 1.342zm0 0l6.632 3.316m-6.632-6l6.632-3.316" />
            </svg>
            Share
          </>
        )}
      </button>
      <code className="max-w-[280px] truncate rounded bg-[#fff7ed] px-2 py-1 text-[11px] text-[#6b6459]">
        /b/{inviteCode}
      </code>
    </div>
  );
}
