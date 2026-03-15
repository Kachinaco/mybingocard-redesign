"use client";

import { useCallback, useRef } from "react";
import {
  trackClientActivity,
  getClientSessionId,
  getAnonymousId,
} from "@/lib/activity-client";

export function track(
  event: string,
  metadata?: Record<string, unknown>
): void {
  trackClientActivity(event, metadata);
}

export function useAnalytics() {
  const firedRef = useRef<Set<string>>(new Set());

  const trackOnce = useCallback(
    (event: string, metadata?: Record<string, unknown>) => {
      const key = metadata
        ? `${event}:${JSON.stringify(metadata)}`
        : event;
      if (firedRef.current.has(key)) return;
      firedRef.current.add(key);
      track(event, metadata);
    },
    []
  );

  return { track, trackOnce };
}
