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
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-mono transition-all cursor-pointer flex items-center gap-2"
      >
        mybingocard.com/r/{code}
        <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      <span className={`text-xs text-white/90 transition-opacity ${copied ? 'opacity-100' : 'opacity-0'}`}>
        Copied!
      </span>
    </div>
  );
}
