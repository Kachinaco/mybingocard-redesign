"use client";

import { useState } from "react";

export default function CopyReferralCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://mybingocard.com/r/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex min-w-0 max-w-full items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="flex min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-mono transition-all hover:bg-white/30"
      >
        <span className="min-w-0 truncate">mybingocard.com/r/{code}</span>
        <svg className="w-4 h-4 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      <span className={`text-xs text-white/90 transition-opacity ${copied ? 'opacity-100' : 'opacity-0'}`}>
        Copied!
      </span>
    </div>
  );
}
