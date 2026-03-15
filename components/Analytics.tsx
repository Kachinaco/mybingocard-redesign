"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/client";

const SCROLL_MILESTONES = [25, 50, 75, 100] as const;

export default function Analytics() {
  const pathname = usePathname();
  const firedMilestonesRef = useRef<Set<number>>(new Set());

  // Reset milestones on route change
  useEffect(() => {
    firedMilestonesRef.current.clear();
  }, [pathname]);

  // Scroll depth tracking
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      if (docHeight <= 0) return;

      const pct = Math.round((scrollTop / docHeight) * 100);

      for (const milestone of SCROLL_MILESTONES) {
        if (pct >= milestone && !firedMilestonesRef.current.has(milestone)) {
          firedMilestonesRef.current.add(milestone);
          track(`scroll_depth_${milestone}`, { pathname, percent: milestone });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // data-track click tracking
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest<HTMLElement>(
        "[data-track]"
      );
      if (!target) return;

      const eventName = target.getAttribute("data-track");
      if (!eventName) return;

      track(eventName, {
        pathname,
        text: target.textContent?.trim().slice(0, 100) || "",
      });
    };

    document.addEventListener("click", onClick, { passive: true });
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  return null;
}
