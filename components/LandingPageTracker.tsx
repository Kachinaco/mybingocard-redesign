"use client";

import { useEffect, useRef } from "react";
import { trackClientActivity } from "@/lib/activity-client";

export default function LandingPageTracker({ templateCategory }: { templateCategory: string }) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!hasFired.current) {
      hasFired.current = true;
      trackClientActivity("landing_page_viewed", {
        template_category: templateCategory,
        source: document.referrer || "(direct)",
      });
    }
  }, [templateCategory]);

  return null;
}
