"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

declare global {
  interface Window {
    townrankerVisitor?: {
      anonymousId?: string;
      sessionId?: string;
      landingUrl?: string;
      referrer?: string;
    };
    townrankerTrack?: (name: string, metadata?: Record<string, unknown>) => void;
  }
}

function getCentralAnonymousId(): string {
  try {
    return window.townrankerVisitor?.anonymousId || localStorage.getItem("_tr_anon") || "";
  } catch {
    return window.townrankerVisitor?.anonymousId || "";
  }
}

function getCentralSessionId(): string {
  try {
    return window.townrankerVisitor?.sessionId || sessionStorage.getItem("_tr_sess") || "";
  } catch {
    return window.townrankerVisitor?.sessionId || "";
  }
}

function getStorageItem(storage: Storage, key: string): string {
  try {
    return storage.getItem(key) || "";
  } catch {
    return "";
  }
}

function setSessionItem(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}

export default function AnalyticsIdentityBridge() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || !session.user.email) {
      return;
    }

    const userId = session.user.id;
    let cancelled = false;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const identify = () => {
      if (cancelled) return;
      attempts += 1;

      const anonymousId = getCentralAnonymousId();
      if (!anonymousId) {
        if (attempts < 8) retryTimer = setTimeout(identify, 500);
        return;
      }

      const dedupeKey = `mybingo_analytics_identified:${userId}:${anonymousId}`;
      if (getStorageItem(sessionStorage, dedupeKey)) return;

      const payload = {
        anonymousId,
        sessionId: getCentralSessionId(),
        landingUrl:
          window.townrankerVisitor?.landingUrl ||
          getStorageItem(sessionStorage, "_tr_landing_url") ||
          "",
        referrer: window.townrankerVisitor?.referrer || document.referrer || "",
        currentUrl: window.location.href,
        legacyAnonymousId: getStorageItem(localStorage, "tr_anonymous_id"),
      };

      fetch("/api/analytics/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then((response) => {
          if (!response.ok) return;
          setSessionItem(dedupeKey, "1");
          window.townrankerTrack?.("authenticated_identity_stitched", {
            source: "mybingocard_login",
          });
        })
        .catch(() => {});
    };

    identify();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [session, status]);

  return null;
}
