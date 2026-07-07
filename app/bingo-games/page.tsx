import type { Metadata } from "next";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import { bingoGames, featuredBingoGames, getBingoGamesByCategory, type BingoGame } from "@/lib/bingo-games";

export const metadata: Metadata = {
  title: "Bingo Games for Classrooms, Parties, Showers, Work, and Events",
  description:
    "Browse bingo game ideas for classrooms, baby showers, weddings, birthdays, holidays, team building, fundraisers, and community events. Open a game, customize the card, and print or play online.",
  alternates: {
    canonical: "https://mybingocard.com/bingo-games",
  },
};

const categoryGroups = getBingoGamesByCategory();

function BingoGamesJsonLd() {
  const url = "https://mybingocard.com/bingo-games";
  const graph = [
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      name: metadata.title,
      url,
      description: metadata.description,
      isPartOf: {
        "@type": "WebSite",
        name: "MyBingoCard",
        url: "https://mybingocard.com",
      },
    },
    {
      "@type": "ItemList",
      name: "Bingo games",
      itemListElement: bingoGames.map((game, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: game.title,
        url: `https://mybingocard.com/${game.slug}`,
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What bingo games can I make with MyBingoCard?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can make bingo games for classrooms, baby showers, weddings, birthdays, holidays, team building, fundraisers, church groups, family reunions, conferences, and more.",
          },
        },
        {
          "@type": "Question",
          name: "Can I print these bingo games?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Open a game idea, customize the card, then export printable cards. You can also add paid online sharing or hosted live play when players need device-based cards.",
          },
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

function GameCard({ game, featured = false }: { game: BingoGame; featured?: boolean }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
          {game.category}
        </span>
        {featured ? <span className="text-xs font-semibold text-slate-400">{game.audience}</span> : null}
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-900">{game.title}</h3>
      <p className="mb-4 flex-grow text-sm leading-relaxed text-slate-600">{game.description}</p>
      <Link
        href={`/${game.slug}`}
        className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
      >
        Open Game
      </Link>
    </article>
  );
}

export default function BingoGamesPage() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      <MobileNav />
      <BingoGamesJsonLd />

      <main className="pt-16">
        <section className="bg-white py-10 lg:py-14">
          <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700">
                Bingo game library
              </div>
              <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
                Bingo Games for Classrooms, Parties, Showers, Work, and Events
              </h1>
              <p className="mb-6 max-w-2xl text-base leading-relaxed text-slate-600">
                Pick the game type closest to your event, open the guide, customize the square ideas, then print a PDF or add online play when your group needs device-based cards.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/create"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-base font-bold text-white shadow-xl shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-1"
                >
                  Start a Blank Card
                </Link>
                <Link
                  href="/templates"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Browse Templates
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="grid grid-cols-2 gap-3">
                {featuredBingoGames.slice(0, 6).map((game) => (
                  <Link
                    key={game.slug}
                    href={`/${game.slug}`}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="text-xs font-bold uppercase tracking-wide text-indigo-600">{game.audience}</div>
                    <div className="mt-2 text-sm font-bold leading-snug text-slate-900">{game.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-12">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Popular bingo games</h2>
                <p className="mt-2 max-w-2xl text-slate-600">
                  These are the high-intent game pages from the MyBingoCard notes: showers, weddings, classrooms, holidays, teams, and fundraisers.
                </p>
              </div>
              <Link href="/create" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                Create from scratch
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {featuredBingoGames.map((game) => (
                <GameCard key={game.slug} game={game} featured />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-12 lg:py-16">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-8 max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">All bingo game ideas</h2>
              <p className="mt-2 text-slate-600">
                Browse by occasion, classroom use, workplace flow, or community event. Each game page gives you square ideas and a path into the card editor.
              </p>
            </div>

            <div className="space-y-10">
              {categoryGroups.map((group) => (
                <section key={group.category} aria-labelledby={`${group.category.replaceAll(" ", "-").toLowerCase()}-heading`}>
                  <div className="mb-4 flex items-center gap-4">
                    <h2 id={`${group.category.replaceAll(" ", "-").toLowerCase()}-heading`} className="text-xl font-bold text-slate-900">
                      {group.category}
                    </h2>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {group.games.map((game) => (
                      <GameCard key={game.slug} game={game} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-900 py-12 text-center text-white">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className="mb-4 text-2xl font-bold md:text-4xl">Build the next bingo game</h2>
            <p className="mb-6 text-base leading-relaxed text-slate-300">
              Start from a guide when you know the occasion, or open a blank card when you already have the square list ready.
            </p>
            <Link
              href="/create"
              className="inline-flex rounded-xl bg-white px-7 py-3 text-base font-bold text-slate-900 transition-colors hover:bg-indigo-50"
            >
              Start a Free Draft
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
