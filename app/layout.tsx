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
import MetaPixel from "@/components/MetaPixel";
import { FACEBOOK_PAGE_URL, REDDIT_COMMUNITY_URL } from "@/lib/social-links";

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
  title: "Free Bingo Card Maker | Printable Cards & Paid Online Bingo | MyBingoCard",
  description:
    "Create printable bingo cards for classrooms, baby showers, weddings, team building, holidays, and parties. Save, customize, use templates, AI help, and PDF export for free; pay only for share links and live hosting.",
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
    title: "Free Bingo Card Maker | MyBingoCard",
    description: "Create printable bingo cards for free, with optional paid player share links and live bingo hosting.",
    url: "https://mybingocard.com",
    siteName: "MyBingoCard",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "MyBingoCard free bingo draft editor preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Bingo Draft Editor | MyBingoCard",
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
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${satisfy.variable}`} suppressHydrationWarning>
      <head>
        <meta name="p:domain_verify" content="377c2985c8bafafc989490930e0eefff" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script src="/t/tracker.js" data-api="/t/api/track" defer></script>
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              !function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
              pintrk('load', '2613805647066');
              pintrk('page');
            `,
          }}
        />
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} alt="" src="https://ct.pinterest.com/v3/?tid=2613805647066&noscript=1" />
        </noscript>
      </head>
      <body className="antialiased font-sans">
        <MetaPixel />
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
                  "description": "Free bingo draft editor for printable and online bingo games.",
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
                  "description": "Create printable bingo cards for classrooms, parties, baby showers, weddings, team building, holidays, and more. Creator tools are free; batch packs, player links, and live hosting are paid.",
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
                      "description": "Free saved cards, templates, AI ideas, image cells, and single-card PDF and PNG exports",
                    },
                    {
                      "@type": "Offer",
                      "price": "7.99",
                      "priceCurrency": "USD",
                      "name": "Premium Monthly",
                      "description": "Monthly access for printable batches, live bingo hosting, direct player links, and paid sharing tools",
                    },
                    {
                      "@type": "Offer",
                      "price": "29.99",
                      "priceCurrency": "USD",
                      "name": "Premium Lifetime",
                      "description": "One-time payment for lifetime printable batches, live bingo hosting, direct player links, and paid sharing tools",
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
                  "description": "Browser-based bingo card maker for printable cards, online bingo games, AI-generated bingo ideas, image cards, and unique shuffled card sets.",
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
                  "description": "Free bingo draft editor for printable and online bingo games.",
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
