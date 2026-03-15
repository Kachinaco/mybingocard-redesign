"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ATTRIBUTION_COOKIE_NAME } from "@/lib/attribution";
import { trackClientActivity } from "@/lib/activity-client";

type Metrics = {
  clicks: number;
  mouseMovements: number;
  formInteractions: number;
  maxScrollDepth: number;
};

const ATTRIBUTION_STORAGE_KEY = "utm_params";

function getSessionId(): string {
  const key = "tr_session_id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const value = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(key, value);
  return value;
}

function incrementPageCount(): number {
  const key = "tr_page_count";
  const current = parseInt(window.sessionStorage.getItem(key) || "0", 10) + 1;
  window.sessionStorage.setItem(key, String(current));
  return current;
}

function getUtmParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source") || "",
    medium: params.get("utm_medium") || "",
    campaign: params.get("utm_campaign") || "",
    term: params.get("utm_term") || "",
    content: params.get("utm_content") || "",
  };
}

function getAttributionFromLocation(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
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
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getExternalReferrer(): string {
  if (!document.referrer) return "";

  try {
    const referrerUrl = new URL(document.referrer);
    if (referrerUrl.hostname === window.location.hostname) {
      return "";
    }
    return document.referrer;
  } catch {
    return document.referrer;
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
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
    document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=2592000; SameSite=Lax`;
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

  useEffect(() => {
    const onClick = () => {
      metricsRef.current.clicks += 1;
    };

    let mouseThrottle = false;
    const onMouseMove = () => {
      if (!mouseThrottle) {
        metricsRef.current.mouseMovements += 1;
        mouseThrottle = true;
        window.setTimeout(() => {
          mouseThrottle = false;
        }, 100);
      }
    };

    const onInput = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest("form")) {
        metricsRef.current.formInteractions += 1;
      }
    };

    const onScroll = () => {
      const top = window.scrollY || document.documentElement.scrollTop;
      const max =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const depth = max > 0 ? Math.round((top / max) * 100) : 0;
      if (depth > metricsRef.current.maxScrollDepth) {
        metricsRef.current.maxScrollDepth = depth;
      }
    };

    window.addEventListener("click", onClick, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("input", onInput, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("input", onInput);
      window.removeEventListener("scroll", onScroll);
    };
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

    const send = (reason: string) => {
      const page = `${window.location.pathname}${window.location.search}`;
      const payload = {
        sessionId,
        sessionPageCount,
        domain: window.location.hostname,
        page,
        pageTitle: document.title,
        referrer: document.referrer || "",
        utm: getUtmParams(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timeOnPage: Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)),
        scrollDepth: metricsRef.current.maxScrollDepth,
        clicks: metricsRef.current.clicks,
        mouseMovements: metricsRef.current.mouseMovements,
        formInteractions: metricsRef.current.formInteractions,
        reason,
        timestamp: new Date().toISOString(),
      };

      if (reason === "page_view") {
        trackClientActivity("page_view", payload, { sessionId });
      } else {
        trackClientActivity("page_engagement", payload, { sessionId, keepalive: true });
      }

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
    };

    const initialTimer = window.setTimeout(() => {
      send("page_view");
    }, 1200);

    const heartbeatTimer = window.setInterval(() => {
      send("heartbeat");
    }, 60000);

    const onHidden = () => {
      if (document.visibilityState === "hidden") {
        send("hidden");
      }
    };

    const onBeforeUnload = () => {
      send("beforeunload");
    };

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("beforeunload", onBeforeUnload);
      send("route_change");
    };
  }, [pathname]);

  return null;
}
