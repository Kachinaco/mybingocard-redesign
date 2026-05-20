"use client";

import { getAnonymousId, getClientContext, getClientSessionId } from "@/lib/activity-client";
import { useEffect } from "react";

declare global {
  interface Window {
    __mbcGetBreadcrumbs?: () => unknown[];
  }
}

const BUILD_ID = process.env.NEXT_PUBLIC_APP_BUILD_ID || "dev";

function reportReactBoundaryError(error: Error & { digest?: string }) {
  try {
    fetch("/api/errors/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        type: "react_error_boundary",
        message: error.message || "React error boundary",
        stack: error.stack || null,
        source: "app/error.tsx",
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        buildId: BUILD_ID,
        release: BUILD_ID,
        fingerprint: `react_${error.digest || error.message || "boundary"}`.slice(0, 120),
        sessionId: getClientSessionId(),
        anonymousId: getAnonymousId(),
        clientContext: getClientContext(),
        breadcrumbs: window.__mbcGetBreadcrumbs?.() || [],
      }),
    }).catch(() => {});
  } catch {
    // Error reporting must never make the fallback page worse.
  }
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportReactBoundaryError(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-500">Something broke</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">This page hit an error.</h1>
        <p className="mt-3 text-sm text-slate-500">
          The issue was reported automatically. Try reloading the page once.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
