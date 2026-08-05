"use client";

import { useState } from "react";
import { trackClientActivity } from "@/lib/activity-client";

interface CopyShareLinkButtonProps {
  linkId: string;
}

export default function CopyShareLinkButton({
  linkId,
}: CopyShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/play/${linkId}`
        : `/play/${linkId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackClientActivity("share_link_copied", {
        linkId,
        source: "share_links_dashboard",
      });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers — keep the textarea off-screen so it never flashes.
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        trackClientActivity("share_link_copied", {
          linkId,
          source: "share_links_dashboard_fallback",
        });
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // Ignore
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2 shrink-0">
      <code className="text-xs font-mono text-[#6b6459] truncate max-w-[260px] rounded-lg bg-[#fff7ed] px-2 py-1">
        /play/{linkId}
      </code>
      <span
        aria-live="polite"
        className="sr-only"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {copied ? "Link copied to clipboard" : ""}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          copied
            ? "bg-[#2ec4b6]/10 text-[#2ec4b6] border border-[#2ec4b6]/15"
            : "bg-[#fff7ed] text-[#33312e] border border-[#a39a88] hover:bg-[#a39a88]"
        }`}
      >
        {copied ? (
          <>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy link
          </>
        )}
      </button>
      <a
        href={`/play/${linkId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#a39a88] bg-white px-3 py-1.5 text-xs font-semibold text-[#33312e] transition-colors hover:bg-[#fff7ed]"
      >
        Open
      </a>
    </div>
  );
}
