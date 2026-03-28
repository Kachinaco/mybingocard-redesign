"use client";

import { useEffect, useRef } from "react";
import { trackClientActivity } from "@/lib/activity-client";

export default function BlogTracker() {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!hasFired.current) {
      hasFired.current = true;
      trackClientActivity("blog_page_viewed");
    }
  }, []);

  return null;
}

export function BlogPostLink({
  href,
  slug,
  position,
  className,
  children,
}: {
  href: string;
  slug: string;
  position: number;
  className?: string;
  children: React.ReactNode;
}) {
  const handleClick = () => {
    trackClientActivity("blog_post_clicked", { slug, position });
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
