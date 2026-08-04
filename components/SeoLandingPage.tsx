import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import { seoLandingPages, type SeoLandingPageData } from "@/lib/seo-landing-pages";

const accentStyles = {
  indigo: {
    text: "text-[#5b3fd4]",
    soft: "bg-[#e9e4ff] border-[#33312e]",
    solid: "bg-[#7c5cff]",
    softBg: "bg-[#e9e4ff]",
  },
  blue: {
    text: "text-[#157f76]",
    soft: "bg-[#cdeee9] border-[#33312e]",
    solid: "bg-[#2ec4b6]",
    softBg: "bg-[#cdeee9]",
  },
  emerald: {
    text: "text-[#2b7a3d]",
    soft: "bg-[#d9f5d9] border-[#33312e]",
    solid: "bg-[#2ec4b6]",
    softBg: "bg-[#d9f5d9]",
  },
  rose: {
    text: "text-[#c2255c]",
    soft: "bg-[#ffd9e6] border-[#33312e]",
    solid: "bg-[#ff5d8f]",
    softBg: "bg-[#ffd9e6]",
  },
  amber: {
    text: "text-[#8a6100]",
    soft: "bg-[#fff0c7] border-[#33312e]",
    solid: "bg-[#ffb800]",
    softBg: "bg-[#fff0c7]",
  },
} as const;

type RelatedPageLink = Pick<SeoLandingPageData, "slug" | "eyebrow" | "lead">;

const relatedPublicPages: Record<string, RelatedPageLink> = {
  "classroom-bingo": {
    slug: "classroom-bingo",
    eyebrow: "Classroom bingo",
    lead: "Turn vocabulary, math facts, and subject review into an active classroom game.",
  },
  "icebreaker-bingo": {
    slug: "icebreaker-bingo",
    eyebrow: "Icebreaker bingo",
    lead: "Give groups easy conversation prompts for introductions, networking, and first-day activities.",
  },
  "team-building-bingo": {
    slug: "team-building-bingo",
    eyebrow: "Team building bingo",
    lead: "Use friendly prompts for offsites, onboarding, meetings, and team events.",
  },
  "graduation-bingo": {
    slug: "graduation-bingo",
    eyebrow: "Graduation bingo",
    lead: "Make a respectful bingo card for a graduation ceremony or celebration.",
  },
};

function resolveRelatedPage(slug: string): RelatedPageLink | undefined {
  return seoLandingPages[slug] || relatedPublicPages[slug];
}

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

