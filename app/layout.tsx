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
import { EmailCapturePopup } from "@/components/EmailCapture";

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
  title: "MyBingoCard - Create Custom Bingo Cards Online",
  description:
    "Create, customize, and share bingo cards for any occasion. Free online bingo card maker with AI generation, 30+ templates, HD PDF export, and live multiplayer games. Used by 50,000+ teachers, party planners, and event organizers.",
  manifest: "/manifest.json",
  openGraph: {
    title: "MyBingoCard - Create Custom Bingo Cards Online",
    description: "Free online bingo card maker with AI generation, 30+ templates, and live multiplayer games. Create cards for classrooms, parties, baby showers, weddings, and more.",
    url: "https://mybingocard.com",
    siteName: "MyBingoCard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyBingoCard - Create Custom Bingo Cards Online",
    description: "Free online bingo card maker with AI generation, 30+ templates, and live multiplayer games.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MyBingoCard",
  },
  alternates: {},
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 0.5,
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
                  "name": "MyBingoCard",
                  "url": "https://mybingocard.com",
                  "description": "Free online bingo card maker with AI generation, 30+ templates, HD PDF export, and live multiplayer games.",
                  "foundingDate": "2026",
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "email": "support@mybingocard.com",
                    "contactType": "customer support",
                  },
                },
                {
                  "@type": "SoftwareApplication",
                  "name": "MyBingoCard",
                  "url": "https://mybingocard.com",
                  "applicationCategory": "UtilitiesApplication",
                  "operatingSystem": "Web",
                  "description": "Create custom bingo cards for classrooms, parties, baby showers, weddings, team building, and more. AI-powered generation, 30+ templates, HD PDF export, and live multiplayer games.",
                  "offers": [
                    {
                      "@type": "Offer",
                      "price": "0",
                      "priceCurrency": "USD",
                      "name": "Free",
                      "description": "1 bingo card, 5 templates, standard PDF export",
                    },
                    {
                      "@type": "Offer",
                      "price": "4.99",
                      "priceCurrency": "USD",
                      "name": "Premium Monthly",
                      "description": "Unlimited cards, AI generation, HD exports, all templates",
                    },
                    {
                      "@type": "Offer",
                      "price": "14.99",
                      "priceCurrency": "USD",
                      "name": "Premium Lifetime",
                      "description": "One-time payment for lifetime Premium access",
                    },
                  ],
                  "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": "4.9",
                    "ratingCount": "127",
                    "bestRating": "5",
                    "worstRating": "1",
                  },
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
          <EmailCapturePopup />
          {children}
          </CheckoutModalProvider>
        </Providers>
      </body>
    </html>
  );
}
