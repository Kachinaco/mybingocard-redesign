"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/client";

interface AdUnitProps {
  slot: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

/** How long to wait (ms) before checking whether the ad rendered content. */
const AD_LOAD_CHECK_DELAY = 3000;

export default function AdUnit({ slot, format = "auto", className = "" }: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const tracked = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {
      // AdSense not loaded or blocked — tracked below via the timeout check
    }
  }, []);

  // After a delay, check whether the ad element rendered visible content.
  useEffect(() => {
    if (tracked.current) return;

    const timer = setTimeout(() => {
      if (tracked.current) return;
      tracked.current = true;

      const el = adRef.current;
      if (!el) return;

      // An ad is considered loaded if AdSense injected content (iframe, filled
      // status attribute, or the element has a meaningful height).
      const hasContent =
        el.querySelector("iframe") !== null ||
        el.getAttribute("data-ad-status") === "filled" ||
        el.offsetHeight > 0;

      if (hasContent) {
        track("ad_unit_loaded", { slot, format, page: pathname });
      } else {
        track("ad_unit_blocked", { slot, format, page: pathname });
      }
    }, AD_LOAD_CHECK_DELAY);

    return () => clearTimeout(timer);
  }, [slot, format, pathname]);

  const adClient = process.env.NEXT_PUBLIC_ADSENSE_ID;
  if (!adClient || adClient === "ca-pub-XXXXXXXXXX") return null;

  return (
    <div className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adClient}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        ref={adRef}
      />
    </div>
  );
}
