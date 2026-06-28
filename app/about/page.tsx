import type { Metadata } from "next";
import Link from "next/link";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "About MyBingoCard: Custom Bingo Card Maker",
  description: "Learn about MyBingoCard, a custom bingo card maker for printable cards, online bingo games, classrooms, parties, showers, weddings, and team events.",
  alternates: {
    canonical: "https://mybingocard.com/about",
  },
};

const aboutFaqItems = [
  {
    question: "What is MyBingoCard?",
    answer:
      "MyBingoCard is a custom bingo card maker for creating bingo cards for classrooms, parties, showers, weddings, team events, fundraisers, holidays, and family game nights.",
  },
  {
    question: "Can MyBingoCard make printable and online bingo cards?",
    answer:
      "Yes. MyBingoCard supports printable PDF and PNG exports as well as live multiplayer bingo rooms for people who want to play from their own devices.",
  },
  {
    question: "What can I customize on a bingo card?",
    answer:
      "You can customize card text, images, emojis, free-space content, templates, and card batches so each player can receive a unique card.",
  },
  {
    question: "Who is MyBingoCard built for?",
    answer:
      "MyBingoCard is built for teachers, hosts, families, party planners, teams, nonprofits, and anyone who needs a quick way to make custom bingo cards for a real event.",
  },
];

const aboutPageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": "https://mybingocard.com/about#webpage",
      url: "https://mybingocard.com/about",
      name: "About MyBingoCard: Custom Bingo Card Maker",
      description:
        "Learn about MyBingoCard, a custom bingo card maker for printable cards, online bingo games, classrooms, parties, showers, weddings, and team events.",
      isPartOf: {
        "@id": "https://mybingocard.com/#website",
      },
      about: {
        "@id": "https://mybingocard.com/#software",
      },
      mainEntity: {
        "@id": "https://mybingocard.com/#software",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://mybingocard.com/about#faq",
      mainEntity: aboutFaqItems.map((item) => ({
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
      "@id": "https://mybingocard.com/about#breadcrumb",
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
          name: "About",
          item: "https://mybingocard.com/about",
        },
      ],
    },
  ],
};

export default function AboutPage() {
  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
    />
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">MyBingoCard</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Sign In</Link>
            <Link href="/signup" className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <h1 className="text-3xl font-black text-slate-900 mb-2">About MyBingoCard</h1>

          <div className="mt-8 space-y-8">

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Our Mission</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">MyBingoCard makes it easy for anyone to create custom bingo cards for real events, including baby showers, weddings, classrooms, team meetings, fundraisers, holidays, and family game nights.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">What We Offer</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">A simple card editor that anyone can use in minutes</li>
                  <li className="text-slate-600">Included templates for common bingo occasions</li>
                  <li className="text-slate-600">Text, image, emoji, AI idea, and custom free-space support</li>
                  <li className="text-slate-600">Live multiplayer bingo rooms for real-time games</li>
                  <li className="text-slate-600">PDF and PNG exports for printing or digital use</li>
                  <li className="text-slate-600">Batch generation for creating up to 500 unique cards at once</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Why Bingo?</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">Bingo is one of those rare games that works for everyone — kids, adults, classrooms, parties, corporate events. We built MyBingoCard because we believe great games bring people together, and making custom bingo cards shouldn't be complicated or expensive.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Get Started</h2>
                <p className="text-slate-600 leading-relaxed">Start your first draft for free at <Link href="/create" className="text-indigo-600 hover:text-indigo-700 font-medium underline">mybingocard.com/create</Link> or browse our templates at <Link href="/templates" className="text-indigo-600 hover:text-indigo-700 font-medium underline">mybingocard.com/templates</Link>.</p>
              </div>

          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-sm">
        <p>&copy; 2026 MyBingoCard. All rights reserved.</p>
      </footer>      <SeoSupportBlock slug="about" />

    </div>
    </>
  );
}
