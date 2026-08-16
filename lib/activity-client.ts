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
    trackerLite?: {
      track?: (event: string, metadata?: Record<string, unknown>) => void;
      identify?: (
        idOrMeta: string | Record<string, unknown>,
        maybeMeta?: Record<string, unknown>
      ) => void;
      setVisitorId?: (
        idOrMeta: string | Record<string, unknown>,
        maybeMeta?: Record<string, unknown>
      ) => void;
    };
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
let activityBackoffUntil = 0;
let activityFailureCount = 0;
const recentPageActivity = new Map<string, number>();
const PAGE_ACTIVITY_COALESCE_MS = 2000;
const ACTIVITY_REQUEST_TIMEOUT_MS = 2500;

function shouldCoalescePageActivity(event: string, pathname: string): boolean {
  if (event !== "page_view" && event !== "page_engagement") return false;

  const key = `${event}:${pathname}`;
  const now = Date.now();
  const previous = recentPageActivity.get(key) || 0;
  recentPageActivity.set(key, now);

  if (recentPageActivity.size > 100) {
    for (const [entryKey, recordedAt] of recentPageActivity) {
      if (now - recordedAt > PAGE_ACTIVITY_COALESCE_MS) {
        recentPageActivity.delete(entryKey);
      }
    }
  }

  return previous > 0 && now - previous < PAGE_ACTIVITY_COALESCE_MS;
}

function recordActivityFailure() {
  activityFailureCount = Math.min(activityFailureCount + 1, 4);
  const backoffMs = Math.min(1000 * (2 ** (activityFailureCount - 1)), 10000);
  activityBackoffUntil = Date.now() + backoffMs;
}

function recordActivitySuccess() {
  activityFailureCount = 0;
  activityBackoffUntil = 0;
}

const TRACKER_LITE_EVENT_MAP: Record<string, string> = {
  home_start_draft_clicked: "click",
  builder_save_clicked: "click",
  builder_continue_without_saving_clicked: "click",
  signup_google_clicked: "click",
  signup_apple_clicked: "click",
  signup_email_submitted: "signup",
  auth_error_shown: "form_error",
  password_reset_requested: "form_submit",
  auth_magic_link_requested: "form_submit",
  bingo_achieved: "conversion",
  upgrade_dismissed: "click",
  batch_tier_selected: "click",
  export_button_clicked: "click",
  batch_button_clicked: "click",
  batch_primary_clicked: "click",
  batch_pdf_export_started: "conversion",
  card_save_attempted: "click",
  card_save_blocked: "form_error",
  save_blocked_auth_required: "form_submit",
  oauth_signup_started: "signup",
  checkout_auto_started_after_auth: "conversion",
  checkout_loaded: "conversion",
  checkout_cancel_clicked: "click",
  premium_gate_keep_drafting_clicked: "click",
};

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

  if (shouldCoalescePageActivity(event, builtPayload.pathname)) {
    return;
  }

  if (Date.now() < activityBackoffUntil) {
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

  const trackerLiteEvent = TRACKER_LITE_EVENT_MAP[event];
  if (trackerLiteEvent) {
    try {
      window.trackerLite?.track?.(trackerLiteEvent, {
        ...(metadata || {}),
        productEventName: event,
        legacyEventName: event,
        activityPathname: builtPayload.pathname,
      });
    } catch {
      // Same-origin product analytics must never block product flows.
    }
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
      signal: AbortSignal.timeout(ACTIVITY_REQUEST_TIMEOUT_MS),
    }).then(recordActivitySuccess).catch(recordActivityFailure);
  } catch {
    recordActivityFailure();
  }
}
