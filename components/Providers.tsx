"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import AnalyticsIdentityBridge from "@/components/AnalyticsIdentityBridge";
import {
  getBrowserStorageItem,
  listBrowserStorageKeys,
  removeBrowserStorageItem,
  setBrowserStorageItem,
} from "@/lib/browser-storage";

function LocalStorageGuard() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const currentUserId = session.user.id;
    const storedUserId = getBrowserStorageItem("localStorage", "mybingo_user_id");

    if (storedUserId && storedUserId !== currentUserId) {
      listBrowserStorageKeys("localStorage")
        .filter((key) => key.startsWith("mybingo_"))
        .forEach((key) => removeBrowserStorageItem("localStorage", key));
    }

    setBrowserStorageItem("localStorage", "mybingo_user_id", currentUserId);
  }, [session, status]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LocalStorageGuard />
      <AnalyticsIdentityBridge />
      <ImpersonationBanner />
      {children}
    </SessionProvider>
  );
}
