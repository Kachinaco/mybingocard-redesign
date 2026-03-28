"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __mbcUser?: { id?: string; email?: string };
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
    fetch("/api/errors/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never throw from error handler
  }
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

    function onError(event: ErrorEvent) {
      const message = event.message || "Unknown error";
      if (isDuplicate(message)) return;

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

      const user = getUserInfo();
      sendError({
        type: "resource_load_failed",
        element_type: tagName as "img" | "script" | "link",
        src: src.slice(0, 500),
        page: window.location.href,
        userAgent: navigator.userAgent,
        userId: user.userId,
        email: user.email,
      });
    }

    window.addEventListener("error", onError);
    window.addEventListener("error", onResourceError, true); // capture phase
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("error", onResourceError, true);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
