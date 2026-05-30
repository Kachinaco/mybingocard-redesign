"use client";

import {
  browserStorageAvailable,
  getBrowserStorageItem,
  setBrowserStorageItem,
} from "@/lib/browser-storage";
import { trackMappedMetaPixelEvent } from "@/lib/meta-pixel";

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
let memorySessionId: string | null = null;
let memoryAnonymousId: string | null = null;

function makeClientId(prefix: "sess" | "anon"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeString(read: () => unknown, fallback = ""): string {
  try {
    const value = read();
    return typeof value === "string" ? value : fallback;
  } catch {
    return fallback;
  }
}

function safeNumber(read: () => unknown, fallback: number | null = null): number | null {
  try {
    const value = read();
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function safeBoolean(read: () => unknown, fallback = false): boolean {
  try {
    return Boolean(read());
  } catch {
    return fallback;
  }
}

function safeArray(read: () => unknown): string[] {
  try {
    const value = read();
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function currentPath(): string {
  return safeString(() => `${window.location.pathname}${window.location.search}`);
}

export function getClientSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = getBrowserStorageItem("sessionStorage", SESSION_KEY);
  if (existing) {
    return existing;
  }

  const value = memorySessionId || makeClientId("sess");
  memorySessionId = value;
  setBrowserStorageItem("sessionStorage", SESSION_KEY, value);
  return value;
}

export function getAnonymousId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = getBrowserStorageItem("localStorage", ANON_KEY);
  if (existing) {
    return existing;
  }

  const value = memoryAnonymousId || makeClientId("anon");
  memoryAnonymousId = value;
  setBrowserStorageItem("localStorage", ANON_KEY, value);
  return value;
}

export function getClientContext(): Record<string, unknown> {
  if (typeof window === "undefined") {
    return {};
  }

  const nav = (() => {
    try {
      return typeof navigator !== "undefined" ? navigator : undefined;
    } catch {
      return undefined;
    }
  })();
  const connection = (() => {
    try {
      return nav && "connection" in nav
        ? (nav as Navigator & {
            connection?: {
              effectiveType?: string;
              downlink?: number;
              rtt?: number;
              saveData?: boolean;
            };
          }).connection
        : undefined;
    } catch {
      return undefined;
    }
  })();
  const visualViewport = (() => {
    try {
      return window.visualViewport;
    } catch {
      return undefined;
    }
  })();

  return {
    href: safeString(() => window.location.href),
    origin: safeString(() => window.location.origin),
    path: currentPath(),
    title: safeString(() => document.title),
    referrer: safeString(() => document.referrer),
    timestamp: new Date().toISOString(),
    timezone: safeString(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    language: safeString(() => nav?.language),
    languages: safeArray(() => nav?.languages ? Array.from(nav.languages) : []),
    platform: safeString(() => nav?.platform),
    cookieEnabled: safeBoolean(() => nav?.cookieEnabled),
    doNotTrack: safeString(() => nav?.doNotTrack),
    maxTouchPoints: safeNumber(() => nav?.maxTouchPoints, 0) || 0,
    hardwareConcurrency: safeNumber(() => nav?.hardwareConcurrency),
    deviceMemoryGb: safeNumber(() =>
      nav && "deviceMemory" in nav
        ? (nav as Navigator & { deviceMemory?: number }).deviceMemory
        : null
    ),
    connection: connection
      ? {
          effectiveType: safeString(() => connection.effectiveType),
          downlink: safeNumber(() => connection.downlink),
          rtt: safeNumber(() => connection.rtt),
          saveData: safeBoolean(() => connection.saveData),
        }
      : null,
    viewport: {
      width: safeNumber(() => window.innerWidth, 0) || 0,
      height: safeNumber(() => window.innerHeight, 0) || 0,
      visualWidth: safeNumber(() => visualViewport?.width),
      visualHeight: safeNumber(() => visualViewport?.height),
      scrollX: safeNumber(() => window.scrollX, 0) || 0,
      scrollY: safeNumber(() => window.scrollY, 0) || 0,
      devicePixelRatio: safeNumber(() => window.devicePixelRatio, 1) || 1,
    },
    screen: safeBoolean(() => typeof window.screen !== "undefined")
      ? {
          width: safeNumber(() => window.screen.width, 0) || 0,
          height: safeNumber(() => window.screen.height, 0) || 0,
          availWidth: safeNumber(() => window.screen.availWidth, 0) || 0,
          availHeight: safeNumber(() => window.screen.availHeight, 0) || 0,
          colorDepth: safeNumber(() => window.screen.colorDepth, 0) || 0,
          pixelDepth: safeNumber(() => window.screen.pixelDepth, 0) || 0,
          orientation: safeString(() => window.screen.orientation?.type),
        }
      : null,
    document: safeBoolean(() => typeof document !== "undefined")
      ? {
          visibilityState: safeString(() => document.visibilityState),
          hasFocus: safeBoolean(() => document.hasFocus()),
        }
      : null,
    storage: {
      localStorage: browserStorageAvailable("localStorage"),
      sessionStorage: browserStorageAvailable("sessionStorage"),
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
    pathname: options?.pathname || (typeof window !== "undefined" ? currentPath() : ""),
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

  let builtPayload: ClientActivityPayload;
  try {
    builtPayload = buildClientActivityPayload(event, metadata, options);
  } catch {
    return;
  }

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

  try {
    trackMappedMetaPixelEvent(event, builtPayload);
  } catch {
    // Marketing pixel forwarding must never block product flows.
  }

  let payload: string;
  try {
    payload = JSON.stringify(builtPayload);
  } catch {
    try {
      payload = JSON.stringify(buildClientActivityPayload(event, {}, options));
    } catch {
      return;
    }
  }

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

  try {
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
  } catch {
    // Activity tracking should never block product flows.
  }
}
