"use client";

import { useEffect, useRef } from "react";
import { trackClientActivity } from "@/lib/activity-client";

export default function DashboardTracker({
  cardCount,
  planType,
}: {
  cardCount: number;
  planType: string;
}) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!hasFired.current) {
      hasFired.current = true;
      trackClientActivity("dashboard_viewed", { card_count: cardCount, plan_type: planType });
    }
  }, [cardCount, planType]);

  return null;
}
