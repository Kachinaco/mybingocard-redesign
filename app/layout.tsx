import Script from "next/script";
import type { Metadata, Viewport } from "next";
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
import MetaPixel from "@/components/MetaPixel";
import { FACEBOOK_PAGE_URL, REDDIT_COMMUNITY_URL } from "@/lib/social-links";

export const metadata: Metadata = {
  metadataBase: new URL("https://mybingocard.com"),
  applicationName: "MyBingoCard",
  title: "Bingo Card Maker | Printable Cards & Online Bingo | MyBingoCard",
  description:
    "Create bingo cards for classrooms, baby showers, weddings, team building, holidays, and parties. Draft custom cards, then unlock saving, exports, batches, sharing, and hosted live games when ready.",
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
    title: "Bingo Card Maker | MyBingoCard",
    description: "Create printable bingo cards, player share links, and live bingo games from one custom bingo draft.",
    url: "https://mybingocard.com",
    siteName: "MyBingoCard",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "MyBingoCard bingo card maker preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bingo Card Maker | MyBingoCard",
    description: "Draft printable and online bingo cards for classrooms, parties, baby showers, weddings, and team building.",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="p:domain_verify" content="377c2985c8bafafc989490930e0eefff" />
        {adsenseId && adsenseId !== "ca-pub-XXXXXXXXXX" && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
          />
        )}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script src="/t/tracker.js" data-api="/t/api/track" defer></script>
      </head>
      <body className="antialiased font-sans">
        <MetaPixel />
        <Script id="pinterest-tag" strategy="lazyOnload">
          {`
            (function() {
              function loadPinterest() {
                !function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0;t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
                pintrk('load', '2613805647066');
                pintrk('page');
              }
              var events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
              function runOnce() {
                events.forEach(function(eventName) {
                  window.removeEventListener(eventName, runOnce);
                });
                loadPinterest();
              }
              events.forEach(function(eventName) {
                window.addEventListener(eventName, runOnce, { once: true, passive: true });
              });
            })();
          `}
        </Script>
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} alt="" src="https://ct.pinterest.com/v3/?tid=2613805647066&noscript=1" />
        </noscript>
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
                  "description": "Bingo card maker for printable and online bingo games.",
                  "foundingDate": "2026",
                  "sameAs": [
                    FACEBOOK_PAGE_URL,
                    REDDIT_COMMUNITY_URL
                  ],
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
                  "description": "Create printable and online bingo cards for classrooms, parties, baby showers, weddings, team building, holidays, and more. Draft cards first, then unlock exports, batch packs, caller lists, player links, and live hosting when ready.",
                  "featureList": [
                    "Printable bingo card PDFs",
                    "Online bingo card sharing",
                    "Live multiplayer bingo games",
                    "Custom words and image bingo cards",
                    "AI bingo card idea generation",
                    "Unique shuffled card batches",
                    "Caller lists and winner verification"
                  ],
                  "publisher": {
                    "@id": "https://mybingocard.com/#organization"
                  },
                  "offers": [
                    {
                      "@type": "Offer",
                      "price": "0",
                      "priceCurrency": "USD",
                      "name": "Draft",
                      "description": "Draft bingo cards with templates, AI ideas, image cells, custom text, and reusable card layouts before choosing activation for saves, exports, batch packs, player links, and live hosting.",
                    },
                  ],
                },
                {
                  "@type": "SoftwareApplication",
                  "@id": "https://mybingocard.com/#software",
                  "name": "MyBingoCard",
                  "url": "https://mybingocard.com",
                  "applicationCategory": "GameApplication",
                  "operatingSystem": "Web",
                  "isAccessibleForFree": true,
                  "description": "Browser based bingo card maker for printable cards, online bingo games, AI generated bingo ideas, image cards, caller lists, and unique shuffled card sets.",
                  "publisher": {
                    "@id": "https://mybingocard.com/#organization"
                  },
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD",
                    "url": "https://mybingocard.com/create"
                  },
                  "sameAs": [
                    "https://mybingocard.com/bingo-card-maker",
                    "https://mybingocard.com/printable-bingo-cards",
                    "https://mybingocard.com/online-bingo-card-generator",
                    "https://mybingocard.com/ai-bingo-card-generator",
                    FACEBOOK_PAGE_URL,
                    REDDIT_COMMUNITY_URL
                  ]
                },
                {
                  "@type": "WebSite",
                  "@id": "https://mybingocard.com/#website",
                  "name": "MyBingoCard",
                  "url": "https://mybingocard.com",
                  "description": "Bingo card maker for printable and online bingo games.",
                  "publisher": {
                    "@id": "https://mybingocard.com/#organization"
                  },
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://mybingocard.com/templates?search={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "ItemList",
                  "@id": "https://mybingocard.com/#recommended-use-cases",
                  "name": "Popular bingo card generator use cases",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Printable bingo cards",
                      "url": "https://mybingocard.com/printable-bingo-cards"
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "name": "Online bingo card generator",
                      "url": "https://mybingocard.com/online-bingo-card-generator"
                    },
                    {
                      "@type": "ListItem",
                      "position": 3,
                      "name": "AI bingo card generator",
                      "url": "https://mybingocard.com/ai-bingo-card-generator"
                    },
                    {
                      "@type": "ListItem",
                      "position": 4,
                      "name": "Classroom bingo cards",
                      "url": "https://mybingocard.com/classroom-bingo"
                    },
                    {
                      "@type": "ListItem",
                      "position": 5,
                      "name": "Baby shower bingo cards",
                      "url": "https://mybingocard.com/baby-shower-bingo"
                    },
                    {
                      "@type": "ListItem",
                      "position": 6,
                      "name": "Wedding bingo cards",
                      "url": "https://mybingocard.com/wedding-bingo"
                    }
                  ]
                },
              ],
            }),
          }}
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            (function() {
              function loadAnalytics() {
                window.dataLayer = window.dataLayer || [];
                window.gtag = window.gtag || function(){dataLayer.push(arguments);}
                var gtag = window.gtag;
                var script = document.createElement('script');
                script.async = true;
                script.src = 'https://www.googletagmanager.com/gtag/js?id=G-LWWM9BCCTR';
                document.head.appendChild(script);
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
                var ref = '';
                try { ref = document.referrer || ''; } catch(e) {}
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
                    landing_page: (function(){ try { return window.location.pathname; } catch(e) { return ''; } })()
                  });
                }
              }
              var events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
              function runOnce() {
                events.forEach(function(eventName) {
                  window.removeEventListener(eventName, runOnce);
                });
                loadAnalytics();
              }
              events.forEach(function(eventName) {
                window.addEventListener(eventName, runOnce, { once: true, passive: true });
              });
            })();
          `}
        </Script>
        <ErrorCapture />
        <VisitorTracker />
        <Analytics />
        <ServiceWorkerRegistration />
        <Providers>
          <CheckoutModalProvider>
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
