"use client";

import { getAnonymousId, getClientContext, getClientSessionId } from "@/lib/activity-client";
import { useEffect } from "react";

declare global {
  interface Window {
    __mbcUser?: { id?: string; email?: string };
    __mbcAddBreadcrumb?: (breadcrumb: {
      type: string;
      message: string;
      data?: Record<string, unknown>;
    }) => void;
    __mbcGetBreadcrumbs?: () => unknown[];
  }
}

type ErrorBreadcrumb = {
  type: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  href: string;
};

const BUILD_ID = process.env.NEXT_PUBLIC_APP_BUILD_ID || "dev";
const MAX_BREADCRUMBS = 20;
const breadcrumbs: ErrorBreadcrumb[] = [];

const SENSITIVE_KEY_RE = /(password|passcode|secret|token|authorization|cookie|session|csrf|card|cvc|cvv|ssn|email|phone)/i;

function clampText(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function sanitizeBreadcrumbData(value: unknown, depth = 0, key = ""): unknown {
  if (key && SENSITIVE_KEY_RE.test(key)) return "[redacted]";
  if (value === null || value === undefined) return value;
  if (depth > 2) return undefined;
  if (Array.isArray(value)) {
    return value
      .slice(0, 10)
      .map((item) => sanitizeBreadcrumbData(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  switch (typeof value) {
    case "string":
      return value.slice(0, 160);
    case "number":
    case "boolean":
      return value;
    case "object": {
      const result: Record<string, unknown> = {};
      for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
        const sanitized = sanitizeBreadcrumbData(childValue, depth + 1, childKey);
        if (sanitized !== undefined) result[childKey] = sanitized;
      }
      return result;
    }
    default:
      return String(value).slice(0, 160);
  }
}

function addBreadcrumb(input: {
  type: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  try {
    breadcrumbs.push({
      type: clampText(input.type, 40) || "event",
      message: clampText(input.message, 160) || "event",
      data: sanitizeBreadcrumbData(input.data || {}) as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      href: window.location.href,
    });
    if (breadcrumbs.length > MAX_BREADCRUMBS) {
      breadcrumbs.splice(0, breadcrumbs.length - MAX_BREADCRUMBS);
    }
  } catch {
    // Breadcrumb capture is best-effort only.
  }
}

function stableHash(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index++) {
    hash = ((hash << 5) + hash + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function normalizeFingerprintPart(value: unknown): string {
  return String(value || "")
    .replace(/[a-f0-9]{16,}/gi, "[hex]")
    .replace(/\b\d{4,}\b/g, "[num]")
    .slice(0, 300);
}

function topStackLine(stack: unknown): string {
  if (typeof stack !== "string") return "";
  return stack
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.includes("ErrorCapture")) || "";
}

function createFingerprint(payload: Record<string, unknown>): string {
  const basis = [
    payload.type,
    normalizeFingerprintPart(payload.message),
    normalizeFingerprintPart(payload.source),
    normalizeFingerprintPart(topStackLine(payload.stack)),
  ].join("|");
  return `client_${stableHash(basis)}`;
}

function safeGetSessionId(): string | null {
  try {
    return getClientSessionId();
  } catch {
    return null;
  }
}

function safeGetAnonymousId(): string | null {
  try {
    return getAnonymousId();
  } catch {
    return null;
  }
}

function safeGetClientContext(): Record<string, unknown> {
  try {
    return getClientContext();
  } catch {
    return {};
  }
}

function getUserInfo(): { userId: string | null; email: string | null } {
  // Check window variable first
  if (typeof window !== "undefined" && window.__mbcUser) {
    return {
      userId: window.__mbcUser.id || null,
      email: window.__mbcUser.email || null,
    };
  }
  // Check data attributes on <body>
  if (typeof document !== "undefined") {
    const body = document.body;
    return {
      userId: body.getAttribute("data-user-id") || null,
      email: body.getAttribute("data-user-email") || null,
    };
  }
  return { userId: null, email: null };
}

function sendError(payload: Record<string, unknown>) {
  try {
    const envelope = {
      ...payload,
      buildId: BUILD_ID,
      release: BUILD_ID,
      breadcrumbs: breadcrumbs.slice(-MAX_BREADCRUMBS),
      sessionId: safeGetSessionId(),
      anonymousId: safeGetAnonymousId(),
      clientContext: safeGetClientContext(),
    };
    const fingerprint = createFingerprint(envelope);
    fetch("/api/errors/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...envelope, fingerprint }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never throw from error handler
  }
}

// Known browser-extension and bot error patterns we can't fix
const IGNORE_PATTERNS = [
  /Object Not Found Matching Id/i,
  /Cannot assign to read only property 'pushState'/i,
  /removeChild.*not a child of this node/i,
  /ResizeObserver loop/i,
  /Loading chunk \d+ failed/i,
];

function isNoiseError(message: string): boolean {
  return IGNORE_PATTERNS.some((re) => re.test(message));
}

const STALE_BUILD_PATTERNS = [
  /ChunkLoadError/i,
  /Failed to load chunk/i,
  /Loading chunk .* failed/i,
  /failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
];

const THIRD_PARTY_RESOURCE_PATTERNS = [
  /^https:\/\/www\.googletagmanager\.com\//i,
  /^https:\/\/pagead2\.googlesyndication\.com\//i,
  /^https:\/\/analytics\.ahrefs\.com\//i,
  /^https:\/\/www\.google\.com\//i,
  /^https:\/\/www\.gstatic\.com\//i,
];

const STALE_BUILD_RECOVERY_KEY = "mbc_stale_build_recovered_at";
const STALE_BUILD_RECOVERY_WINDOW_MS = 30_000;

function isStaleBuildError(message: string): boolean {
  return STALE_BUILD_PATTERNS.some((re) => re.test(message));
}

function isNextStaticResource(src: string): boolean {
  try {
    const url = new URL(src, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith("/_next/static/");
  } catch {
    return src.startsWith("/_next/static/");
  }
}

function isThirdPartyNoiseResource(src: string): boolean {
  return THIRD_PARTY_RESOURCE_PATTERNS.some((re) => re.test(src));
}

function isStripeResource(src: string): boolean {
  return /^https:\/\/js\.stripe\.com\//i.test(src);
}

function isCheckoutRelevantPath(pathname: string): boolean {
  return /^\/(create|pricing|cards|checkout|api\/stripe)(\/|\?|$)/i.test(pathname);
}

function recoverFromStaleBuild() {
  try {
    const lastRecoveredAt = Number(sessionStorage.getItem(STALE_BUILD_RECOVERY_KEY) || "0");
    const now = Date.now();
    if (Number.isFinite(lastRecoveredAt) && now - lastRecoveredAt < STALE_BUILD_RECOVERY_WINDOW_MS) {
      return;
    }
    sessionStorage.setItem(STALE_BUILD_RECOVERY_KEY, String(now));
  } catch {
    // If sessionStorage is blocked, still try to recover the broken page once.
  }

  window.location.reload();
}

export default function ErrorCapture() {
  useEffect(() => {
    // Session-level dedup: track messages already sent
    const sent = new Set<string>();

    function isDuplicate(message: string): boolean {
      if (sent.has(message)) return true;
      sent.add(message);
      return false;
    }

    const previousAddBreadcrumb = window.__mbcAddBreadcrumb;
    const previousGetBreadcrumbs = window.__mbcGetBreadcrumbs;
    window.__mbcAddBreadcrumb = addBreadcrumb;
    window.__mbcGetBreadcrumbs = () => breadcrumbs.slice(-MAX_BREADCRUMBS);
    addBreadcrumb({ type: "navigation", message: "page_loaded", data: { href: window.location.href } });

    let currentHref = window.location.href;
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    function recordNavigation() {
      if (window.location.href === currentHref) return;
      currentHref = window.location.href;
      addBreadcrumb({ type: "navigation", message: "route_changed", data: { href: currentHref } });
    }

    window.history.pushState = function patchedPushState(...args) {
      const result = originalPushState.apply(this, args);
      recordNavigation();
      return result;
    };

    window.history.replaceState = function patchedReplaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      recordNavigation();
      return result;
    };

    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element
        ? event.target.closest("button,a,[role='button'],input[type='submit']")
        : null;
      if (!target) return;
      const tagName = target.tagName.toLowerCase();
      const label = clampText(target.textContent || target.getAttribute("aria-label") || target.getAttribute("title"), 80);
      addBreadcrumb({
        type: "ui",
        message: "click",
        data: {
          tagName,
          label,
          href: target instanceof HTMLAnchorElement ? target.href : null,
          id: target.id || null,
        },
      });
    }

    function onSubmit(event: SubmitEvent) {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form) return;
      addBreadcrumb({
        type: "ui",
        message: "form_submit",
        data: {
          id: form.id || null,
          name: form.getAttribute("name") || form.getAttribute("aria-label") || null,
          action: form.getAttribute("action") || null,
          method: form.getAttribute("method") || "get",
        },
      });
    }

    function onPopState() {
      recordNavigation();
    }

    function onVisibilityChange() {
      addBreadcrumb({
        type: "page",
        message: "visibility_changed",
        data: { visibilityState: document.visibilityState },
      });
    }

    function onError(event: ErrorEvent) {
      const message = event.message || "Unknown error";
      if (isStaleBuildError(message)) {
        recoverFromStaleBuild();
        return;
      }
      if (isDuplicate(message)) return;
      if (isNoiseError(message)) return;
      // Check the stack too for extension errors
      const stack = event.error?.stack || "";
      if (isStaleBuildError(stack)) {
        recoverFromStaleBuild();
        return;
      }
      if (isNoiseError(stack)) return;

      const user = getUserInfo();
      sendError({
        type: "uncaught_error",
        message: message.slice(0, 500),
        source: event.filename || null,
        lineno: event.lineno ?? null,
        colno: event.colno ?? null,
        stack: event.error?.stack ? String(event.error.stack).slice(0, 2000) : null,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        userId: user.userId,
        email: user.email,
      });
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection";

      if (isDuplicate(message)) return;
      if (isNoiseError(message)) return;

      const stack =
        reason instanceof Error && reason.stack
          ? String(reason.stack).slice(0, 2000)
          : null;

      const user = getUserInfo();
      sendError({
        type: "unhandled_rejection",
        message: message.slice(0, 500),
        source: null,
        lineno: null,
        colno: null,
        stack,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        userId: user.userId,
        email: user.email,
      });
    }

    // --- Resource load error tracking (capture phase) ---
    // Catches <img>, <script>, <link> elements that fail to load.
    const reportedResources = new Set<string>();

    function onResourceError(event: Event) {
      const el = event.target as HTMLElement | null;
      if (!el || !(el instanceof HTMLElement)) return;

      const tagName = el.tagName?.toLowerCase();
      if (tagName !== "img" && tagName !== "script" && tagName !== "link") return;

      const src =
        (el as HTMLImageElement | HTMLScriptElement).src ||
        (el as HTMLLinkElement).href ||
        "";

      if (!src || reportedResources.has(src)) return;
      reportedResources.add(src);
      if (isNextStaticResource(src)) {
        addBreadcrumb({
          type: "recovery",
          message: "stale_build_resource_reload",
          data: { tagName, source: src.slice(0, 160) },
        });
        recoverFromStaleBuild();
        return;
      }
      if (isThirdPartyNoiseResource(src)) return;
      if (isStripeResource(src) && !isCheckoutRelevantPath(window.location.pathname)) return;

      const user = getUserInfo();
      sendError({
        type: "resource_load_failed",
        message: `Failed to load ${tagName}: ${src.slice(0, 200)}`,
        source: src.slice(0, 500),
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        userId: user.userId,
        email: user.email,
      });
    }

    window.addEventListener("error", onError);
    window.addEventListener("error", onResourceError, true); // capture phase
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("click", onClick, true);
    window.addEventListener("submit", onSubmit, true);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.__mbcAddBreadcrumb = previousAddBreadcrumb;
      window.__mbcGetBreadcrumbs = previousGetBreadcrumbs;
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("error", onError);
      window.removeEventListener("error", onResourceError, true);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
