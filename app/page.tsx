import type { Metadata } from "next";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import AdUnit from "@/components/AdUnit";
import { EmailCaptureInline } from "@/components/EmailCapture";
import HomeStartDraftLink from "@/components/HomeStartDraftLink";
import HomeDabBoard from "@/components/HomeDabBoard";
import { featuredBingoGames } from "@/lib/bingo-games";
import { seoLandingPages, type SeoLandingPageData } from "@/lib/seo-landing-pages";
import { FACEBOOK_PAGE_URL, IOS_APP_STORE_URL, REDDIT_COMMUNITY_URL } from "@/lib/social-links";

export const metadata: Metadata = {
  title: "Bingo Card Maker & Generator for Printable and Online Cards | MyBingoCard",
  description:
    "Create custom printable and online bingo cards with a free bingo card maker and generator. Add words or images, use templates and AI ideas, then export individual PDFs for free.",
  keywords: [
    "free bingo card maker",
    "bingo card generator",
    "printable bingo cards",
    "bingo card maker",
    "bingo board generator",
    "custom bingo cards",
    "online bingo card maker",
    "wedding bingo cards",
    "baby shower bingo cards",
    "classroom bingo cards",
    "team building bingo",
  ],
  alternates: {
    canonical: "https://mybingocard.com",
  },
};

const faqItems = [
  {
    question: "How do I create a custom bingo card online?",
    answer:
      "Start with a blank bingo card or a template, add your own words or images, choose a grid size, then export an individual PDF or PNG for free. Add paid batch packs, share links, or hosted live bingo when a group needs more.",
  },
  {
    question: "Is this also a bingo board generator?",
    answer:
      "Yes. You can use MyBingoCard as a bingo board generator to make 3x3, 4x4, or 5x5 bingo boards, then export an individual PDF or PNG for free or add paid online cards for players.",
  },
  {
    question: "What is the difference between a bingo card generator and a bingo card maker?",
    answer:
      "A bingo card generator usually creates shuffled card layouts quickly, while a bingo card maker gives you more control over words, images, colors, grid size, printing, and paid online play. MyBingoCard does both.",
  },
  {
    question: "Can I print bingo cards from MyBingoCard?",
    answer:
      "Yes. MyBingoCard exports individual printable bingo cards as PDF files for free, and larger printable batches use one-time batch packs or Premium.",
  },
  {
    question: "What types of bingo cards can I make?",
    answer:
      "You can make bingo cards for classrooms, baby showers, weddings, birthday parties, holidays, office parties, team building, family reunions, trivia nights, and more.",
  },
  {
    question: "Can people play MyBingoCard games online?",
    answer:
      "Yes. Paid share links and hosted live bingo let players join from phones, tablets, or laptops.",
  },
];

const generatorFooterLinks = [
  "printable-bingo-cards",
  "online-bingo-card-generator",
  "bingo-board-generator",
  "ai-bingo-card-generator",
  "word-bingo-generator",
  "math-bingo-generator",
]
  .map((slug) => seoLandingPages[slug])
  .filter((page): page is SeoLandingPageData => Boolean(page));

const occasions = [
  "🍼 Baby Shower", "🎂 Birthday", "💍 Bridal Shower", "🎄 Holiday Party", "✏️ Classroom",
  "👋 Team Building", "⛪ Church Social", "🎓 Graduation", "🎃 Halloween", "🏈 Super Bowl",
];

const steps = [
  {
    n: "1",
    color: "#ff5d8f",
    title: "Add your words",
    desc: "Type your own squares, upload pictures, or grab a template. AI can brainstorm ideas for your theme too.",
  },
  {
    n: "2",
    color: "#2ec4b6",
    title: "Shuffle it up",
    desc: "Choose 3x3, 4x4, or the classic 5x5. Every card is shuffled so no two players get the same board.",
  },
  {
    n: "3",
    color: "#7c5cff",
    title: "Play your way",
    desc: "Print free PDFs and PNGs, share a link for phone play, or host the game live and call squares yourself.",
  },
];

