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

const playModes = [
  {
    title: "Listen for called items",
    description: "Best when one host controls the pace and players mark words, facts, songs, or numbers.",
    links: [
      { href: "/how-to-play-bingo", label: "Classic bingo rules" },
      { href: "/classroom-bingo", label: "Classroom bingo" },
      { href: "/music-bingo", label: "Music bingo" },
    ],
  },
  {
    title: "Notice moments during an event",
    description: "Best for conferences, weddings, sports, and parties where the card follows what happens naturally.",
    links: [
      { href: "/conference-bingo", label: "Conference bingo" },
      { href: "/wedding-bingo", label: "Wedding bingo" },
      { href: "/super-bowl-bingo", label: "Super Bowl bingo" },
    ],
  },
  {
    title: "Start useful conversations",
    description: "Best for introductions and group connection when every prompt can be answered voluntarily.",
    links: [
      { href: "/icebreaker-bingo", label: "Icebreaker bingo" },
      { href: "/team-building-bingo", label: "Team-building bingo" },
      { href: "/family-reunion-bingo", label: "Family reunion bingo" },
    ],
  },
  {
    title: "Review what people are learning",
    description: "Best when each marked square reinforces a real objective, term, example, or answer.",
    links: [
      { href: "/training-bingo", label: "Training bingo" },
      { href: "/vocabulary-bingo-generator", label: "Vocabulary bingo" },
      { href: "/math-bingo-generator", label: "Math bingo" },
    ],
  },
];

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
    <article className="group flex h-full flex-col rounded-2xl border border-[#a39a88] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#7c5cff] hover:shadow-xl hover:shadow-[#7c5cff]/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#7c5cff]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#7c5cff]">
          {game.category}
        </span>
        {featured ? <span className="text-xs font-semibold text-[#6b6459]">{game.audience}</span> : null}
      </div>
      <h3 className="mb-2 text-lg font-bold text-[#33312e]">{game.title}</h3>
      <p className="mb-4 flex-grow text-sm leading-relaxed text-[#33312e]">{game.description}</p>
      <Link
        href={`/${game.slug}`}
        className="inline-flex items-center justify-center rounded-xl border border-[#7c5cff] bg-white px-4 py-2.5 text-sm font-semibold text-[#7c5cff] transition-colors hover:border-[#7c5cff] hover:bg-[#7c5cff]/10"
      >
        Open Game
      </Link>
    </article>
  );
}

export default function BingoGamesPage() {
  return (
    <div className="min-h-screen bg-[#fff7ed] selection:bg-[#7c5cff]/15 selection:text-[#7c5cff]">
      <MobileNav />
      <BingoGamesJsonLd />

      <main className="pt-16">
        <section className="bg-white py-10 lg:py-14">
          <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-[#7c5cff]/15 bg-[#7c5cff]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#7c5cff]">
                Bingo game library
              </div>
              <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-[#33312e] md:text-4xl lg:text-5xl">
                Bingo Games for Classrooms, Parties, Showers, Work, and Events
              </h1>
              <p className="mb-6 max-w-2xl text-base leading-relaxed text-[#33312e]">
                Pick the game type closest to your event, open the guide, customize the square ideas, then print a PDF or add online play when your group needs device-based cards.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/create"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#7c5cff] px-6 py-3 text-base font-bold text-white shadow-xl shadow-[#7c5cff]/20 transition-all duration-300 hover:-translate-y-1"
                >
                  Start a Blank Card
                </Link>
                <Link
                  href="/templates"
                  className="inline-flex items-center justify-center rounded-xl border border-[#a39a88] bg-white px-6 py-3 text-base font-bold text-[#33312e] transition-colors hover:bg-[#fff7ed]"
                >
                  Browse Templates
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[#a39a88] bg-[#fff7ed] p-6">
              <div className="grid grid-cols-2 gap-3">
                {featuredBingoGames.slice(0, 6).map((game) => (
                  <Link
                    key={game.slug}
                    href={`/${game.slug}`}
                    className="rounded-xl border border-[#a39a88] bg-white p-4 shadow-sm transition-all duration-200 hover:border-[#7c5cff] hover:shadow-md"
                  >
                    <div className="text-xs font-bold uppercase tracking-wide text-[#7c5cff]">{game.audience}</div>
                    <div className="mt-2 text-sm font-bold leading-snug text-[#33312e]">{game.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#a39a88] bg-[#7c5cff]/40 py-12">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-8 max-w-3xl">
              <h2 className="text-2xl font-bold text-[#33312e] md:text-3xl">Choose a game by how people will play</h2>
              <p className="mt-3 leading-relaxed text-[#33312e]">
                Start with the activity, not the theme. Pick the play style that fits the room, then open a focused guide with square ideas and setup advice.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {playModes.map((mode) => (
                <article key={mode.title} className="rounded-2xl border border-[#7c5cff]/15 bg-white p-6 shadow-sm">
                  <h3 className="mb-2 text-lg font-bold text-[#33312e]">{mode.title}</h3>
                  <p className="mb-5 text-sm leading-relaxed text-[#33312e]">{mode.description}</p>
                  <ul className="space-y-2 text-sm">
                    {mode.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className="font-semibold text-[#7c5cff] hover:text-[#7c5cff] hover:underline">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#a39a88] bg-[#fff7ed] py-12">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#33312e] md:text-3xl">Popular bingo games</h2>
                <p className="mt-2 max-w-2xl text-[#33312e]">
                  These are the high-intent game pages from the MyBingoCard notes: showers, weddings, classrooms, holidays, teams, and fundraisers.
                </p>
              </div>
              <Link href="/create" className="text-sm font-semibold text-[#7c5cff] hover:text-[#7c5cff]">
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
              <h2 className="text-2xl font-bold text-[#33312e] md:text-3xl">All bingo game ideas</h2>
              <p className="mt-2 text-[#33312e]">
                Browse by occasion, classroom use, workplace flow, or community event. Each game page gives you square ideas and a path into the card editor.
              </p>
            </div>

            <div className="space-y-10">
              {categoryGroups.map((group) => (
                <section key={group.category} aria-labelledby={`${group.category.replaceAll(" ", "-").toLowerCase()}-heading`}>
                  <div className="mb-4 flex items-center gap-4">
                    <h2 id={`${group.category.replaceAll(" ", "-").toLowerCase()}-heading`} className="text-xl font-bold text-[#33312e]">
                      {group.category}
                    </h2>
                    <div className="h-px flex-1 bg-[#a39a88]" />
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

        <section className="bg-[#33312e] py-12 text-center text-white">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className="mb-4 text-2xl font-bold md:text-4xl">Build the next bingo game</h2>
            <p className="mb-6 text-base leading-relaxed text-[#a39a88]">
              Start from a guide when you know the occasion, or open a blank card when you already have the square list ready.
            </p>
            <Link
              href="/create"
              className="inline-flex rounded-xl bg-white px-7 py-3 text-base font-bold text-[#33312e] transition-colors hover:bg-[#7c5cff]/10"
            >
              Create a Card
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
