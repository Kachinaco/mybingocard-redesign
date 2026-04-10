"use client";

import { useEffect } from "react";
import { trackClientActivity } from "@/lib/activity-client";

interface ShareLinksTrackerProps {
  totalLinks: number;
}

export default function ShareLinksTracker({
  totalLinks,
}: ShareLinksTrackerProps) {
  useEffect(() => {
    trackClientActivity("share_links_page_viewed", {
      total_links: totalLinks,
    });
  }, [totalLinks]);

  return null;
}
