"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";

export default function ImpersonationBanner() {
  const { data: session, status } = useSession();
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const impersonation = (session as typeof session & {
    impersonation?: {
      active: boolean;
      targetUserId: string;
      targetEmail: string;
      targetName?: string | null;
    };
    actor?: { email?: string | null };
  })?.impersonation;
  const actorEmail = (session as typeof session & {
    actor?: { email?: string | null };
  })?.actor?.email;

  if (status !== "authenticated" || !impersonation?.active) {
    return null;
  }

  const stopImpersonation = async () => {
    setStopping(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to stop impersonation");
      }

      window.location.href =
        data.redirectTo || `/admin/users/${impersonation.targetUserId}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to stop impersonation"
      );
      setStopping(false);
    }
  };

  return (
    <div className="border-b border-amber-300 bg-amber-100 text-amber-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div>
          <div className="font-semibold">
            Viewing MyBingoCard as{" "}
            {impersonation.targetName || impersonation.targetEmail}
          </div>
          <div className="text-amber-800">
            Admin: {actorEmail || "unknown"}{" "}
            <span className="mx-1">•</span>
            Target: {impersonation.targetEmail}
          </div>
          {error ? <div className="mt-1 text-red-700">{error}</div> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/users/${impersonation.targetUserId}`}
            className="rounded-md border border-amber-400 px-3 py-1.5 font-medium text-amber-900 transition-colors hover:bg-amber-200"
          >
            Open Admin Record
          </Link>
          <button
            type="button"
            onClick={stopImpersonation}
            disabled={stopping}
            className="rounded-md bg-amber-900 px-3 py-1.5 font-medium text-white transition-colors hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {stopping ? "Stopping..." : "Stop Impersonating"}
          </button>
        </div>
      </div>
    </div>
  );
}
