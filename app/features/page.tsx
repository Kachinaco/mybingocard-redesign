import Link from "next/link";
import type { Metadata } from "next";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Bingo Card Maker Features: Print, Online, AI and Images",
  description:
    "Explore MyBingoCard features for text and image cells, AI ideas, templates, PDF and PNG exports, batches, player links, and live games.",
  alternates: {
    canonical: "https://mybingocard.com/features",
  },
  openGraph: {
    title: "Bingo Card Maker Features | MyBingoCard",
    description:
      "Create custom bingo cards with PDF export, AI help, image squares, templates, batch packs, player links, and hosted live play.",
    url: "https://mybingocard.com/features",
    siteName: "MyBingoCard",
    type: "website",
  },
};

const featureFaqItems = [
  {
    question: "What features does MyBingoCard include?",
    answer:
      "MyBingoCard includes a custom bingo card editor, templates, text and image cells, grid-size controls, AI idea generation, PDF and PNG export, randomized batch cards, player links, and hosted live-game tools.",
  },
  {
    question: "Can I make bingo cards with images and text?",
    answer:
      "Yes. You can use text prompts, numbers, images, templates, colors, headers, and footers to build bingo cards for classrooms, parties, work events, holidays, and fundraisers.",
  },
  {
    question: "Can MyBingoCard make unique cards for a group?",
    answer:
      "Yes. Batch generation can create unique shuffled card layouts so players do not all receive the same board.",
  },
  {
    question: "Can I use MyBingoCard for printable and online bingo?",
    answer:
      "Yes. The workflow supports printable PDF or PNG output, player share links, and hosted online bingo rooms depending on what the event needs.",
  },
];

const featuresPageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://mybingocard.com/features#webpage",
      name: "Bingo Card Maker Features",
      url: "https://mybingocard.com/features",
      description:
        "Explore MyBingoCard features for custom bingo cards, including text and image cells, templates, AI ideas, PDF and PNG exports, randomized batch cards, player links, and hosted live games.",
      isPartOf: { "@id": "https://mybingocard.com/#website" },
      mainEntity: { "@id": "https://mybingocard.com/features#features" },
    },
    {
      "@type": "ItemList",
      "@id": "https://mybingocard.com/features#features",
      name: "MyBingoCard features",
      itemListElement: [
        "Smart editor",
        "Theme library",
        "Print and batch PDFs",
        "Virtual play",
        "Magic shuffle",
        "Privacy first",
        "Advanced analytics",
        "Team collaboration",
      ].map((name, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "SoftwareApplication",
          name,
          applicationCategory: "GameApplication",
          url: "https://mybingocard.com/features",
        },
      })),
    },
    {
      "@type": "WebApplication",
      "@id": "https://mybingocard.com/features#app",
      name: "MyBingoCard",
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      url: "https://mybingocard.com/features",
      featureList: [
        "Custom text and image bingo card editor",
        "Included bingo card templates",
        "AI idea generation for bingo squares",
        "3x3, 4x4, and 5x5 grid sizes",
        "PDF and PNG exports",
        "Randomized batch card generation",
        "Player links and hosted online bingo rooms",
        "Creator analytics and team collaboration",
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description:
          "Creator tools, print exports, sharing, and hosted games are included in the current public release.",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://mybingocard.com/features#faq",
      mainEntity: featureFaqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://mybingocard.com/features#breadcrumb",
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
          name: "Features",
          item: "https://mybingocard.com/features",
        },
      ],
    },
  ],
};

