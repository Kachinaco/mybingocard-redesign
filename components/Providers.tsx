"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";

function LocalStorageGuard() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const currentUserId = session.user.id;
    const storedUserId = localStorage.getItem("mybingo_user_id");

    if (storedUserId && storedUserId !== currentUserId) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("mybingo_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }

    localStorage.setItem("mybingo_user_id", currentUserId);
  }, [session, status]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LocalStorageGuard />
      {children}
    </SessionProvider>
  );
}