function Header({ createHref }: { createHref: string }) {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#fff7ed]/95 backdrop-blur-md border-b-[3px] border-[#33312e]">
      <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="min-w-0 flex items-center gap-2 group">
          <div className="w-8 h-8 bg-[#ff5d8f] border-2 border-[#33312e] rounded-xl flex items-center justify-center shadow-[0_2px_0_#33312e] group-hover:-rotate-6 transition-all duration-300">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <span className="hidden min-[390px]:inline truncate text-xl font-heading font-bold text-[#ff5d8f]">MyBingoCard</span>
        </Link>
        <Link
          href={createHref}
          className="cbtn cbtn-sm md:hidden shrink-0"
        >
          Create Card
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/templates" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">Templates</Link>
          <Link href="/pricing" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">Pricing</Link>
          <Link href="/blog" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">Blog</Link>
          <div className="w-[2px] h-4 bg-[#33312e]/20"></div>
          <Link href="/login" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">Sign In</Link>
          <Link href={createHref} className="cbtn cbtn-sm">
            Create a Card
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
      <div className={`absolute -top-6 -left-6 w-16 h-16 ${accent.softBg} border-[2.5px] border-[#33312e] rounded-2xl rotate-12 shadow-[0_3px_0_#33312e]`}></div>
      <div className={`absolute -bottom-6 -right-6 w-12 h-12 bg-[#ffb800] border-[2.5px] border-[#33312e] rounded-full -rotate-12 shadow-[0_3px_0_#33312e]`}></div>
      <div className="relative bg-white rounded-2xl border-[2.5px] border-[#33312e] shadow-[0_6px_0_#33312e] p-4 rotate-1 hover:rotate-0 transition-all duration-300">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {"BINGO".split("").map((letter, i) => (
              <span key={letter} className={["text-[#ff5d8f]", "text-[#7c5cff]", "text-[#2ec4b6]", "text-[#ff8a3d]", "text-[#ffb800]"][i]}>
                {letter}
              </span>
            ))}
          </div>
          <p className="text-[#a39a88] text-xs uppercase tracking-widest font-bold mt-2">{page.sampleLabel}</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {page.sampleSquares.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-lg text-center text-[9px] leading-tight font-bold border-2 border-[#33312e] ${
                index === 4
                  ? `${accent.solid} text-white`
                  : "bg-[#fff7ed] text-[#33312e]"
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
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://mybingocard.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Bingo Games",
          item: "https://mybingocard.com/bingo-games",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: page.eyebrow,
          item: url,
        },
      ],
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

export default function SeoLandingPage({ page }: { page: SeoLandingPageData }) {
  const accent = accentStyles[page.accent];
  const useThisListHref = buildUseThisListHref(page);
  const relatedPages = page.related
    .map(resolveRelatedPage)
    .filter((related): related is RelatedPageLink => Boolean(related));

  return (
    <>
      <LandingPageTracker templateCategory={page.slug} />
      <JsonLd page={page} />
      <div className="min-h-screen bg-[#fff7ed]">
        <Header createHref={useThisListHref} />

        <main className="pt-16">
          <section className="relative overflow-hidden pt-8 pb-16 lg:pt-12 lg:pb-20">
            <div className="container mx-auto px-4 lg:px-8 relative">
              <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-[#6b6459] lg:justify-start">
                <Link href="/" className="hover:text-[#ff5d8f]">Home</Link>
                <span aria-hidden="true" className="text-[#a39a88]">/</span>
                <Link href="/bingo-games" className="hover:text-[#ff5d8f]">Bingo Games</Link>
                <span aria-hidden="true" className="text-[#a39a88]">/</span>
                <span aria-current="page" className="font-bold text-[#33312e]">{page.eyebrow}</span>
              </nav>
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                <div className="text-center lg:text-left">
                  <div className={`inline-flex items-center gap-2 ${accent.soft} ${accent.text} border-2 rounded-full px-4 py-1.5 mb-4 shadow-[0_2px_0_#33312e]`}>
                    <span className="text-xs font-heading font-semibold uppercase tracking-wide">{page.eyebrow}</span>
                  </div>
                  <h1 className="text-3xl lg:text-5xl font-heading font-bold text-[#33312e] mb-4 leading-[1.1]">
                    {page.h1}
                  </h1>
                  <p className="text-base font-semibold text-[#6b6459] mb-6 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    {page.lead}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href={useThisListHref}
                      className="cbtn"
                    >
                      {page.primaryCta}
                    </Link>
                    <Link
                      href="/templates"
                      className="cbtn cbtn-white"
                    >
                      Browse Templates
                    </Link>
                  </div>
                  <p className="text-sm font-semibold text-[#6b6459]">Save one card and export an individual PDF or PNG for free. Paid batch packs, sharing, and hosting support group play.</p>
                </div>
                <BingoPreview page={page} />
              </div>
            </div>
          </section>

          <section className="cband cband-teal py-12">
            <div className="container mx-auto px-4 lg:px-8 max-w-5xl">
              <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-10 items-start">
                <div>
                  <h2 className="text-3xl md:text-4xl font-heading font-bold mb-5">
                    Built for {page.audience}
                  </h2>
                  <p className="text-lg font-semibold leading-relaxed opacity-90">{page.intro}</p>
                </div>
                <div className="ccard p-6">
                  <h3 className="text-lg font-heading font-bold text-[#33312e] mb-4">What you can make</h3>
                  <ul className="space-y-3 text-sm font-semibold text-[#6b6459]">
                    <li className="flex gap-3"><span className="text-[#2ec4b6] font-black">✓</span><span>Free individual PDF and PNG exports for in-person games</span></li>
                    <li className="flex gap-3"><span className="text-[#2ec4b6] font-black">✓</span><span>Paid online play links for phones or laptops</span></li>
                    <li className="flex gap-3"><span className="text-[#2ec4b6] font-black">✓</span><span>Unique shuffled cards for groups and classes</span></li>
                    <li className="flex gap-3"><span className="text-[#2ec4b6] font-black">✓</span><span>Reusable card themes you can edit later</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="py-14 bg-[#fff7ed]">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#33312e] mb-4">Why use MyBingoCard?</h2>
                <p className="font-semibold text-[#6b6459]">Create cards faster, keep full control over the content, and choose the format that fits your players.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {page.benefits.map((benefit) => (
                  <div key={benefit.title} className="ccard ccard-hover p-7">
                    <h3 className="text-xl font-heading font-bold text-[#33312e] mb-3">{benefit.title}</h3>
                    <p className="font-semibold text-[#6b6459] leading-relaxed">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-14 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                <div>
                  <h2 className="text-3xl font-heading font-bold text-[#33312e] mb-6">Best ways to use it</h2>
                  <div className="space-y-5">
                    {page.useCases.map((useCase) => (
                      <div key={useCase.title} className="ccard p-6">
                        <h3 className="text-lg font-heading font-bold text-[#33312e] mb-2">{useCase.title}</h3>
                        <p className="font-semibold text-[#6b6459]">{useCase.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-heading font-bold text-[#33312e] mb-6">How to make the card</h2>
                  <ol className="space-y-4">
                    {page.steps.map((step, index) => (
                      <li key={step} className="flex gap-4">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${accent.solid} border-2 border-[#33312e] shadow-[0_2px_0_#33312e] text-white font-heading font-bold`}>
                          {index + 1}
                        </span>
                        <span className="font-semibold text-[#33312e] leading-relaxed pt-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-10 rounded-2xl bg-[#ffb800] border-[2.5px] border-[#33312e] shadow-[0_4px_0_#33312e] p-7 text-[#33312e]">
                    <h3 className="text-xl font-heading font-bold mb-4">Card ideas</h3>
                    <div className="flex flex-wrap gap-2">
                      {page.ideas.map((idea) => (
                        <span key={idea} className="cpill bg-white text-[#33312e] !text-[12px] !px-3 !py-1.5">
                          {idea}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {page.planningGuide ? (
            <section className="cband cband-yellow py-14">
              <div className="container mx-auto max-w-6xl px-4 lg:px-8">
                <div className="mb-10 max-w-3xl">
                  <div className={`mb-3 text-sm font-bold uppercase tracking-wide ${accent.text}`}>
                    Event planning field guide
                  </div>
                  <h2 className="mb-4 text-3xl font-heading font-bold text-[#33312e] md:text-4xl">
                    {page.planningGuide.title}
                  </h2>
                  <p className="text-lg font-semibold leading-relaxed text-[#6b6459]">{page.planningGuide.intro}</p>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1">
                    {page.planningGuide.tracks.map((track) => (
                      <article key={track.title} className="ccard p-6">
                        <h3 className="mb-2 text-xl font-heading font-bold text-[#33312e]">{track.title}</h3>
                        <p className="mb-4 font-semibold leading-relaxed text-[#6b6459]">{track.description}</p>
                        <Link href={track.href} className="font-bold text-[#ff5d8f] hover:underline">
                          {track.linkLabel}
                        </Link>
                      </article>
                    ))}
                  </div>

                  <div className="rounded-2xl bg-[#33312e] border-[2.5px] border-[#33312e] shadow-[0_4px_0_rgba(51,49,46,.35)] p-7 text-white">
                    <h3 className="mb-5 text-2xl font-heading font-bold">Pre-publish checklist</h3>
                    <ul className="space-y-4">
                      {page.planningGuide.checklist.map((item) => (
                        <li key={item} className="flex gap-3 text-white/85">
                          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2ec4b6] text-xs font-bold text-white">
                            ✓
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="py-14 bg-[#fff7ed]">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-12 max-w-6xl mx-auto items-start">
                <div>
                  <h2 className="text-3xl md:text-4xl font-heading font-bold mb-5">
                    Ready-to-use square ideas
                  </h2>
                  <p className="font-semibold text-[#6b6459] leading-relaxed mb-6">
                    Use these as a starting point, then swap in your own words, images, names, numbers, or prompts. The best cards feel specific to the room, so keep the useful ideas and replace anything generic.
                  </p>
                  <Link
                    href={useThisListHref}
                    className="cbtn"
                  >
                    Use This List
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...page.sampleSquares.filter((square) => square !== "FREE"), ...page.ideas]
                    .slice(0, 30)
                    .map((idea) => (
                      <div key={idea} className="rounded-xl border-2 border-[#33312e] bg-white p-4 text-sm font-bold text-[#33312e] shadow-[0_2px_0_#33312e]">
                        {idea}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>

          <section className="py-14 bg-white">
            <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
              <div className="text-center max-w-3xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#33312e] mb-4">
                  Choose the right bingo card setup
                </h2>
                <p className="font-semibold text-[#6b6459]">
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
                  <div key={item.title} className="ccard p-7">
                    <h3 className="text-xl font-heading font-bold text-[#33312e] mb-3">{item.title}</h3>
                    <p className="font-semibold text-[#6b6459] mb-4"><strong className="text-[#33312e]">Best for:</strong> {item.bestFor}</p>
                    <p className="font-semibold text-[#6b6459]"><strong className="text-[#33312e]">Tip:</strong> {item.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-14 bg-[#fff7ed]">
            <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
              <div className="grid lg:grid-cols-2 gap-10">
                <div className="ccard p-8">
                  <h2 className="text-3xl font-heading font-bold text-[#33312e] mb-5">Make the page worth the click</h2>
                  <p className="font-semibold text-[#6b6459] leading-relaxed mb-6">
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
                      <li key={item} className="flex gap-3 font-semibold text-[#33312e]">
                        <span className={`mt-1 h-5 w-5 shrink-0 rounded-full ${accent.solid} border-2 border-[#33312e]`}></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-[#33312e] border-[2.5px] border-[#33312e] shadow-[0_4px_0_rgba(51,49,46,.35)] p-8 text-white">
                  <h2 className="text-3xl font-heading font-bold mb-5">Simple game plan</h2>
                  <div className="space-y-5 text-white/85">
                    <div>
                      <h3 className="font-bold text-white mb-1">Before the game</h3>
                      <p>Build the card, remove weak squares, export one PDF or PNG for free, then use a paid batch pack or paid online play when the group needs its own cards.</p>
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

          <section className="py-14 bg-[#fff7ed]">
            <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#33312e] text-center mb-10">FAQ</h2>
              <div className="space-y-4">
                {page.faqs.map((faq) => (
                  <div key={faq.question} className="ccard p-6">
                    <h3 className="text-xl font-heading font-bold text-[#33312e] mb-3">{faq.question}</h3>
                    <p className="font-semibold text-[#6b6459] leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-14 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-10">
                <h2 className="text-3xl font-heading font-bold text-[#33312e] mb-4">Related bingo generators</h2>
                <p className="font-semibold text-[#6b6459]">
                  Build out your game from nearby tools and use cases. Need help running it? Read our <Link href="/how-to-play-bingo" className="font-bold text-[#ff5d8f] hover:underline">how to play bingo guide</Link> or browse <Link href="/bingo-games" className="font-bold text-[#ff5d8f] hover:underline">bingo game ideas</Link>.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
                {relatedPages.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/${related.slug}`}
                    className="ccard ccard-hover p-5"
                  >
                    <h3 className="font-heading font-bold text-[#33312e] mb-2">{related.eyebrow}</h3>
                    <p className="text-sm font-semibold text-[#6b6459] leading-relaxed">{related.lead}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="cband cband-purple py-20 text-center text-white">
            <div className="container mx-auto px-4 max-w-3xl">
              <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">Ready to make your card?</h2>
              <p className="text-white/85 font-semibold text-lg mb-8">
                Start with a blank bingo card, customize the content, save one card and export an individual PDF or PNG for free, then add paid batches, sharing, or hosted play when needed.
              </p>
              <Link
                href={useThisListHref}
                className="cbtn cbtn-yellow !text-lg !px-9 !py-4"
              >
                Create a Free Card
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
