"use client";

declare global {
  interface Window {
    __mbcAddBreadcrumb?: (breadcrumb: {
      type: string;
      message: string;
      data?: Record<string, unknown>;
    }) => void;
  }
}

export interface ClientActivityOptions {
  pathname?: string;
  sessionId?: string;
  anonymousId?: string;
  keepalive?: boolean;
}

export interface ClientActivityPayload {
  event: string;
  pathname: string;
  sessionId: string | null;
  anonymousId: string | null;
  metadata: Record<string, unknown>;
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

function storageAvailable(storage: Storage | undefined): boolean {
  if (!storage) return false;

  try {
    const key = "__tr_storage_test__";
    storage.setItem(key, key);
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getClientContext(): Record<string, unknown> {
  if (typeof window === "undefined") {
    return {};
  }

  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const connection = nav && "connection" in nav ? (nav as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  }).connection : undefined;
  const visualViewport = window.visualViewport;

  return {
    href: window.location.href,
    origin: window.location.origin,
    path: `${window.location.pathname}${window.location.search}`,
    title: typeof document !== "undefined" ? document.title : "",
    referrer: typeof document !== "undefined" ? document.referrer : "",
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    language: nav?.language || "",
    languages: nav?.languages ? Array.from(nav.languages) : [],
    platform: nav?.platform || "",
    cookieEnabled: Boolean(nav?.cookieEnabled),
    doNotTrack: nav?.doNotTrack || "",
    maxTouchPoints: nav?.maxTouchPoints || 0,
    hardwareConcurrency: nav?.hardwareConcurrency || null,
    deviceMemoryGb: "deviceMemory" in (nav || {}) ? (nav as Navigator & { deviceMemory?: number }).deviceMemory : null,
    connection: connection
      ? {
          effectiveType: connection.effectiveType || "",
          downlink: connection.downlink ?? null,
          rtt: connection.rtt ?? null,
          saveData: Boolean(connection.saveData),
        }
      : null,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      visualWidth: visualViewport?.width ?? null,
      visualHeight: visualViewport?.height ?? null,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
    screen: typeof window.screen !== "undefined"
      ? {
          width: window.screen.width,
          height: window.screen.height,
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight,
          colorDepth: window.screen.colorDepth,
          pixelDepth: window.screen.pixelDepth,
          orientation: window.screen.orientation?.type || "",
        }
      : null,
    document: typeof document !== "undefined"
      ? {
          visibilityState: document.visibilityState,
          hasFocus: document.hasFocus(),
        }
      : null,
    storage: {
      localStorage: storageAvailable(window.localStorage),
      sessionStorage: storageAvailable(window.sessionStorage),
    },
  };
}

export function buildClientActivityPayload(
  event: string,
  metadata?: Record<string, unknown>,
  options?: ClientActivityOptions
): ClientActivityPayload {
  return {
    event,
    pathname: options?.pathname || (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : ""),
    sessionId: options?.sessionId || getClientSessionId(),
    anonymousId: options?.anonymousId || getAnonymousId(),
    metadata: {
      ...(metadata || {}),
      client_context: getClientContext(),
    },
  };
}

export function trackClientActivity(
  event: string,
  metadata?: Record<string, unknown>,
  options?: ClientActivityOptions
): void {
  if (typeof window === "undefined" || !event) {
    return;
  }

  const builtPayload = buildClientActivityPayload(event, metadata, options);
  try {
    window.__mbcAddBreadcrumb?.({
      type: "activity",
      message: event,
      data: {
        pathname: builtPayload.pathname,
        source: metadata?.source,
        action: metadata?.action,
        context: metadata?.context,
        cardId: metadata?.cardId,
        roomCode: metadata?.roomCode,
      },
    });
  } catch {
    // Breadcrumbs are diagnostic only and must never block tracking.
  }

  const payload = JSON.stringify(builtPayload);

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
