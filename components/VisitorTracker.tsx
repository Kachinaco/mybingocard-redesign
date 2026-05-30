"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ATTRIBUTION_COOKIE_NAME } from "@/lib/attribution";
import { trackClientActivity } from "@/lib/activity-client";
import {
  getBrowserStorageItem,
  setBrowserStorageItem,
} from "@/lib/browser-storage";
import {
  getSessionStats,
  updateSessionStats,
  hasCoreAction,
  hadErrors,
} from "@/lib/session-store";

type Metrics = {
  clicks: number;
  mouseMovements: number;
  formInteractions: number;
  maxScrollDepth: number;
};

type ClickRecord = {
  x: number;
  y: number;
  time: number;
};

const INTERACTIVE_SELECTORS = "a, button, input, select, textarea, [role='button'], [onclick], [tabindex]";
const FORM_FIELD_SELECTOR = "input, select, textarea";

type FormFieldState = {
  focusedAt: number;
  changes: number;
  initialLength: number | null;
};

let memorySessionId: string | null = null;
let memorySessionStart: number | null = null;
let memoryPageCount = 0;

function safeString(read: () => unknown, fallback = ""): string {
  try {
    const value = read();
    return typeof value === "string" ? value : fallback;
  } catch {
    return fallback;
  }
}

