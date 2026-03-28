"use client";

import { useEffect, useRef } from "react";
import { trackClientActivity } from "@/lib/activity-client";

export default function BlogPostTracker({ slug, title }: { slug: string; title: string }) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!hasFired.current) {
      hasFired.current = true;
      trackClientActivity("blog_post_viewed", { slug, title });
    }
  }, [slug, title]);

  return null;
}
