"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const ANON_KEY = "tr_anonymous_id";

/**
 * Reads UTM params and anonymousId stored in localStorage and sends them to the
 * server to be saved on the user record.
 * Safe to include on any authenticated page — runs once and clears itself.
 */
export default function UtmFlusher() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    const stored = localStorage.getItem("utm_params");
    const anonymousId = localStorage.getItem(ANON_KEY);

    // Flush device info for OAuth/magic-link signups (runs once, flag prevents repeats)
    if (!localStorage.getItem("device_info_flushed")) {
      fetch("/api/user/update-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAgent: navigator.userAgent,
          language: navigator.language,
        }),
      })
        .then((res) => {
          if (res.ok) localStorage.setItem("device_info_flushed", "1");
        })
        .catch(() => {});
    }

    // Nothing to flush
    if (!stored && !anonymousId) return;

    try {
      const params = stored ? JSON.parse(stored) : {};
      if (params && typeof params !== "object") {
        localStorage.removeItem("utm_params");
        return;
      }

      const payload = {
        ...params,
        ...(anonymousId ? { anonymousId } : {}),
      };

      if (Object.keys(payload).length === 0) {
        localStorage.removeItem("utm_params");
        return;
      }

      fetch("/api/user/update-utm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((response) => {
          if (response.ok) {
            localStorage.removeItem("utm_params");
            // Don't remove anonymousId — it's still needed for activity tracking.
            // It's written to the user record once; the endpoint is idempotent.
          }
        })
        .catch(() => {});
    } catch {
      localStorage.removeItem("utm_params");
    }
  }, [status]);

  return null;
}
