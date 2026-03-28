"use client";

import { useEffect, useRef } from "react";
import { trackClientActivity } from "@/lib/activity-client";

export default function DashboardFunnelTracker({ cardCount }: { cardCount: number }) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!hasFired.current && cardCount === 0) {
      hasFired.current = true;
      trackClientActivity("funnel_first_dashboard_visit", {
        cardCount: 0,
      });
    }
  }, [cardCount]);

  return null;
}
