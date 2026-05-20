"use client";

import { signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function MagicLinkContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    const token = searchParams.get("token") || "";
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    if (!token) {
      setMessage("This magic link is missing its sign-in token.");
      return;
    }

    let cancelled = false;
    signIn("magic-link", { token, callbackUrl, redirect: false })
      .then((result) => {
        if (cancelled) return;
        if (result?.error) {
          setMessage("This magic link is invalid or expired. Please request a new one.");
          return;
        }
        window.location.href = callbackUrl;
      })
      .catch(() => {
        if (!cancelled) setMessage("Could not sign you in. Please request a new magic link.");
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
        <h1 className="text-2xl font-bold text-slate-900">Magic link</h1>
        <p className="mt-3 text-slate-600">{message}</p>
      </div>
    </main>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Signing you in...</div>}>
      <MagicLinkContent />
    </Suspense>
  );
}