function safeNumber(read: () => unknown, fallback = 0): number {
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

function currentPage(): string {
  return safeString(() => `${window.location.pathname}${window.location.search}`);
}

function currentHostname(): string {
  return safeString(() => window.location.hostname);
}

function documentTitle(): string {
  return safeString(() => document.title);
}

function documentReferrer(): string {
  return safeString(() => document.referrer);
}

function navigatorString(key: "userAgent" | "language"): string {
  return safeString(() => navigator[key]);
}

type BotSignalDocument = Document & {
  __webdriver_evaluate?: unknown;
  __selenium_evaluate?: unknown;
  __webdriver_script_fn?: unknown;
  __fxdriver_evaluate?: unknown;
};

type BotSignalWindow = Window & {
  __webdriver_script_fn?: unknown;
  __nightmare?: unknown;
  callPhantom?: unknown;
  _phantom?: unknown;
  phantom?: unknown;
};

function getBotSignals(
  metrics: Metrics,
  startedAt: number,
  firstInteractionAt: number | null
): Record<string, unknown> {
  const ua = navigatorString("userAgent").toLowerCase();
  const platform = safeString(() => navigator.platform).toLowerCase();
  const outerWidth = safeNumber(() => window.outerWidth);
  const outerHeight = safeNumber(() => window.outerHeight);
  const innerWidth = safeNumber(() => window.innerWidth);
  const innerHeight = safeNumber(() => window.innerHeight);

  const platformMismatch =
    ((ua.includes("iphone") || ua.includes("ipad")) && !/(iphone|ipad|mac)/.test(platform)) ||
    (ua.includes("android") && !/(linux|android)/.test(platform)) ||
    (ua.includes("windows") && !platform.includes("win"));

  return {
    webdriver: safeBoolean(() => (navigator as Navigator & { webdriver?: boolean }).webdriver),
    automationGlobals: safeBoolean(() => {
      const doc = document as BotSignalDocument;
      const win = window as BotSignalWindow;
      return Boolean(
        doc.__webdriver_evaluate ||
          doc.__selenium_evaluate ||
          doc.__webdriver_script_fn ||
          doc.__fxdriver_evaluate ||
          win.__webdriver_script_fn ||
          win.__nightmare ||
          win.callPhantom ||
          win._phantom ||
          win.phantom
      );
    }),
    platformMismatch,
    outerEqualsInner: outerWidth > 0 && outerHeight > 0 && outerWidth === innerWidth && outerHeight === innerHeight,
    plugins: safeNumber(() => navigator.plugins.length),
    languages: safeNumber(() => navigator.languages.length),
    hardwareConcurrency: safeNumber(() => navigator.hardwareConcurrency),
    maxTouchPoints: safeNumber(() => navigator.maxTouchPoints),
    hasScroll: metrics.maxScrollDepth > 0,
    hasClicks: metrics.clicks > 0,
    mouseMovements: metrics.mouseMovements,
    formInteractions: metrics.formInteractions,
    timeToFirstInteraction: firstInteractionAt ? Math.max(0, firstInteractionAt - startedAt) : 0,
  };
}

function asElement(target: EventTarget | null): Element | null {
  try {
    return target instanceof Element ? target : null;
  } catch {
    return null;
  }
}

function getClickTargetInfo(el: Element): Record<string, string> {
  const tag = safeString(() => el.tagName.toLowerCase());
  const text = safeString(() => el.textContent).trim().slice(0, 50);
  const dataTrack = safeString(() => el.closest("[data-track]")?.getAttribute("data-track") || "");
  const id = safeString(() => (el as HTMLElement).id || (el.closest("[id]") as HTMLElement | null)?.id || "");
  const rawClassName = safeString(() => typeof el.className === "string" ? el.className : "");
  const className =
    rawClassName
      .split(/\s+/)
      .find(
        (c) =>
          c &&
          !c.startsWith("__") &&
          !/^[a-z]{1,3}[A-Z0-9]/.test(c) &&
          c.length > 2
      ) || "";

  return { tag, text, dataTrack, id, className };
}

function isInteractiveElement(el: Element): boolean {
  try {
    if (el.matches(INTERACTIVE_SELECTORS)) return true;
    let parent: Element | null = el.parentElement;
    while (parent) {
      if (parent.matches(INTERACTIVE_SELECTORS)) return true;
      parent = parent.parentElement;
    }
  } catch {
    return false;
  }
  return false;
}

function shouldTrackDeadClick(el: Element): boolean {
  let current: Element | null = el;
  let depth = 0;

  try {
    while (current && current !== document.body && depth < 4) {
      const className = typeof current.className === "string" ? current.className : "";
      if (
        current.hasAttribute("data-track") ||
        current.hasAttribute("data-dead-click") ||
        current.hasAttribute("aria-label") ||
        current.hasAttribute("role") ||
        current.hasAttribute("tabindex") ||
        /(^|\s)(cursor-pointer|[^\s]*hover:[^\s]*)($|\s)/.test(className)
      ) {
        return true;
      }

      current = current.parentElement;
      depth += 1;
    }
  } catch {
    return false;
  }

  return false;
}

function isSensitiveField(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): boolean {
  const type = el instanceof HTMLInputElement ? el.type : "";
  const combined = `${el.id || ""} ${el.name || ""} ${el.getAttribute("autocomplete") || ""}`.toLowerCase();
  return type === "password" || /(password|passcode|token|secret|card|cvc|cvv|ssn)/.test(combined);
}

function getFieldLength(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): number | null {
  if (isSensitiveField(el)) return null;
  try {
    if (el instanceof HTMLSelectElement) return el.selectedOptions.length;
    if (el instanceof HTMLInputElement && ["checkbox", "radio"].includes(el.type)) return null;
    return typeof el.value === "string" ? el.value.length : null;
  } catch {
    return null;
  }
}

function getFormFieldInfo(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): Record<string, unknown> {
  const form = (() => {
    try {
      return el.closest("form");
    } catch {
      return null;
    }
  })();
  const type = el instanceof HTMLInputElement ? el.type : safeString(() => el.tagName.toLowerCase());
  const rect = (() => {
    try {
      return el.getBoundingClientRect();
    } catch {
      return { left: 0, top: 0, width: 0, height: 0 };
    }
  })();

  return {
    tag: safeString(() => el.tagName.toLowerCase()),
    type,
    id: safeString(() => el.id),
    name: safeString(() => el.name),
    autocomplete: safeString(() => el.getAttribute("autocomplete") || ""),
    required: safeBoolean(() => el.required),
    disabled: safeBoolean(() => el.disabled),
    readOnly: "readOnly" in el ? safeBoolean(() => (el as HTMLInputElement | HTMLTextAreaElement).readOnly) : false,
    checked: el instanceof HTMLInputElement && ["checkbox", "radio"].includes(el.type) ? safeBoolean(() => el.checked) : null,
    value_length: getFieldLength(el),
    form_id: form?.id || "",
    form_name: form?.getAttribute("name") || "",
    page: currentPage(),
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function distance(a: ClickRecord, b: ClickRecord): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

const ATTRIBUTION_STORAGE_KEY = "utm_params";

function getSessionId(): string {
  const key = "tr_session_id";
  const existing = getBrowserStorageItem("sessionStorage", key);
  if (existing) return existing;

  const value = memorySessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  memorySessionId = value;
  setBrowserStorageItem("sessionStorage", key, value);
  return value;
}

function getSessionStartTime(): number {
  const key = "tr_session_start";
  const existing = getBrowserStorageItem("sessionStorage", key);
  if (existing) return parseInt(existing, 10);

  const now = memorySessionStart || Date.now();
  memorySessionStart = now;
  setBrowserStorageItem("sessionStorage", key, String(now));
  return now;
}

function classifySession(pageCount: number, durationSeconds: number): string {
  if (pageCount >= 5 && durationSeconds >= 300) return "power_user";
  if (pageCount >= 3 || durationSeconds >= 120) return "engaged";
  if (pageCount <= 1 && durationSeconds < 30) return "bounce";
  return "brief";
}

function fireSessionSummary(sessionId: string) {
  const pageCount = parseInt(getBrowserStorageItem("sessionStorage", "tr_page_count") || String(memoryPageCount || 1), 10);
  const sessionStart = getSessionStartTime();
  const durationSeconds = Math.max(0, Math.round((Date.now() - sessionStart) / 1000));
  const sessionType = classifySession(pageCount, durationSeconds);

  trackClientActivity(
    "session_summary",
    {
      session_type: sessionType,
      pages_viewed: pageCount,
      session_duration_seconds: durationSeconds,
      core_action_taken: hasCoreAction(),
      had_errors: hadErrors(),
    },
    { sessionId, keepalive: true }
  );
}

function detectReturningVisitor(sessionId: string) {
  const stats = getSessionStats();
  if (!stats) return;

  const { lastVisit, sessionCount } = stats;
  if (lastVisit) {
    const lastDate = new Date(lastVisit).getTime();
    const now = Date.now();
    const msSinceLast = now - lastDate;
    const daysSinceLast = Math.floor(msSinceLast / (1000 * 60 * 60 * 24));

    if (daysSinceLast >= 1) {
      trackClientActivity(
        "returning_visitor",
        {
          days_since_last_visit: daysSinceLast,
          total_sessions: sessionCount + 1,
          is_first_visit: false,
        },
        { sessionId }
      );
    }
  }

  updateSessionStats();
}

function incrementPageCount(): number {
  const key = "tr_page_count";
  const current = parseInt(getBrowserStorageItem("sessionStorage", key) || String(memoryPageCount || 0), 10) + 1;
  memoryPageCount = current;
  setBrowserStorageItem("sessionStorage", key, String(current));
  return current;
}

function getUtmParams(): Record<string, string> {
  const params = new URLSearchParams(safeString(() => window.location.search));
  return {
    source: params.get("utm_source") || "",
    medium: params.get("utm_medium") || "",
    campaign: params.get("utm_campaign") || "",
    term: params.get("utm_term") || "",
    content: params.get("utm_content") || "",
  };
}

function getAttributionFromLocation(): Record<string, string> {
  const params = new URLSearchParams(safeString(() => window.location.search));
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_term: params.get("utm_term") || "",
    utm_content: params.get("utm_content") || "",
  };
}

function readStoredAttribution(): Record<string, string> {
  try {
    const raw = getBrowserStorageItem("localStorage", ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getExternalReferrer(): string {
  const referrer = documentReferrer();
  if (!referrer) return "";

  try {
    const referrerUrl = new URL(referrer);
    if (referrerUrl.hostname === currentHostname()) {
      return "";
    }
    return referrer;
  } catch {
    return referrer;
  }
}

function persistAttribution() {
  const existing = readStoredAttribution();
  const next = { ...existing };
  const current = getAttributionFromLocation();

  Object.entries(current).forEach(([key, value]) => {
    if (value && !next[key]) {
      next[key] = value;
    }
  });

  const referrer = getExternalReferrer();
  if (referrer && !next.referrer) {
    next.referrer = referrer;
  }

  if (Object.keys(next).length > 0) {
    const serialized = JSON.stringify(next);
    setBrowserStorageItem("localStorage", ATTRIBUTION_STORAGE_KEY, serialized);
    try {
      document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(serialized)}; path=/; max-age=2592000; SameSite=Lax`;
    } catch {
      // Attribution cookies are best-effort only.
    }
  }
}

export default function VisitorTracker() {
  const pathname = usePathname();
  const metricsRef = useRef<Metrics>({
    clicks: 0,
    mouseMovements: 0,
    formInteractions: 0,
    maxScrollDepth: 0,
  });
  const startedAtRef = useRef<number>(Date.now());
  const firstInteractionAtRef = useRef<number | null>(null);
  const recentClicksRef = useRef<ClickRecord[]>([]);
  const tabHiddenAtRef = useRef<number | null>(null);
  const fieldStatesRef = useRef<Map<Element, FormFieldState>>(new Map());

  useEffect(() => {
    const sessionId = getSessionId();
    const recordInteraction = () => {
      if (firstInteractionAtRef.current === null) {
        firstInteractionAtRef.current = Date.now();
      }
    };

    const onClick = (event: MouseEvent) => {
      recordInteraction();
      metricsRef.current.clicks += 1;

      const target = asElement(event.target);
      if (!target) return;

      const info = getClickTargetInfo(target);
      const now = Date.now();
      const clickRecord: ClickRecord = { x: event.clientX, y: event.clientY, time: now };

      // --- Button / link / input click tracking ---
      if (isInteractiveElement(target)) {
        trackClientActivity(
          "button_clicked",
          {
            ...info,
            page: currentPage(),
            x: event.clientX,
            y: event.clientY,
          },
          { sessionId }
        );
      } else if (shouldTrackDeadClick(target)) {
        // --- Dead click detection (non-interactive element) ---
        trackClientActivity(
          "dead_click",
          {
            ...info,
            page: currentPage(),
            x: event.clientX,
            y: event.clientY,
          },
          { sessionId }
        );
      }

      // --- Rage click detection: 3+ clicks within 1s in ~30px radius ---
      recentClicksRef.current.push(clickRecord);
      // Prune clicks older than 1 second
      recentClicksRef.current = recentClicksRef.current.filter(
        (c) => now - c.time <= 1000
      );
      // Count clicks within 30px of the current click
      const nearby = recentClicksRef.current.filter(
        (c) => distance(c, clickRecord) <= 30
      );
      if (nearby.length >= 3) {
        trackClientActivity(
          "rage_click",
          {
            ...info,
            clickCount: nearby.length,
            page: currentPage(),
            x: event.clientX,
            y: event.clientY,
          },
          { sessionId }
        );
        // Clear to avoid firing repeatedly for the same burst
        recentClicksRef.current = [];
      }
    };

    let mouseThrottle = false;
    const onMouseMove = () => {
      if (!mouseThrottle) {
        recordInteraction();
        metricsRef.current.mouseMovements += 1;
        mouseThrottle = true;
        window.setTimeout(() => {
          mouseThrottle = false;
        }, 100);
      }
    };

    const onInput = (event: Event) => {
      recordInteraction();
      const target = asElement(event.target);
      if (target?.closest("form")) {
        metricsRef.current.formInteractions += 1;
      }
    };

    const onFieldFocus = (event: FocusEvent) => {
      recordInteraction();
      const target = asElement(event.target);
      if (!target?.matches(FORM_FIELD_SELECTOR)) return;

      const field = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      fieldStatesRef.current.set(field, {
        focusedAt: Date.now(),
        changes: 0,
        initialLength: getFieldLength(field),
      });
      trackClientActivity("form_field_focused", getFormFieldInfo(field), { sessionId });
    };

    const onFieldChange = (event: Event) => {
      const target = asElement(event.target);
      if (!target?.matches(FORM_FIELD_SELECTOR)) return;

      const field = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const current = fieldStatesRef.current.get(field);
      if (current) {
        current.changes += 1;
      }
      trackClientActivity(
        "form_field_changed",
        {
          ...getFormFieldInfo(field),
          changes: current?.changes || 1,
          initial_value_length: current?.initialLength ?? null,
        },
        { sessionId }
      );
    };

    const onFieldBlur = (event: FocusEvent) => {
      const target = asElement(event.target);
      if (!target?.matches(FORM_FIELD_SELECTOR)) return;

      const field = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const current = fieldStatesRef.current.get(field);
      const focusedForMs = current ? Date.now() - current.focusedAt : 0;
      trackClientActivity(
        "form_field_blurred",
        {
          ...getFormFieldInfo(field),
          changes: current?.changes || 0,
          initial_value_length: current?.initialLength ?? null,
          focused_for_ms: focusedForMs,
        },
        { sessionId }
      );
      fieldStatesRef.current.delete(field);
    };

    const onScroll = () => {
      const top = safeNumber(() => window.scrollY) || safeNumber(() => document.documentElement.scrollTop);
      const max =
        safeNumber(() => document.documentElement.scrollHeight) -
        safeNumber(() => document.documentElement.clientHeight);
      const depth = max > 0 ? Math.round((top / max) * 100) : 0;
      if (depth > metricsRef.current.maxScrollDepth) {
        metricsRef.current.maxScrollDepth = depth;
        if (depth > 0) recordInteraction();
      }
    };

    const body = (() => {
      try {
        return document.body;
      } catch {
        return null;
      }
    })();
    if (!body) return;

    body.addEventListener("click", onClick, { passive: true });
    body.addEventListener("focusin", onFieldFocus);
    body.addEventListener("change", onFieldChange, { passive: true });
    body.addEventListener("focusout", onFieldBlur);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("input", onInput, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      body.removeEventListener("click", onClick);
      body.removeEventListener("focusin", onFieldFocus);
      body.removeEventListener("change", onFieldChange);
      body.removeEventListener("focusout", onFieldBlur);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("input", onInput);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // One-time: detect returning visitor and initialize session start time
  useEffect(() => {
    const sessionId = getSessionId();
    getSessionStartTime();
    detectReturningVisitor(sessionId);
  }, []);

  useEffect(() => {
    persistAttribution();

    const sessionId = getSessionId();
    const sessionPageCount = incrementPageCount();

    startedAtRef.current = Date.now();
    metricsRef.current = {
      clicks: 0,
      mouseMovements: 0,
      formInteractions: 0,
      maxScrollDepth: 0,
    };
    firstInteractionAtRef.current = null;

    const send = (reason: string, extra?: Record<string, unknown>) => {
      const page = currentPage();
      const payload: Record<string, unknown> = {
        sessionId,
        sessionPageCount,
        domain: currentHostname(),
        page,
        pageTitle: documentTitle(),
        referrer: documentReferrer(),
        utm: getUtmParams(),
        userAgent: navigatorString("userAgent"),
        language: navigatorString("language"),
        screen: {
          width: safeNumber(() => window.screen.width),
          height: safeNumber(() => window.screen.height),
          colorDepth: safeNumber(() => window.screen.colorDepth),
        },
        viewport: {
          width: safeNumber(() => window.innerWidth),
          height: safeNumber(() => window.innerHeight),
        },
        timeOnPage: Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)),
        scrollDepth: metricsRef.current.maxScrollDepth,
        clicks: metricsRef.current.clicks,
        mouseMovements: metricsRef.current.mouseMovements,
        formInteractions: metricsRef.current.formInteractions,
        reason,
        timestamp: new Date().toISOString(),
        botSignals: getBotSignals(metricsRef.current, startedAtRef.current, firstInteractionAtRef.current),
        ...extra,
      };

      if (reason === "page_view") {
        trackClientActivity("page_view", payload, { sessionId });
      } else {
        trackClientActivity("page_engagement", payload, { sessionId, keepalive: true });
      }

      try {
        fetch("/api/track-visitor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {
          // Tracking errors are intentionally non-blocking.
        });
      } catch {
        // Tracking errors are intentionally non-blocking.
      }
    };

    const initialTimer = window.setTimeout(() => {
      send("page_view");
    }, 1200);

    // Track metrics at each heartbeat to detect stale tabs
    let lastHeartbeatClicks = 0;
    let lastHeartbeatMouseMovements = 0;

    const heartbeatTimer = window.setInterval(() => {
      const currentClicks = metricsRef.current.clicks;
      const currentMouse = metricsRef.current.mouseMovements;
      const isStale =
        currentClicks === lastHeartbeatClicks &&
        currentMouse === lastHeartbeatMouseMovements;

      lastHeartbeatClicks = currentClicks;
      lastHeartbeatMouseMovements = currentMouse;

      if (isStale) {
        send("heartbeat", { is_stale: true });
      } else {
        send("heartbeat");
      }
    }, 60000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        tabHiddenAtRef.current = Date.now();
        send("hidden");
      } else if (document.visibilityState === "visible") {
        // Tab returned — check how long it was away
        const hiddenAt = tabHiddenAtRef.current;
        if (hiddenAt !== null) {
          const awayMs = Date.now() - hiddenAt;
          const awaySeconds = Math.round(awayMs / 1000);
          tabHiddenAtRef.current = null;

          if (awaySeconds >= 30) {
            trackClientActivity(
              "tab_returned",
              {
                away_duration_seconds: awaySeconds,
                page: currentPage(),
              },
              { sessionId }
            );
          }
        }
      }
    };

    const onBeforeUnload = () => {
      send("beforeunload");
      fireSessionSummary(sessionId);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      send("route_change");
    };
  }, [pathname]);

  return null;
}
