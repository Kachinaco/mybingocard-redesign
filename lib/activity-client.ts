"use client";

export interface ClientActivityOptions {
  pathname?: string;
  sessionId?: string;
  anonymousId?: string;
  keepalive?: boolean;
}

const SESSION_KEY = "tr_session_id";
const ANON_KEY = "tr_anonymous_id";

export function getClientSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const value = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(SESSION_KEY, value);
  return value;
}

export function getAnonymousId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.localStorage.getItem(ANON_KEY);
  if (existing) {
    return existing;
  }

  const value = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(ANON_KEY, value);
  return value;
}

export function trackClientActivity(
  event: string,
  metadata?: Record<string, unknown>,
  options?: ClientActivityOptions
): void {
  if (typeof window === "undefined" || !event) {
    return;
  }

  const payload = JSON.stringify({
    event,
    pathname: options?.pathname || `${window.location.pathname}${window.location.search}`,
    sessionId: options?.sessionId || getClientSessionId(),
    anonymousId: options?.anonymousId || getAnonymousId(),
    metadata: metadata || {},
  });

  const keepalive = options?.keepalive !== false;

  if (keepalive && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    try {
      const blob = new Blob([payload], { type: "application/json" });
      const queued = navigator.sendBeacon("/api/activity", blob);
      if (queued) {
        return;
      }
      // sendBeacon returned false (browser rejected it) — fall through to fetch.
    } catch {
      // Fallback to fetch below.
    }
  }

  fetch("/api/activity", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    keepalive,
  }).catch(() => {
    // Activity tracking should never block product flows.
  });
}
