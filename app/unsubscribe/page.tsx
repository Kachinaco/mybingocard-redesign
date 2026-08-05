"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleUnsubscribe() {
    setStatus("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: decodeURIComponent(email) }),
      });
      if (res.ok) setStatus("done");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff7ed] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#a39a88] p-8 text-center">
        <h1 className="text-2xl font-bold text-[#33312e] mb-2">Unsubscribe</h1>

        {status === "done" ? (
          <>
            <p className="text-[#33312e] mb-4">
              You have been unsubscribed from MyBingoCard marketing emails.
            </p>
            <p className="text-sm text-[#6b6459]">
              You will still receive essential account emails (password resets, billing).
            </p>
          </>
        ) : (
          <>
            <p className="text-[#33312e] mb-6">
              Unsubscribe <strong>{decodeURIComponent(email)}</strong> from
              MyBingoCard marketing and engagement emails?
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={status === "loading"}
              className="px-6 py-3 bg-[#7c5cff] text-white font-semibold rounded-xl hover:bg-[#7c5cff] disabled:opacity-50 transition-colors"
            >
              {status === "loading" ? "Processing..." : "Unsubscribe"}
            </button>
            {status === "error" && (
              <p className="mt-4 text-[#ff5d8f] text-sm">
                Something went wrong. Please try again or email support@mybingocard.com.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fff7ed]">
          <p className="text-[#6b6459]">Loading...</p>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
