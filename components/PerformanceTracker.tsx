"use client";

import { useEffect, useRef } from "react";
import { trackClientActivity } from "@/lib/activity-client";

type Rating = "good" | "needs-improvement" | "poor";

function rateLCP(ms: number): Rating {
  if (ms <= 2500) return "good";
  if (ms <= 4000) return "needs-improvement";
  return "poor";
}

function rateCLS(value: number): Rating {
  if (value <= 0.1) return "good";
  if (value <= 0.25) return "needs-improvement";
  return "poor";
}

function rateFID(ms: number): Rating {
  if (ms <= 100) return "good";
  if (ms <= 300) return "needs-improvement";
  return "poor";
}

function rateINP(ms: number): Rating {
  if (ms <= 200) return "good";
  if (ms <= 500) return "needs-improvement";
  return "poor";
}

function rateTTFB(ms: number): Rating {
  if (ms <= 800) return "good";
  if (ms <= 1800) return "needs-improvement";
  return "poor";
}

export default function PerformanceTracker() {
  const sentRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
      return;
    }

    const send = (event: string, metadata: Record<string, unknown>) => {
      if (sentRef.current.has(event)) return;
      sentRef.current.add(event);
      trackClientActivity(event, metadata);
    };

    const observers: PerformanceObserver[] = [];

    // --- LCP ---
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          startTime: number;
          element?: Element;
        };
        if (!lastEntry) return;

        const valueMs = Math.round(lastEntry.startTime);
        const rating = rateLCP(valueMs);
        const element =
          (lastEntry as unknown as { element?: Element }).element?.tagName?.toLowerCase() || "unknown";

        send("performance_lcp", { value_ms: valueMs, element, rating });

        if (valueMs > 4000) {
          send("slow_page_load", {
            lcp_ms: valueMs,
            page: `${window.location.pathname}${window.location.search}`,
            url: window.location.href,
          });
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(lcpObserver);
    } catch {
      // Browser does not support LCP observation
    }

    // --- CLS ---
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as unknown as { hadRecentInput: boolean }).hadRecentInput) {
            clsValue += (entry as unknown as { value: number }).value;
          }
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      observers.push(clsObserver);

      // CLS is cumulative, so we report it when the page is hidden (final value)
      const onVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          const rounded = Math.round(clsValue * 1000) / 1000;
          send("performance_cls", { value: rounded, rating: rateCLS(rounded) });
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);

      // Also report on beforeunload as a fallback
      const onBeforeUnload = () => {
        const rounded = Math.round(clsValue * 1000) / 1000;
        send("performance_cls", { value: rounded, rating: rateCLS(rounded) });
      };
      window.addEventListener("beforeunload", onBeforeUnload);

      // Store cleanup references
      const origDisconnect = clsObserver.disconnect.bind(clsObserver);
      clsObserver.disconnect = () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("beforeunload", onBeforeUnload);
        origDisconnect();
      };
    } catch {
      // Browser does not support CLS observation
    }

    // --- FID ---
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as PerformanceEntry & { processingStart: number; startTime: number };
        if (!firstEntry) return;

        const valueMs = Math.round(firstEntry.processingStart - firstEntry.startTime);
        send("performance_fid", { value_ms: valueMs, rating: rateFID(valueMs) });
      });
      fidObserver.observe({ type: "first-input", buffered: true });
      observers.push(fidObserver);
    } catch {
      // Browser does not support FID observation
    }

    // --- INP ---
    try {
      let maxINP = 0;
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = (entry as unknown as { duration: number }).duration;
          if (duration > maxINP) {
            maxINP = duration;
          }
        }
      });
      inpObserver.observe({ type: "event", buffered: true });
      observers.push(inpObserver);

      // INP is the worst interaction, report when page is hidden
      const onVisibilityChange = () => {
        if (document.visibilityState === "hidden" && maxINP > 0) {
          send("performance_inp", { value_ms: Math.round(maxINP), rating: rateINP(maxINP) });
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);

      const onBeforeUnload = () => {
        if (maxINP > 0) {
          send("performance_inp", { value_ms: Math.round(maxINP), rating: rateINP(maxINP) });
        }
      };
      window.addEventListener("beforeunload", onBeforeUnload);

      const origDisconnect = inpObserver.disconnect.bind(inpObserver);
      inpObserver.disconnect = () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("beforeunload", onBeforeUnload);
        origDisconnect();
      };
    } catch {
      // Browser does not support INP observation
    }

    // --- TTFB ---
    try {
      const ttfbObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const navEntry = entries[0] as PerformanceNavigationTiming | undefined;
        if (!navEntry) return;

        const valueMs = Math.round(navEntry.responseStart - navEntry.requestStart);
        if (valueMs >= 0) {
          send("performance_ttfb", { value_ms: valueMs, rating: rateTTFB(valueMs) });
        }
      });
      ttfbObserver.observe({ type: "navigation", buffered: true });
      observers.push(ttfbObserver);
    } catch {
      // Browser does not support navigation observation
    }

    return () => {
      for (const obs of observers) {
        try {
          obs.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
    };
  }, []);

  return null;
}
