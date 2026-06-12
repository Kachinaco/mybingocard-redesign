"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  getBrowserStorageItem,
  setBrowserStorageItem,
} from "@/lib/browser-storage";

declare global {
  interface Window {
    townrankerVisitor?: {
      anonymousId?: string;
      sessionId?: string;
      visitorId?: string;
      landingUrl?: string;
      referrer?: string;
    };
    townrankerTrack?: (name: string, metadata?: Record<string, unknown>) => void;
    trackerLite?: {
      track?: (event: string, metadata?: Record<string, unknown>) => void;
      identify?: (idOrMeta: string | Record<string, unknown>, maybeMeta?: Record<string, unknown>) => void;
      setVisitorId?: (idOrMeta: string | Record<string, unknown>, maybeMeta?: Record<string, unknown>) => void;
    };
  }
}

function getCentralAnonymousId(): string {
  try {
    return window.townrankerVisitor?.anonymousId || getBrowserStorageItem("localStorage", "_tr_anon") || "";
  } catch {
    return window.townrankerVisitor?.anonymousId || "";
  }
}

function getCentralSessionId(): string {
  try {
    return window.townrankerVisitor?.sessionId || getBrowserStorageItem("sessionStorage", "_tr_sess") || "";
  } catch {
    return window.townrankerVisitor?.sessionId || "";
  }
}

function getStorageItem(name: "localStorage" | "sessionStorage", key: string): string {
  try {
    return getBrowserStorageItem(name, key);
  } catch {
    return "";
  }
}

function setSessionItem(key: string, value: string) {
  setBrowserStorageItem("sessionStorage", key, value);
}

function safeDocumentReferrer(): string {
  try {
    return document.referrer || "";
  } catch {
    return "";
  }
}

function safeCurrentUrl(): string {
  try {
    return window.location.href || "";
  } catch {
    return "";
  }
}

function identifyTrackerLite(userId: string, anonymousId: string, displayName: string) {
  const metadata = {
    source: "mybingocard_login",
    userId,
    visitorId: userId,
    visitor_id: userId,
    anonymousId,
    displayName,
    profileName: displayName,
    name: displayName,
  };

  if (typeof window.trackerLite?.identify === "function") {
    window.trackerLite.identify(userId, metadata);
    return;
  }

  if (typeof window.trackerLite?.setVisitorId === "function") {
    window.trackerLite.setVisitorId(userId, metadata);
    return;
  }

  window.townrankerTrack?.("authenticated_identity_stitched", metadata);
}

export default function AnalyticsIdentityBridge() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || !session.user.email) {
      return;
    }

    const userId = session.user.id;
    const displayName = (session.user.name || session.user.email.split("@")[0] || "MyBingoCard user").trim();
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

      const trackerDedupeKey = `mybingo_tracker_lite_identified:${userId}:${anonymousId}`;
      if (!getStorageItem("sessionStorage", trackerDedupeKey) || window.townrankerVisitor?.visitorId !== userId) {
        identifyTrackerLite(userId, anonymousId, displayName);
        setSessionItem(trackerDedupeKey, "1");
      }

      const dedupeKey = `mybingo_analytics_identified:${userId}:${anonymousId}`;
      if (getStorageItem("sessionStorage", dedupeKey)) return;

      const payload = {
        anonymousId,
        sessionId: getCentralSessionId(),
        landingUrl:
          window.townrankerVisitor?.landingUrl ||
          getStorageItem("sessionStorage", "_tr_landing_url") ||
          "",
        referrer: window.townrankerVisitor?.referrer || safeDocumentReferrer(),
        currentUrl: safeCurrentUrl(),
        legacyAnonymousId: getStorageItem("localStorage", "tr_anonymous_id"),
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
          window.townrankerTrack?.("authenticated_identity_confirmed", {
            source: "mybingocard_login",
            userId,
            visitorId: userId,
            visitor_id: userId,
            displayName,
            profileName: displayName,
            name: displayName,
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
