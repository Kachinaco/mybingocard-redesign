import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import { seoLandingPages, type SeoLandingPageData } from "@/lib/seo-landing-pages";

const accentStyles = {
  indigo: {
    text: "text-indigo-700",
    soft: "bg-indigo-50 border-indigo-100",
    gradient: "from-violet-600 to-indigo-600",
    ring: "ring-indigo-100",
    shadow: "shadow-indigo-500/20",
  },
  blue: {
    text: "text-blue-700",
    soft: "bg-blue-50 border-blue-100",
    gradient: "from-blue-600 to-cyan-600",
    ring: "ring-blue-100",
    shadow: "shadow-blue-500/20",
  },
  emerald: {
    text: "text-emerald-700",
    soft: "bg-emerald-50 border-emerald-100",
    gradient: "from-emerald-600 to-teal-600",
    ring: "ring-emerald-100",
    shadow: "shadow-emerald-500/20",
  },
  rose: {
    text: "text-rose-700",
    soft: "bg-rose-50 border-rose-100",
    gradient: "from-rose-600 to-pink-600",
    ring: "ring-rose-100",
    shadow: "shadow-rose-500/20",
  },
  amber: {
    text: "text-amber-700",
    soft: "bg-amber-50 border-amber-100",
    gradient: "from-amber-500 to-orange-500",
    ring: "ring-amber-100",
    shadow: "shadow-amber-500/20",
  },
} as const;

function uniqueIdeas(page: SeoLandingPageData): string[] {
  const seen = new Set<string>();
  return [...page.sampleSquares, ...page.ideas]
    .map((idea) => idea.trim())
    .filter((idea) => {
      if (!idea || idea.toUpperCase() === "FREE" || seen.has(idea.toLowerCase())) return false;
      seen.add(idea.toLowerCase());
      return true;
    });
}

function buildPrefilledCells(page: SeoLandingPageData): string[] {
  const ideas = uniqueIdeas(page).slice(0, 24);
  const cells = Array(25).fill("");
  let ideaIndex = 0;

  for (let index = 0; index < cells.length; index += 1) {
    if (index === 12) continue;
    cells[index] = ideas[ideaIndex] || "";
    ideaIndex += 1;
  }

  return cells;
}

function buildUseThisListHref(page: SeoLandingPageData): string {
  const params = new URLSearchParams({
    templateId: `seo-${page.slug}`,
    title: page.sampleLabel,
    size: "5",
    cells: JSON.stringify(buildPrefilledCells(page)),
    freeSpace: "true",
  });

  return `/create?${params.toString()}`;
}

function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
      <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-900">MyBingoCard</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/templates" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Templates</Link>
          <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Pricing</Link>
          <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Blog</Link>
          <div className="w-px h-4 bg-slate-200"></div>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Sign In</Link>
          <Link href="/create" className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all duration-200 shadow-lg shadow-slate-900/20">
            Start a Draft
          </Link>
        </nav>
      </div>
    </header>
  );
}

function BingoPreview({ page }: { page: SeoLandingPageData }) {
  const accent = accentStyles[page.accent];
  return (
    <div className="relative">
      <div className={`absolute -top-10 -left-10 w-44 h-44 bg-gradient-to-br ${accent.gradient} rounded-full blur-3xl opacity-15`}></div>
      <div className={`absolute -bottom-10 -right-10 w-44 h-44 bg-gradient-to-br ${accent.gradient} rounded-full blur-3xl opacity-10`}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl shadow-slate-200/80 p-6 border border-slate-100 rotate-1 hover:rotate-0 transition-all duration-300">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {"BINGO".split("").map((letter) => (
              <span key={letter} className={`text-transparent bg-clip-text bg-gradient-to-br ${accent.gradient}`}>
                {letter}
              </span>
            ))}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">{page.sampleLabel}</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {page.sampleSquares.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold shadow-sm ${
                index === 4
                  ? `bg-gradient-to-br ${accent.gradient} text-white ring-2 ${accent.ring}`
                  : "bg-white text-slate-600 border border-slate-100"
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function JsonLd({ page }: { page: SeoLandingPageData }) {
  const url = `https://mybingocard.com/${page.slug}`;
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      name: page.metaTitle,
      url,
      description: page.metaDescription,
      isPartOf: {
        "@type": "WebSite",
        name: "MyBingoCard",
        url: "https://mybingocard.com",
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${url}#app`,
      name: page.h1,
      url,
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description: page.lead,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: page.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@type": "HowTo",
      name: `How to make ${page.eyebrow.toLowerCase()}`,
      description: page.lead,
      step: page.steps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        text: step,
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }),
      }}
    />
  );
}

