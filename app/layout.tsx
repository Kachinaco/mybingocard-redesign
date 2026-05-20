import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { Inter, Poppins, Satisfy } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import VisitorTracker from "@/components/VisitorTracker";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import UtmFlusher from "@/components/UtmFlusher";
import Analytics from "@/components/Analytics";
import SessionHeartbeat from "@/components/SessionHeartbeat";
import NamePromptModal from "@/components/NamePromptModal";
import ErrorCapture from "@/components/ErrorCapture";
import PerformanceTracker from "@/components/PerformanceTracker";
import { CheckoutModalProvider } from "@/components/CheckoutModal";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

const satisfy = Satisfy({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-satisfy",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mybingocard.com"),
  applicationName: "MyBingoCard",
  title: "Free Bingo Card Generator | Printable & Online Bingo Cards | MyBingoCard",
  description:
    "Create printable and online bingo cards for classrooms, baby showers, weddings, team building, holidays, and parties. Free bingo card generator with templates, AI help, PDF export, and live play.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Free Bingo Card Generator | MyBingoCard",
    description: "Create printable and online bingo cards for classrooms, parties, baby showers, weddings, and team building.",
    url: "https://mybingocard.com",
    siteName: "MyBingoCard",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "MyBingoCard free bingo card generator preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Bingo Card Generator | MyBingoCard",
    description: "Create printable and online bingo cards for classrooms, parties, baby showers, weddings, and team building.",
    images: ["/opengraph-image"],
  },
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
  maximumScale: 5,
};

const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${satisfy.variable}`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script src="/t/tracker.js" data-api="/t/api/track" async></script>
      </head>
      <body className="antialiased font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://mybingocard.com/#organization",
                  "name": "MyBingoCard",
                  "url": "https://mybingocard.com",
                  "description": "Free bingo card generator for printable and online bingo games.",
                  "foundingDate": "2026",
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "email": "support@mybingocard.com",
                    "contactType": "customer support",
                  },
                },
                {
                  "@type": "WebApplication",
                  "@id": "https://mybingocard.com/#app",
                  "name": "MyBingoCard",
                  "url": "https://mybingocard.com",
                  "applicationCategory": "GameApplication",
                  "operatingSystem": "Web",
                  "browserRequirements": "Requires JavaScript and a modern web browser.",
                  "isAccessibleForFree": true,
                  "description": "Create printable and online bingo cards for classrooms, parties, baby showers, weddings, team building, holidays, and more.",
                  "featureList": [
                    "Printable bingo card PDFs",
                    "Online bingo card sharing",
                    "Live multiplayer bingo games",
                    "Custom words and image bingo cards",
                    "AI bingo card idea generation",
                    "Batch generation for unique cards"
                  ],
                  "publisher": {
                    "@id": "https://mybingocard.com/#organization"
                  },
                  "offers": [
                    {
                      "@type": "Offer",
                      "price": "0",
                      "priceCurrency": "USD",
                      "name": "Free",
                      "description": "Free bingo card generator with starter templates, browser printing, and paid batch PDF packs",
                    },
                    {
                      "@type": "Offer",
                      "price": "4.99",
                      "priceCurrency": "USD",
                      "name": "Premium Monthly",
                      "description": "AI generation, image bingo cards, HD exports, and premium templates",
                    },
                    {
                      "@type": "Offer",
                      "price": "14.99",
                      "priceCurrency": "USD",
                      "name": "Premium Lifetime",
                      "description": "One-time payment for lifetime AI generation, HD exports, and premium templates",
                    },
                  ],
                },
              ],
            }),
          }}
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-LWWM9BCCTR"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            // Detect AI referral sources
            var aiDomains = {
              'chatgpt.com': 'ChatGPT',
              'chat.openai.com': 'ChatGPT',
              'perplexity.ai': 'Perplexity',
              'claude.ai': 'Claude',
              'gemini.google.com': 'Gemini',
              'bard.google.com': 'Gemini',
              'copilot.microsoft.com': 'Copilot',
              'bing.com/chat': 'Copilot',
              'you.com': 'YouChat',
              'phind.com': 'Phind',
              'poe.com': 'Poe',
              'meta.ai': 'MetaAI'
            };
            var ref = document.referrer || '';
            var aiSource = '';
            try {
              if (ref) {
                var refHost = new URL(ref).hostname.replace('www.', '');
                var refPath = new URL(ref).pathname;
                for (var domain in aiDomains) {
                  if (refHost === domain || (domain.includes('/') && (refHost + refPath).indexOf(domain) === 0)) {
                    aiSource = aiDomains[domain];
                    break;
                  }
                }
              }
            } catch(e) {}

            gtag('config', 'G-LWWM9BCCTR', {
              custom_map: {
                dimension1: 'ai_referral_source',
                dimension2: 'traffic_type'
              }
            });

            if (aiSource) {
              gtag('set', 'user_properties', {
                ai_referral_source: aiSource,
                traffic_type: 'ai_referral'
              });
              gtag('event', 'ai_referral', {
                ai_source: aiSource,
                referrer_url: ref,
                landing_page: window.location.pathname
              });
            }
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
        <Analytics />
        <ServiceWorkerRegistration />
        <Providers>
          <CheckoutModalProvider>
          <ErrorCapture />
          <UtmFlusher />
          <SessionHeartbeat />
          <NamePromptModal />
          <PerformanceTracker />
          {children}
          </CheckoutModalProvider>
        </Providers>
      </body>
    </html>
  );
}
