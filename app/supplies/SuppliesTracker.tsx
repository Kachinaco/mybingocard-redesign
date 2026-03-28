"use client";

import { useEffect, useRef } from "react";
import { trackClientActivity } from "@/lib/activity-client";

export default function SuppliesTracker() {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!hasFired.current) {
      hasFired.current = true;
      trackClientActivity("supplies_page_viewed");
    }
  }, []);

  return null;
}
