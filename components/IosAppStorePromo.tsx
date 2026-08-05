"use client";

import { useEffect, useState } from "react";
import { getBrowserStorageItem } from "@/lib/browser-storage";
import { IOS_APP_STORE_URL } from "@/lib/social-links";

type NativeWebKitWindow = Window & {
  webkit?: {
    messageHandlers?: {
      mybingocardOAuth?: unknown;
      mybingocardPurchase?: unknown;
    };
  };
};

export default function IosAppStorePromo() {
  const [promoState, setPromoState] = useState<"checking" | "visible" | "hidden-native">(
    "checking",
  );

  useEffect(() => {
    const nativeWindow = window as NativeWebKitWindow;
    const nativeHandler =
      nativeWindow.webkit?.messageHandlers?.mybingocardOAuth ||
      nativeWindow.webkit?.messageHandlers?.mybingocardPurchase;
    const nativeAppFlag =
      getBrowserStorageItem("localStorage", "mybingocard-ios-app") === "1";

    setPromoState(nativeHandler || nativeAppFlag ? "hidden-native" : "visible");
  }, []);

  if (promoState !== "visible") {
    return <span hidden data-ios-app-promo={promoState} />;
  }

  return (
    <section
      data-ios-app-promo="visible"
      className="mb-8 rounded-2xl border border-[#a39a88] bg-white p-4 shadow-sm md:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6b6459]">Mobile app</p>
          <h2 className="mt-1 text-lg font-black text-[#33312e]">MyBingoCard for iPhone</h2>
          <p className="mt-1 text-sm leading-6 text-[#33312e]">Open your cards from the iPhone app.</p>
        </div>
        <a
          href={IOS_APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download MyBingoCard on the App Store"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg px-1 transition focus:outline-none focus:ring-2 focus:ring-[#7c5cff] focus:ring-offset-2"
        >
          <img
            src="/badges/download-on-the-app-store.svg"
            alt="Download on the App Store"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </a>
      </div>
    </section>
  );
}
