"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Reads UTM params stored in localStorage (set on the signup page before Google OAuth redirect)
 * and sends them to the server to be saved on the user record.
 * Safe to include on any authenticated page — runs once and clears itself.
 */
export default function UtmFlusher() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    const stored = localStorage.getItem("utm_params");
    if (!stored) return;

    try {
      const params = JSON.parse(stored);
      if (!params || typeof params !== "object" || Object.keys(params).length === 0) {
        localStorage.removeItem("utm_params");
        return;
      }

      fetch("/api/user/update-utm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
        .then((response) => {
          if (response.ok) {
            localStorage.removeItem("utm_params");
          }
        })
        .catch(() => {});
    } catch {
      localStorage.removeItem("utm_params");
    }
  }, [status]);

  return null;
}