const features = [
  {
    emojiBg: "#ffd9e6",
    iconColor: "#ff5d8f",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    title: "Image Bingo Cards",
    description: "Add photos and images to any cell. Perfect for kids, vocabulary games, or picture-based bingo nights.",
  },
  {
    emojiBg: "#fff0c7",
    iconColor: "#e69c00",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />,
    title: "Theme Library",
    description: "Choose from included templates for weddings, baby showers, classrooms, holidays, office events, and parties.",
  },
  {
    emojiBg: "#cdeee9",
    iconColor: "#2ec4b6",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />,
    title: "Print and Batch PDFs",
    description: "Export an individual PDF or PNG for free, or buy printable batch packs when you need a larger set.",
  },
  {
    emojiBg: "#e9e4ff",
    iconColor: "#7c5cff",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />,
    title: "Virtual Play",
    description: "Add paid share links or live hosting when players need to join from a browser on their phones, no app required.",
  },
  {
    emojiBg: "#ffe6d4",
    iconColor: "#ff8a3d",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
    title: "Magic Shuffle",
    description: "Use paid batch packs to make unique shuffled printable cards for a group.",
  },
  {
    emojiBg: "#d9f5d9",
    iconColor: "#3aa856",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />,
    title: "AI Card Generator",
    description: "Describe your theme, pick a tone, and AI generates polished card ideas. Dating bingo, office meetings, baby showers — done in seconds.",
  },
];

const workflows = [
  {
    title: "Vocabulary review",
    audience: "Teacher",
    description: "Turn a unit word list into a classroom review game students can play on paper or devices.",
    steps: ["Paste vocabulary terms", "Choose 4x4 or 5x5", "Export for free or add paid links"],
  },
  {
    title: "Gift-opening bingo",
    audience: "Baby shower host",
    description: "Use common registry gifts, shuffle unique cards, and keep guests involved during present opening.",
    steps: ["Start from a gift list", "Choose a paid batch pack for unique cards", "Export an individual card for free"],
  },
  {
    title: "Remote team game",
    audience: "HR team",
    description: "Run meeting bingo, onboarding bingo, or an icebreaker without asking players to install an app.",
    steps: ["Start checkout", "Share the browser link", "Verify winners in the host view"],
  },
  {
    title: "Wedding reception game",
    audience: "Wedding planner",
    description: "Create reception-safe squares for speeches, photos, dancing, dessert, and guest moments.",
    steps: ["Use a reception template", "Add couple-specific details", "Export for free or add paid phone play"],
  },
  {
    title: "Activity-center bingo",
    audience: "Program coordinator",
    description: "Prepare repeatable cards for senior centers, community rooms, libraries, and church events.",
    steps: ["Reuse saved card themes", "Adjust grid size", "Export called lists after games"],
  },
  {
    title: "Holiday party bingo",
    audience: "Party host",
    description: "Make seasonal cards for family gatherings, office parties, classrooms, or neighborhood events.",
    steps: ["Pick a holiday list", "Add party-specific squares", "Export for free or add paid sharing"],
  },
];

const audienceHues = ["#ff5d8f", "#2ec4b6", "#7c5cff", "#ff8a3d", "#e69c00", "#3aa856"];

