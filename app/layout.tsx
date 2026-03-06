import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import VisitorTracker from "@/components/VisitorTracker";
import { DarkModeProvider } from "@/components/DarkModeProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import UtmFlusher from "@/components/UtmFlusher";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "MyBingoCard - Create Custom Bingo Cards Online",
  description:
    "Create, customize, and share bingo cards for any occasion. Free and premium templates, instant PDF export, and collaborative features.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MyBingoCard",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased font-sans">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-LWWM9BCCTR"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag(js, new Date());
            gtag(config, G-LWWM9BCCTR);
          `}
        </Script>
        {adsenseId && adsenseId !== "ca-pub-XXXXXXXXXX" && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <VisitorTracker />
        <ServiceWorkerRegistration />
        <Providers>
          <UtmFlusher />
          <DarkModeProvider>{children}</DarkModeProvider>
        </Providers>
      </body>
    </html>
  );
}