const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
    title: "Smart Editor",
    description: "Drag, drop, and customize every aspect of your card. Change fonts, colors, backgrounds, and images in seconds. No design skills required.",
    highlights: ["Custom fonts & colors", "Background images", "Drag & drop interface", "Real-time preview"],
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: "Theme Library",
    description: "Choose from templates for weddings, birthdays, baby showers, holidays, classrooms, team events, and more.",
    highlights: ["Included templates", "Holiday and seasonal themes", "Classroom and education", "Custom occasion themes"],
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: "Print and Batch PDFs",
    description: "Export PDF and PNG files, then generate printable batch sets when one card is not enough.",
    highlights: ["Browser printing", "PDF and PNG exports", "Printable batches up to 500", "3x3, 4x4, and 5x5 grids"],
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    title: "Virtual Play",
    description: "Share links and hosted rooms let players mark cards on phones or laptops, no app install required.",
    highlights: ["Player links", "Mobile-friendly cards", "Hosted live rooms", "No app required"],
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
      </svg>
    ),
    title: "Magic Shuffle",
    description: "Create unique shuffled cards for players so the whole room does not get the same layout.",
    highlights: ["Unique cards per player", "Fairer games", "Batch generation", "Reusable square lists"],
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Privacy First",
    description: "We do not sell data or track players for ads. Logged-in creators may have basic usage analytics so we can improve the product.",
    highlights: ["No data selling", "No ad targeting", "Creator analytics", "Secure data storage"],
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Advanced Analytics",
    description: "Track how your cards perform. See views, play activity, and sharing signals for the bingo games you create.",
    highlights: ["View and play counts", "Share tracking", "Export data"],
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: "Team Collaboration",
    description: "Invite team members to create and manage cards together. Perfect for schools, event companies, and HR teams running multiple games.",
    highlights: ["Multi-user access", "Shared card library", "Role permissions"],
  },
];

const useCases = [
  { emoji: "🎓", title: "Teachers & Classrooms", description: "Vocabulary bingo, math facts, sight words — make learning fun for any subject." },
  { emoji: "🎉", title: "Event Planners", description: "Wedding receptions, baby showers, birthday parties. Guests love it every time." },
  { emoji: "💼", title: "Corporate Teams", description: "Virtual team building, office parties, training sessions, and icebreakers." },
  { emoji: "🏠", title: "Family Game Nights", description: "Holiday bingo, movie night, family reunion — keep everyone entertained." },
];

export default function FeaturesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(featuresPageSchema) }}
      />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <section className="pt-20 pb-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-semibold px-4 py-2 rounded-full mb-6 border border-indigo-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Everything you need
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-6 leading-tight">
            Powerful features for the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
              perfect game
            </span>
          </h1>
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            From smart editing to virtual play, MyBingoCard has the tools to create printable bingo cards, share player links, and run hosted bingo games in minutes.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold px-8 py-4 rounded-2xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5"
            >
              Start a Draft
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-white text-slate-700 font-semibold px-8 py-4 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200"
            >
              See Activation
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 border-y border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "Included", label: "Creator Tools" },
            { value: "3x3-5x5", label: "Grid Sizes" },
            { value: "PDF/PNG", label: "Print Exports" },
            { value: "Live", label: "Online Play" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">{stat.value}</div>
              <div className="text-slate-500 text-sm font-medium mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900 mb-4">All features, in one place</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Words, images, templates, shuffled cards, PDF exports, batch packs, player links, and hosted rooms in one workflow.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 border border-slate-100 hover:border-indigo-100"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 border border-indigo-100/50">
                  <div className="text-indigo-600">{feature.icon}</div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-5">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Built for every occasion</h2>
            <p className="text-slate-500 text-lg">Build cards for classrooms, parties, work events, holidays, and fundraisers without switching tools.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((uc) => (
              <div key={uc.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center hover:shadow-md transition-all duration-200">
                <div className="text-4xl mb-4">{uc.emoji}</div>
                <h3 className="font-bold text-slate-900 mb-2">{uc.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{uc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl p-12 text-white shadow-2xl shadow-indigo-500/25">
            <h2 className="text-3xl font-black mb-4">Ready to create your first card?</h2>
            <p className="text-indigo-100 mb-8 text-lg">Create a card, choose a grid size, add words or images, then use print, batch, sharing, or hosting tools when your game needs them.</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-8 py-4 rounded-2xl hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
            >
              Start Your First Draft →
            </Link>
          </div>
        </div>
      </section>      <SeoSupportBlock slug="features" />

      </div>
    </>
  );
}