function HomeAppStorePromo({ className = "" }: { className?: string }) {
  return (
    <div className={`mt-4 flex flex-col items-center gap-2 lg:items-start ${className}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-[#a39a88]">Also available for iPhone</p>
      <a
        href={IOS_APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download MyBingoCard on the App Store"
        className="inline-flex h-12 items-center justify-center rounded-lg px-1 transition focus:outline-none focus:ring-2 focus:ring-[#7c5cff] focus:ring-offset-2"
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
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fff7ed]">
      <MobileNav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-10 pb-14 lg:pt-14 lg:pb-16 grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-center relative">
            <div className="confetti-dot animate-bob absolute w-[13px] h-[13px] rounded-full bg-[#ff5d8f] top-[6%] left-[45%] pointer-events-none" />
            <div className="confetti-dot animate-bob absolute w-[9px] h-[9px] rounded-full bg-[#2ec4b6] top-[20%] left-[39%] pointer-events-none" style={{ animationDelay: ".8s" }} />
            <div className="confetti-dot animate-bob absolute w-[11px] h-[11px] rounded-full bg-[#ffb800] top-[66%] left-[1%] pointer-events-none" style={{ animationDelay: "1.6s" }} />
            <div className="confetti-dot animate-bob absolute w-[8px] h-[8px] rounded-full bg-[#7c5cff] top-[86%] left-[46%] pointer-events-none" style={{ animationDelay: "2.2s" }} />

            <div className="text-center lg:text-left">
              <span className="csticker bg-white text-[#33312e] text-xs mb-5">★ Free to print, fun to play</span>
              <h1 className="font-heading text-4xl lg:text-[46px] font-bold text-[#33312e] leading-[1.08] mb-4">
                Bingo cards as <span className="squiggle">fun</span> as your party
              </h1>
              <p className="text-[17px] font-semibold text-[#6b6459] max-w-[460px] mx-auto lg:mx-0 mb-6">
                Make bingo cards and boards for classrooms, baby showers, weddings, parties, team events, and social challenges. Add words or images, save one card, export an individual PDF or PNG for free.
              </p>
              <div className="flex flex-col min-[321px]:flex-row gap-3 justify-center lg:justify-start">
                <HomeStartDraftLink href="/create" trackingSurface="hero" className="cbtn">
                  Create a free card
                </HomeStartDraftLink>
                <Link href="/templates" className="cbtn cbtn-teal">
                  Pick a template
                </Link>
              </div>
              <p className="mt-3.5 text-xs font-bold text-[#a39a88] text-center lg:text-left">
                ✓ No account needed &nbsp; ✓ Free PDF &amp; PNG &nbsp; ✓ Play online too
              </p>
              <HomeAppStorePromo className="hidden lg:flex" />
            </div>

            <HomeDabBoard />
            <HomeAppStorePromo className="lg:hidden" />
          </div>
        </section>

        {/* Occasions marquee */}
        <div className="occ-strip" aria-hidden="true">
          <div className="occ-track">
            {[...occasions, ...occasions].map((occ, i) => (
              <span key={i} className="occ">{occ}</span>
            ))}
          </div>
        </div>

        {/* How it works */}
        <section className="max-w-6xl mx-auto px-4 lg:px-8 py-14">
          <div className="text-center mb-9">
            <span className="ckick mb-3">How it works</span>
            <h2 className="font-heading text-3xl font-bold text-[#33312e] mb-2.5">Easy as 1-2-bingo</h2>
            <p className="font-semibold text-[#6b6459] max-w-[480px] mx-auto text-[15px]">From blank page to game time in about two minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {steps.map((step) => (
              <div key={step.n} className="ccard">
                <div
                  className="w-[34px] h-[34px] rounded-full border-[2.5px] border-[#33312e] flex items-center justify-center font-heading font-bold text-[15px] mb-3.5 text-white"
                  style={{ background: step.color }}
                >
                  {step.n}
                </div>
                <h3 className="font-heading text-[17px] font-bold text-[#33312e] mb-1.5">{step.title}</h3>
                <p className="text-[13px] font-semibold text-[#6b6459]">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Ad placement */}
        <section className="py-6">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <AdUnit slot="homepage-top" format="horizontal" className="my-4" />
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 lg:px-8 py-14">
          <div className="text-center mb-9">
            <span className="ckick mb-3">Features</span>
            <h2 className="font-heading text-3xl font-bold text-[#33312e] mb-2.5">Small tool, big party energy</h2>
            <p className="font-semibold text-[#6b6459] max-w-[480px] mx-auto text-[15px]">
              Build printable bingo cards, online bingo games, bingo boards, and themed templates for real events and classrooms.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div key={feature.title} className="ccard ccard-hover">
                <div
                  className="w-10 h-10 rounded-[11px] border-2 border-[#33312e] flex items-center justify-center mb-3"
                  style={{ background: feature.emojiBg }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={feature.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="font-heading text-base font-bold text-[#33312e] mb-1.5">{feature.title}</h3>
                <p className="text-[13px] font-semibold text-[#6b6459]">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflows */}
        <section className="cband cband-yellow">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-14">
            <div className="text-center mb-9">
              <span className="ckick mb-3">Common workflows</span>
              <h2 className="font-heading text-3xl font-bold text-[#33312e] mb-2.5">Built for real bingo jobs</h2>
              <p className="font-semibold text-[#33312e]/70 max-w-[480px] mx-auto text-[15px]">
                Start from the setup closest to your event, then export for free, or add paid share links and hosting.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((workflow, i) => (
                <div key={workflow.title} className="ccard h-full flex flex-col">
                  <div className="mb-4">
                    <div className="text-xs font-heading font-bold uppercase tracking-wide mb-1.5" style={{ color: audienceHues[i % audienceHues.length] }}>
                      {workflow.audience}
                    </div>
                    <h3 className="font-heading text-lg font-bold text-[#33312e]">{workflow.title}</h3>
                  </div>
                  <p className="text-[13px] font-semibold text-[#6b6459] mb-5 leading-relaxed flex-grow">{workflow.description}</p>
                  <ul className="space-y-2.5 pt-5 border-t-2 border-[#33312e]/10">
                    {workflow.steps.map((step) => (
                      <li key={step} className="flex gap-2.5 text-[13px] font-semibold text-[#6b6459]">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#ff5d8f] border border-[#33312e]"></span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bingo games library */}
        <section className="max-w-6xl mx-auto px-4 lg:px-8 py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-9">
            <div className="max-w-3xl">
              <span className="ckick mb-3">Bingo games</span>
              <h2 className="font-heading text-3xl font-bold text-[#33312e] mb-2.5">Pick a game idea and build from there</h2>
              <p className="font-semibold text-[#6b6459] text-[15px]">
                Browse ready-to-edit bingo game pages for showers, weddings, classrooms, holidays, fundraisers, and team events. Planning a professional event? Start with the{" "}
                <Link href="/conference-bingo" className="font-bold text-[#ff5d8f] hover:underline">
                  conference bingo planning guide
                </Link>
                .
              </p>
            </div>
            <Link href="/bingo-games" className="text-sm font-bold text-[#ff5d8f] hover:underline">
              See all bingo games
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredBingoGames.map((game, i) => (
              <Link key={game.slug} href={`/${game.slug}`} className="ccard ccard-hover block">
                <div className="text-xs font-heading font-bold uppercase tracking-wide mb-2.5" style={{ color: audienceHues[i % audienceHues.length] }}>
                  {game.audience}
                </div>
                <h3 className="font-heading text-lg font-bold text-[#33312e] mb-2">{game.title}</h3>
                <p className="text-[13px] font-semibold text-[#6b6459] leading-relaxed">{game.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white border-t-[3px] border-[#33312e]">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-14">
            <div className="text-center mb-9">
              <span className="ckick mb-3">FAQ</span>
              <h2 className="font-heading text-3xl font-bold text-[#33312e] mb-2.5">Bingo Card Generator FAQ</h2>
              <p className="font-semibold text-[#6b6459] max-w-[480px] mx-auto text-[15px]">
                Short answers for the questions people ask before choosing a bingo card generator or bingo card maker.
              </p>
            </div>
            <div className="space-y-4">
              {faqItems.map((item) => (
                <div key={item.question} className="ccard p-6">
                  <h3 className="font-heading text-lg font-bold text-[#33312e] mb-2">{item.question}</h3>
                  <p className="font-semibold text-[#6b6459] text-[15px] leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faqItems.map((item) => ({
                  "@type": "Question",
                  name: item.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: item.answer,
                  },
                })),
              }),
            }}
          />
        </section>

        {/* Email capture */}
        <section className="py-14">
          <div className="container mx-auto px-4 lg:px-8 max-w-2xl">
            <EmailCaptureInline />
          </div>
        </section>

        {/* Ad placement */}
        <section className="py-6">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <AdUnit slot="homepage-bottom" format="horizontal" className="my-4" />
          </div>
        </section>

        {/* Final CTA */}
        <section className="cband cband-teal text-center">
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-3" style={{ textShadow: "2px 2px 0 #33312e" }}>
              Ready, set, BINGO!
            </h2>
            <p className="text-white/85 font-bold mb-8 text-[15px]">
              Create, customize, save one card, use templates, AI, and image cells, then export individual PDFs or PNGs for free. Paid batches, player links, and live hosting are available when you need them.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <HomeStartDraftLink href="/create" trackingSurface="bottom_cta" className="cbtn cbtn-yellow !text-lg !px-10 !py-4">
                Create a free card
              </HomeStartDraftLink>
              <Link href="/pricing" className="cbtn cbtn-white !text-lg !px-10 !py-4">
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-[3px] border-[#33312e] pt-16 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-5 gap-10 mb-12">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-[#ff5d8f] border-2 border-[#33312e] rounded-lg flex items-center justify-center shadow-[0_2px_0_#33312e]">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <span className="text-xl font-heading font-bold text-[#33312e]">MyBingoCard</span>
              </Link>
              <p className="font-semibold text-[#6b6459] max-w-sm leading-relaxed">
                Bingo card maker for printable games. Build custom cards for classrooms, parties, showers, weddings, and team events, save one card and export individual PDFs or PNGs for free, then add paid batches, player links, or live hosting when needed.
              </p>
            </div>
            <div>
              <h4 className="font-heading font-bold text-[#33312e] mb-6">Product</h4>
              <ul className="space-y-4">
                <li><Link href="/create" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Create Cards</Link></li>
                <li><Link href="/templates" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Templates</Link></li>
                <li><Link href="/bingo-games" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Bingo Games</Link></li>
                <li><Link href="/pricing" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Pricing</Link></li>
                <li><Link href="/features" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Features</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-bold text-[#33312e] mb-6">Generators</h4>
              <ul className="space-y-4">
                {generatorFooterLinks.map((page) => (
                  <li key={page.slug}>
                    <Link href={`/${page.slug}`} className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">
                      {page.eyebrow}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-bold text-[#33312e] mb-6">Company</h4>
              <ul className="space-y-4">
                <li><Link href="/about" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">About Us</Link></li>
                <li><Link href="/blog" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Blog</Link></li>
                <li>
                  <a href={FACEBOOK_PAGE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href={REDDIT_COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">
                    Reddit
                  </a>
                </li>
                <li><Link href="/privacy" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t-2 border-[#33312e]/10 pt-8 text-center text-[#a39a88] text-sm font-semibold">
            <p>&copy; 2026 MyBingoCard. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
