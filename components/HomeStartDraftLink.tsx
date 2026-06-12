"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackClientActivity } from "@/lib/activity-client";

type Props = ComponentProps<typeof Link> & {
  trackingSurface: string;
};

export default function HomeStartDraftLink({
  trackingSurface,
  onClick,
  children,
  ...props
}: Props) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackClientActivity("home_start_draft_clicked", {
          surface: trackingSurface,
          href: typeof props.href === "string" ? props.href : "/create",
        });
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
