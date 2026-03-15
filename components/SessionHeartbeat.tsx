"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const PING_INTERVAL = 60_000; // 60 seconds while tab is active

export default function SessionHeartbeat() {
  const { status } = useSession();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hidden = useRef(false);

  const ping = () => {
    if (hidden.current) return;
    fetch("/api/ping", { method: "POST", keepalive: true }).catch(() => {});
  };

  useEffect(() => {
    if (status !== "authenticated") return;

    // Initial ping on mount
    ping();

    // Interval ping
    timer.current = setInterval(ping, PING_INTERVAL);

    // Pause when tab hidden, resume when visible
    const onVisibility = () => {
      hidden.current = document.visibilityState === "hidden";
      if (!hidden.current) ping(); // ping immediately on tab focus
    };

    // Ping on tab close (best-effort)
    const onUnload = () => {
      navigator.sendBeacon?.("/api/ping");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [status]);

  return null;
}
