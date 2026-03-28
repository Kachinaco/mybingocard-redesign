"use client";

import { forwardRef, useCallback, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useTrackClick, type TrackClickMeta } from "@/lib/useTrackClick";

export interface TrackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Identifier sent as `button_name` in the tracking event. */
  trackName: string;
  /** Extra metadata merged into the tracking payload. */
  trackMeta?: TrackClickMeta;
  children?: ReactNode;
}

/**
 * Drop-in `<button>` replacement that fires a `button_clicked` tracking event
 * before calling the original `onClick` handler.
 *
 * Usage:
 *   <TrackButton trackName="save_card" trackMeta={{ page: 'create' }} onClick={handleSave}>
 *     Save
 *   </TrackButton>
 */
const TrackButton = forwardRef<HTMLButtonElement, TrackButtonProps>(
  function TrackButton({ trackName, trackMeta, onClick, children, ...rest }, ref) {
    const trackClick = useTrackClick();

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        // Derive visible button text for the tracking payload.
        const buttonText =
          typeof children === "string"
            ? children
            : (e.currentTarget.textContent || "").trim().slice(0, 80);

        trackClick(trackName, trackMeta, buttonText);

        // Forward to the consumer's onClick if provided.
        onClick?.(e);
      },
      [trackClick, trackName, trackMeta, onClick, children]
    );

    return (
      <button
        ref={ref}
        data-track-name={trackName}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

export default TrackButton;