function ToolkitSection({ page }: { page: SeoLandingPageData }) {
  if (!page.toolkit) return null;

  const accent = accentStyles[page.accent];

  return (
    <section className="py-20 bg-white border-y border-slate-100">
      <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-start">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-5">{page.toolkit.title}</h2>
            <p className="text-slate-600 leading-relaxed">{page.toolkit.intro}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {page.toolkit.items.map((item, index) => (
              <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accent.gradient} text-sm font-bold text-white`}>
                    {index + 1}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SeoLandingPage({ page }: { page: SeoLandingPageData }) {
  const accent = accentStyles[page.accent];
  const useThisListHref = buildUseThisListHref(page);
  const relatedPages = page.related
    .map((slug) => seoLandingPages[slug])
    .filter((related): related is SeoLandingPageData => Boolean(related));

  return (
    <>
      <LandingPageTracker templateCategory={page.slug} />
      <JsonLd page={page} />
      <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
        <Header />

        <main className="pt-20">
          <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left">
                  <div className={`inline-flex items-center gap-2 ${accent.soft} ${accent.text} border rounded-full px-4 py-1.5 mb-8`}>
                    <span className="text-xs font-semibold uppercase tracking-wide">{page.eyebrow}</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    {page.h1}
                  </h1>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    {page.lead}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href={useThisListHref}
                      className={`bg-gradient-to-r ${accent.gradient} text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl ${accent.shadow} hover:-translate-y-1 transition-all duration-300`}
                    >
                      {page.primaryCta}
                    </Link>
                    <Link
                      href="/templates"
                      className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-300"
                    >
                      Browse Templates
                    </Link>
                  </div>
                  <p className="text-sm text-slate-500">Start with a draft, then unlock saving, exports, batches, sharing, or hosted games when the card is ready.</p>
                </div>
                <BingoPreview page={page} />
              </div>
            </div>
          </section>

          <section className="py-16 bg-white border-y border-slate-100">
            <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
              <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-10 items-start">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-5">
                    Built for {page.audience}
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed">{page.intro}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">What you can make</h3>
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex gap-3"><span className={accent.text}>✓</span><span>Printable PDF card sets for in-person games</span></li>
                    <li className="flex gap-3"><span className={accent.text}>✓</span><span>Online play links for phones or laptops</span></li>
                    <li className="flex gap-3"><span className={accent.text}>✓</span><span>Unique shuffled cards for groups and classes</span></li>
                    <li className="flex gap-3"><span className={accent.text}>✓</span><span>Reusable card themes you can edit later</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="py-20 bg-slate-50">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why use MyBingoCard?</h2>
                <p className="text-slate-600">Create cards faster, keep full control over the content, and choose the format that fits your players.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {page.benefits.map((benefit) => (
                  <div key={benefit.title} className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{benefit.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-6">Best ways to use it</h2>
                  <div className="space-y-5">
                    {page.useCases.map((useCase) => (
                      <div key={useCase.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{useCase.title}</h3>
                        <p className="text-slate-600">{useCase.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-6">How to make the card</h2>
                  <ol className="space-y-4">
                    {page.steps.map((step, index) => (
                      <li key={step} className="flex gap-4">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accent.gradient} text-white font-bold`}>
                          {index + 1}
                        </span>
                        <span className="text-slate-700 leading-relaxed pt-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-10 rounded-2xl bg-slate-900 p-7 text-white">
                    <h3 className="text-xl font-bold mb-4">Card ideas</h3>
                    <div className="flex flex-wrap gap-2">
                      {page.ideas.map((idea) => (
                        <span key={idea} className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-slate-100">
                          {idea}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <ToolkitSection page={page} />

          <section className="py-20 bg-slate-50 border-y border-slate-100">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-12 max-w-6xl mx-auto items-start">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-5">
                    Ready-to-use square ideas
                  </h2>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    Use these as a starting point, then swap in your own words, images, names, numbers, or prompts. The best cards feel specific to the room, so keep the useful ideas and replace anything generic.
                  </p>
                  <Link
                    href={useThisListHref}
                    className={`inline-flex bg-gradient-to-r ${accent.gradient} text-white px-6 py-3 rounded-xl font-bold shadow-lg ${accent.shadow}`}
                  >
                    Use This List
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...page.sampleSquares.filter((square) => square !== "FREE"), ...page.ideas]
                    .slice(0, 30)
                    .map((idea) => (
                      <div key={idea} className="rounded-xl border border-slate-100 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">
                        {idea}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>

          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
              <div className="text-center max-w-3xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  Choose the right bingo card setup
                </h2>
                <p className="text-slate-600">
                  A better card starts with the right grid, square count, and delivery format. Use this quick guide before you build.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    title: "3x3 cards",
                    bestFor: "Young kids, quick warmups, short meetings, and first-time players.",
                    tip: "Use simple words or images and keep the game under 10 minutes.",
                  },
                  {
                    title: "4x4 cards",
                    bestFor: "Classroom review, small parties, workshops, and medium-length games.",
                    tip: "Good balance when you need variety but do not want the game to drag.",
                  },
                  {
                    title: "5x5 cards",
                    bestFor: "Classic bingo, larger groups, fundraisers, showers, and longer events.",
                    tip: "Use at least 24 strong square ideas so every card feels complete.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-7">
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                    <p className="text-slate-600 mb-4"><strong className="text-slate-800">Best for:</strong> {item.bestFor}</p>
                    <p className="text-slate-600"><strong className="text-slate-800">Tip:</strong> {item.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-20 bg-slate-50 border-y border-slate-100">
            <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
              <div className="grid lg:grid-cols-2 gap-10">
                <div className="rounded-2xl bg-white border border-slate-100 p-8 shadow-sm">
                  <h2 className="text-3xl font-bold text-slate-900 mb-5">Make the page worth the click</h2>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    The card is only useful if it saves setup time. Before publishing or printing, check the details that make a bingo game feel intentional instead of thrown together.
                  </p>
                  <ul className="space-y-4">
                    {[
                      "Write a title players instantly understand.",
                      "Keep square text short enough to read across the table.",
                      "Mix easy, medium, and rare squares so the game has suspense.",
                      "Use a free space only when it helps the pace.",
                      "Shuffle cards for groups so players do not all win at once.",
                      "Test one printed card or shared link before game time.",
                    ].map((item) => (
                      <li key={item} className="flex gap-3 text-slate-700">
                        <span className={`mt-1 h-5 w-5 shrink-0 rounded-full bg-gradient-to-br ${accent.gradient}`}></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-slate-900 p-8 text-white">
                  <h2 className="text-3xl font-bold mb-5">Simple game plan</h2>
                  <div className="space-y-5 text-slate-200">
                    <div>
                      <h3 className="font-bold text-white mb-1">Before the game</h3>
                      <p>Build the card, remove weak squares, choose print or online play, and make enough unique cards for the group.</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-white mb-1">During the game</h3>
                      <p>Call one square at a time, give players enough time to scan, and keep a visible list of called items if the group is large.</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-white mb-1">Winning rules</h3>
                      <p>Decide whether a win means one row, four corners, blackout, or a custom pattern before the first call.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-20 bg-slate-50 border-y border-slate-100">
            <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-10">FAQ</h2>
              <div className="space-y-4">
                {page.faqs.map((faq) => (
                  <div key={faq.question} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{faq.question}</h3>
                    <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-10">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Related bingo generators</h2>
                <p className="text-slate-600">Build out your game from nearby tools and use cases.</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
                {relatedPages.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/${related.slug}`}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-5 hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all duration-200"
                  >
                    <h3 className="font-bold text-slate-900 mb-2">{related.eyebrow}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{related.lead}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="py-20 bg-slate-900 text-center text-white">
            <div className="container mx-auto px-4 max-w-3xl">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to make your card?</h2>
              <p className="text-slate-300 text-lg mb-8">
                Start with a blank bingo card, customize the content, then prepare printable cards, batch packs, sharing, or hosted play when needed.
              </p>
              <Link
                href={useThisListHref}
                className="inline-flex bg-white text-slate-900 px-9 py-4 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-colors"
              >
                Start a Draft
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
