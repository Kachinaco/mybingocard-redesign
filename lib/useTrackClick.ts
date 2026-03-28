"use client";

import { useCallback, useRef } from "react";
import { trackClientActivity, getClientSessionId } from "@/lib/activity-client";

export interface TrackClickMeta {
  page?: string;
  [key: string]: unknown;
}

/**
 * Lightweight hook that returns a stable `trackClick` function.
 * Fires a `button_clicked` event via trackClientActivity.
 *
 * Usage:
 *   const trackClick = useTrackClick();
 *   <button onClick={() => { trackClick('save_button', { page: 'create' }); doSave(); }}>
 */
export function useTrackClick() {
  // Keep a ref so the returned function never changes identity,
  // avoiding unnecessary re-renders when passed as a prop.
  const fnRef = useRef(
    (buttonName: string, meta?: TrackClickMeta, buttonText?: string) => {
      const page =
        meta?.page ||
        (typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "");

      const { page: _page, ...rest } = meta || {};

      trackClientActivity(
        "button_clicked",
        {
          button_name: buttonName,
          button_text: buttonText ?? "",
          page,
          ...rest,
        },
        { sessionId: getClientSessionId() || undefined }
      );
    }
  );

  return useCallback(
    (buttonName: string, meta?: TrackClickMeta, buttonText?: string) => {
      fnRef.current(buttonName, meta, buttonText);
    },
    []
  );
}

export default useTrackClick;
