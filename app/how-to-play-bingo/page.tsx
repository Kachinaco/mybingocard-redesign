import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Play Bingo — Rules, Tips & Custom Cards | MyBingoCard",
  description:
    "Learn how to play bingo with our complete guide. Bingo rules explained, game variations, tips for hosting, and custom printable bingo cards. Everything you need for your next bingo game.",
  alternates: {
    canonical: "https://mybingocard.com/how-to-play-bingo",
  },
  openGraph: {
    title: "How to Play Bingo — Rules, Tips & Custom Cards | MyBingoCard",
    description:
      "Learn how to play bingo with our complete guide. Bingo rules, winning patterns, game variations, hosting tips, and custom printable cards.",
    url: "https://mybingocard.com/how-to-play-bingo",
    siteName: "MyBingoCard",
    type: "article",
  },
};

const faqItems = [
  {
    question: "How many numbers are on a standard bingo card?",
    answer:
      "A standard 75-ball bingo card has 24 numbered squares plus one free space in the center, for a total of 25 squares arranged in a 5x5 grid. Each column corresponds to the letters B-I-N-G-O, with specific number ranges: B (1-15), I (16-30), N (31-45), G (46-60), and O (61-75).",
  },
  {
    question: "What does the free space on a bingo card mean?",
    answer:
      "The free space is the center square of every bingo card. It counts as automatically marked for every player from the start of the game. It helps players complete winning patterns more easily and is a standard feature in 75-ball bingo.",
  },
  {
    question: "How do you win at bingo?",
    answer:
      "You win by being the first player to complete the required pattern on your card and calling out \"Bingo!\" The most common winning pattern is a straight line of five squares — horizontal, vertical, or diagonal. Other patterns include four corners, blackout (covering every square), and special shapes like X, T, or L.",
  },
  {
    question: "Can you play bingo with custom words instead of numbers?",
    answer:
      "Yes! Custom bingo uses words, phrases, or images instead of numbers. It is popular for baby showers, classrooms, team building events, and holiday parties. MyBingoCard lets you create custom bingo cards with any content you want — just type your items and draft shuffled cards quickly.",
  },
  {
    question: "What is the difference between 75-ball and 90-ball bingo?",
    answer:
      "75-ball bingo is the standard version played in the United States and Canada. Cards have a 5x5 grid with numbers 1-75. 90-ball bingo is the standard in the UK, Australia, and Europe. Cards have a 9x3 grid with 15 numbers and 12 blank spaces, using numbers 1-90. 90-ball games typically have three prize levels: one line, two lines, and full house.",
  },
  {
    question: "How many bingo cards should each player have?",
    answer:
      "Beginners should start with one or two cards. Experienced players often play with three to six cards at once. Playing more cards increases your chances of winning but also makes it harder to keep up with the caller. Choose a number you can comfortably manage without missing any calls.",
  },
  {
    question: "What happens if two people call bingo at the same time?",
    answer:
      "If two players call bingo on the same number, the prize is typically split between them or both players are declared winners. In organized bingo halls, the caller usually verifies the first person who called. In casual games, it is common to simply award both players.",
  },
  {
    question: "Do I need special equipment to play bingo?",
    answer:
      "All you need are bingo cards and something to mark called numbers — daubers, chips, coins, or even small candies work. You also need a way to draw numbers randomly. A bingo cage with numbered balls is traditional, but you can use a random number generator app or draw numbers from a hat.",
  },
];

const faqSchema = {
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
};

const tocSections = [
  { id: "what-is-bingo", label: "What Is Bingo?" },
  { id: "basic-rules", label: "Basic Rules" },
  { id: "bingo-card-layout", label: "Card Layout" },
  { id: "winning-patterns", label: "Winning Patterns" },
  { id: "game-variations", label: "Game Variations" },
  { id: "how-to-host", label: "How to Host" },
  { id: "tips-and-strategy", label: "Tips & Strategy" },
  { id: "faq", label: "FAQ" },
];

type PatternGrid = (0 | 1)[][];

function PatternCard({ name, grid }: { name: string; grid: PatternGrid }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="grid grid-cols-5 gap-[3px] w-[100px] h-[100px]">
        {grid.flat().map((cell, i) => (
          <div
            key={i}
            className={`rounded-sm ${
              cell
                ? "bg-gradient-to-br from-violet-500 to-indigo-500"
                : "bg-slate-100"
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-slate-700">{name}</span>
    </div>
  );
}

const patterns: { name: string; grid: PatternGrid }[] = [
  {
    name: "Horizontal Line",
    grid: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
  },
  {
    name: "Vertical Line",
    grid: [
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ],
  },
  {
    name: "Diagonal",
    grid: [
      [1, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 1, 0],
      [0, 0, 0, 0, 1],
    ],
  },
  {
    name: "Four Corners",
    grid: [
      [1, 0, 0, 0, 1],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 0, 0, 0, 1],
    ],
  },
  {
    name: "Blackout",
    grid: [
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ],
  },
  {
    name: "X Pattern",
    grid: [
      [1, 0, 0, 0, 1],
      [0, 1, 0, 1, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 0, 1, 0],
      [1, 0, 0, 0, 1],
    ],
  },
  {
    name: "T Pattern",
    grid: [
      [1, 1, 1, 1, 1],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ],
  },
  {
    name: "L Pattern",
    grid: [
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
    ],
  },
];

export default function HowToPlayBingoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="min-h-screen bg-white selection:bg-indigo-100 selection:text-indigo-900">
        {/* Navbar */}
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
          <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                MyBingoCard
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/templates"
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Templates
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Pricing
              </Link>
              <div className="w-px h-4 bg-slate-200"></div>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/create"
                className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all duration-200 shadow-lg shadow-slate-900/20"
              >
                Start a Draft
              </Link>
            </nav>
          </div>
        </header>

        <main className="pt-20">
          {/* Hero */}
          <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28 bg-gradient-to-b from-indigo-50/60 to-white">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-200/30 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-200/30 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative text-center max-w-4xl">
              <div className="inline-flex items-center gap-2 bg-white border border-indigo-100 shadow-sm rounded-full px-4 py-1.5 mb-8">
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                  Complete Guide
                </span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                How to Play{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                  Bingo
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto">
                Everything you need to know about bingo — from basic rules and
                card layouts to winning patterns, game variations, and hosting
                tips. Your complete reference for America&apos;s favorite group
                game.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/create"
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all duration-300"
                >
                  Start a Draft
                </Link>
                <a
                  href="#basic-rules"
                  className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-300"
                >
                  Read the Rules
                </a>
              </div>
            </div>
          </section>

          {/* Table of Contents + Content */}
          <div className="container mx-auto px-4 lg:px-8 py-16 lg:py-24">
            <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[220px_1fr] lg:gap-16">
              {/* Sticky TOC sidebar */}
              <aside className="hidden lg:block">
                <nav className="sticky top-28">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                    On this page
                  </p>
                  <ul className="space-y-2 border-l-2 border-slate-100">
                    {tocSections.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="block pl-4 py-1 text-sm text-slate-500 hover:text-indigo-600 hover:border-l-indigo-600 transition-colors -ml-[2px] border-l-2 border-transparent hover:border-indigo-600"
                        >
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>

              {/* Mobile TOC */}
              <div className="lg:hidden mb-12 bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <p className="text-sm font-bold text-slate-900 mb-3">
                  Table of Contents
                </p>
                <ul className="grid grid-cols-2 gap-2">
                  {tocSections.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Main content */}
              <div className="max-w-3xl">
                {/* What is Bingo? */}
                <section id="what-is-bingo" className="scroll-mt-28 mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-indigo-600 rounded-full"></span>
                    What Is Bingo?
                  </h2>
                  <div className="space-y-4 text-slate-600 leading-relaxed text-[17px]">
                    <p>
                      Bingo is a game of chance where players mark numbers on a
                      card as they are randomly called out. The first person to
                      complete a specific pattern on their card shouts
                      &ldquo;Bingo!&rdquo; and wins. It is one of the most
                      widely played social games in the world, enjoyed by
                      millions of people at community halls, churches, schools,
                      and private gatherings.
                    </p>
                    <p>
                      The modern version of bingo evolved from a 16th-century
                      Italian lottery game called &ldquo;Lo Giuoco del Lotto
                      d&apos;Italia.&rdquo; It spread across Europe and reached
                      the United States in the 1920s, where it was first known
                      as &ldquo;Beano&rdquo; because players used dried beans to
                      cover their numbers. A toy salesman named Edwin S. Lowe
                      popularized the game under the name &ldquo;Bingo&rdquo;
                      after reportedly hearing a winner accidentally shout that
                      word instead of &ldquo;Beano.&rdquo;
                    </p>
                    <p>
                      Today, bingo is far more than a numbers game. Custom bingo
                      cards with words, phrases, or pictures have made it a go-to
                      activity for baby showers, classrooms, team-building
                      events, holiday parties, and just about any occasion where
                      you want a group of people to have a great time together.
                    </p>
                  </div>
                </section>

                {/* Basic Rules */}
                <section id="basic-rules" className="scroll-mt-28 mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-indigo-600 rounded-full"></span>
                    Basic Rules of Bingo
                  </h2>
                  <p className="text-slate-600 leading-relaxed text-[17px] mb-8">
                    Bingo is simple to learn. Here is how a standard game works
                    from start to finish:
                  </p>
                  <ol className="space-y-6">
                    {[
                      {
                        step: "Get your bingo cards",
                        detail:
                          "Each player receives one or more bingo cards. Every card has a unique arrangement of numbers in a 5x5 grid with a free space in the center.",
                      },
                      {
                        step: "Listen for the caller",
                        detail:
                          "A designated caller randomly draws numbers one at a time and announces them to the group. In traditional bingo, numbers are drawn from a rotating cage of 75 balls. Each ball shows a letter (B, I, N, G, or O) and a number.",
                      },
                      {
                        step: "Mark your card",
                        detail:
                          "When a called number appears on your card, mark it with a dauber, chip, or pen. Pay attention — if you miss a number, you cannot go back.",
                      },
                      {
                        step: 'Call "Bingo!"',
                        detail:
                          "As soon as you complete the required winning pattern (a line, four corners, blackout, etc.), shout \"Bingo!\" to alert the caller and stop the game.",
                      },
                      {
                        step: "Verify the win",
                        detail:
                          "The caller checks your marked numbers against the numbers that have been called. If every marked number is confirmed, you win the round. If any number is incorrect, the game continues.",
                      },
                    ].map((item, i) => (
                      <li key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-200">
                          {i + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg mb-1">
                            {item.step}
                          </h3>
                          <p className="text-slate-600 leading-relaxed">
                            {item.detail}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* Bingo Card Layout */}
                <section id="bingo-card-layout" className="scroll-mt-28 mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-indigo-600 rounded-full"></span>
                    Bingo Card Layout
                  </h2>
                  <div className="space-y-4 text-slate-600 leading-relaxed text-[17px] mb-8">
                    <p>
                      A standard 75-ball bingo card is a 5-column, 5-row grid
                      with the letters B-I-N-G-O across the top. Each column
                      contains numbers within a specific range, and the center
                      square is a free space that counts as already marked.
                    </p>
                  </div>

                  {/* Visual card layout */}
                  <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200 mb-8">
                    <div className="max-w-xs mx-auto">
                      {/* BINGO header */}
                      <div className="grid grid-cols-5 gap-2 mb-2">
                        {["B", "I", "N", "G", "O"].map((letter) => (
                          <div
                            key={letter}
                            className="text-center text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-600 to-indigo-600"
                          >
                            {letter}
                          </div>
                        ))}
                      </div>
                      {/* Number ranges */}
                      <div className="grid grid-cols-5 gap-2">
                        {["1-15", "16-30", "31-45", "46-60", "61-75"].map(
                          (range, col) => (
                            <div key={col} className="space-y-2">
                              {[0, 1, 2, 3, 4].map((row) => {
                                const isFree = col === 2 && row === 2;
                                return (
                                  <div
                                    key={row}
                                    className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold ${
                                      isFree
                                        ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white"
                                        : "bg-white border border-slate-200 text-slate-500"
                                    }`}
                                  >
                                    {isFree ? "FREE" : range}
                                  </div>
                                );
                              })}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                          <th className="px-4 py-3 text-left font-semibold">
                            Column
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            Letter
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            Number Range
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          { col: "1st", letter: "B", range: "1 - 15" },
                          { col: "2nd", letter: "I", range: "16 - 30" },
                          { col: "3rd", letter: "N", range: "31 - 45" },
                          { col: "4th", letter: "G", range: "46 - 60" },
                          { col: "5th", letter: "O", range: "61 - 75" },
                        ].map((row, i) => (
                          <tr
                            key={i}
                            className={
                              i % 2 === 0 ? "bg-white" : "bg-slate-50"
                            }
                          >
                            <td className="px-4 py-3 text-slate-600">
                              {row.col}
                            </td>
                            <td className="px-4 py-3 font-bold text-indigo-600">
                              {row.letter}
                            </td>
                            <td className="px-4 py-3 text-slate-900 font-medium">
                              {row.range}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-slate-500 text-sm mt-4 leading-relaxed">
                    The N column has only four numbers because the center square
                    is the free space. This arrangement means there are
                    1,474,200 possible unique B column combinations alone,
                    making it virtually impossible for two cards to be identical.
                  </p>
                </section>

                {/* Winning Patterns */}
                <section id="winning-patterns" className="scroll-mt-28 mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-indigo-600 rounded-full"></span>
                    Winning Patterns
                  </h2>
                  <p className="text-slate-600 leading-relaxed text-[17px] mb-8">
                    Before each game, the caller announces which pattern players
                    need to complete. Here are the most common winning patterns
                    in bingo. Highlighted squares show which cells must be
                    marked to win.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
                    {patterns.map((p) => (
                      <PatternCard key={p.name} name={p.name} grid={p.grid} />
                    ))}
                  </div>
                  <div className="mt-8 bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                    <p className="text-sm text-indigo-800 leading-relaxed">
                      <strong>Tip:</strong> The most common pattern in casual
                      games is a straight line in any direction. Blackout
                      (covering every square) is the hardest to achieve and
                      usually offers the biggest prize. Many callers announce
                      multiple patterns in a single game, awarding smaller
                      prizes for easier patterns first.
                    </p>
                  </div>
                </section>

                {/* Game Variations */}
                <section id="game-variations" className="scroll-mt-28 mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-indigo-600 rounded-full"></span>
                    Game Variations
                  </h2>
                  <div className="space-y-8">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
                      <h3 className="text-xl font-bold text-slate-900 mb-3">
                        75-Ball Bingo (American)
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        The standard in the US and Canada. Uses a 5x5 card with
                        numbers 1-75 and a free center space. Players win by
                        completing a specific pattern announced before the game.
                        This is the version most people think of when they hear
                        &ldquo;bingo.&rdquo;
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
                      <h3 className="text-xl font-bold text-slate-900 mb-3">
                        90-Ball Bingo (British)
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        Popular in the UK, Australia, and Europe. Cards have a
                        9x3 grid with 15 numbers and 12 blank spaces, using
                        numbers 1-90. Each game has three stages: one line (any
                        complete row), two lines (any two complete rows), and
                        full house (all 15 numbers marked). Prizes increase with
                        each stage.
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
                      <h3 className="text-xl font-bold text-slate-900 mb-3">
                        Speed Bingo
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        A faster version using a 3x3 card with only 9 numbers.
                        Numbers are called rapidly, and games last just a few
                        minutes. It is great for quick rounds between longer
                        games or when you want to fit several games into a short
                        time.
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
                      <h3 className="text-xl font-bold text-slate-900 mb-3">
                        Themed Bingo
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        Custom cards with words, phrases, or tasks instead of
                        numbers. Popular themes include{" "}
                        <Link
                          href="/baby-shower-bingo"
                          className="text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2"
                        >
                          baby shower bingo
                        </Link>
                        ,{" "}
                        <Link
                          href="/wedding-bingo"
                          className="text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2"
                        >
                          wedding bingo
                        </Link>
                        ,{" "}
                        <Link
                          href="/classroom-bingo"
                          className="text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2"
                        >
                          classroom bingo
                        </Link>
                        , and{" "}
                        <Link
                          href="/holiday-bingo"
                          className="text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2"
                        >
                          holiday bingo
                        </Link>
                        . Players mark squares when they observe something
                        happen or complete a task, making it interactive and
                        social.
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
                      <h3 className="text-xl font-bold text-slate-900 mb-3">
                        Picture Bingo
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        Instead of numbers or words, cards feature images. The
                        caller holds up a matching image or describes it, and
                        players mark the picture on their card. This is ideal
                        for young children, ESL learners, or anyone who prefers
                        a visual game. You can{" "}
                        <Link
                          href="/create"
                          className="text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2"
                        >
                          create picture bingo cards
                        </Link>{" "}
                        with uploaded images on MyBingoCard.
                      </p>
                    </div>
                  </div>
                </section>

                {/* How to Host */}
                <section id="how-to-host" className="scroll-mt-28 mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-indigo-600 rounded-full"></span>
                    How to Host a Bingo Game
                  </h2>
                  <p className="text-slate-600 leading-relaxed text-[17px] mb-8">
                    Hosting bingo is straightforward. Follow these steps and you
                    will have everyone laughing and competing in no time.
                  </p>

                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h3 className="font-bold text-slate-900 text-lg mb-3">
                        1. Gather your supplies
                      </h3>
                      <ul className="space-y-2 text-slate-600 leading-relaxed">
                        <li className="flex gap-2">
                          <span className="text-indigo-500 font-bold">
                            &bull;
                          </span>
                          <span>
                            <strong>Bingo cards</strong> &mdash;{" "}
                            <Link
                              href="/create"
                              className="text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2"
                            >
                              Create a free draft, then export or use digital cards after checkout
                            </Link>{" "}
                            on phones and tablets
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-indigo-500 font-bold">
                            &bull;
                          </span>
                          <span>
                            <strong>Markers</strong> &mdash; daubers, chips,
                            coins, candy, or stickers to cover called squares
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-indigo-500 font-bold">
                            &bull;
                          </span>
                          <span>
                            <strong>Number caller</strong> &mdash; a bingo cage,
                            number generator app, or slips of paper in a bowl
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-indigo-500 font-bold">
                            &bull;
                          </span>
                          <span>
                            <strong>Prizes</strong> &mdash; gift cards, small
                            toys, candy bags, or bragging rights
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h3 className="font-bold text-slate-900 text-lg mb-3">
                        2. Set the rules
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        Before the first number is called, announce the winning
                        pattern for the round. Let players know how many rounds
                        you plan to play, whether there are prizes, and what
                        happens if two people call bingo at the same time. Clear
                        rules prevent arguments and keep the energy positive.
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h3 className="font-bold text-slate-900 text-lg mb-3">
                        3. Call numbers clearly
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        Speak loudly and repeat each number twice. Say the
                        letter and number together (&ldquo;B-7&rdquo;,
                        &ldquo;N-42&rdquo;) so players can find them quickly.
                        Keep a consistent pace — fast enough to maintain
                        excitement, slow enough that nobody falls behind. Display
                        called numbers on a whiteboard or screen if possible.
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h3 className="font-bold text-slate-900 text-lg mb-3">
                        4. Verify wins and keep it fun
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        When someone calls bingo, pause the game and read back
                        their marked numbers against your call list. Celebrate
                        the winner, hand out the prize, and reset for the next
                        round. Mix up the winning patterns between rounds to
                        keep things fresh. Play upbeat background music between
                        rounds and encourage friendly trash talk.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Tips & Strategy */}
                <section id="tips-and-strategy" className="scroll-mt-28 mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-indigo-600 rounded-full"></span>
                    Bingo Tips & Strategy
                  </h2>
                  <p className="text-slate-600 leading-relaxed text-[17px] mb-8">
                    Bingo is ultimately a game of luck, but these tips can
                    improve your experience and your odds.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-6">
                    {[
                      {
                        title: "Play multiple cards",
                        body: "More cards mean more chances to win. Start with two or three and work your way up as you get comfortable tracking multiple boards at once.",
                      },
                      {
                        title: "Choose cards wisely",
                        body: "Pick cards with a wide spread of numbers. Avoid cards that duplicate the same numbers, since variety gives you better coverage of what gets called.",
                      },
                      {
                        title: "Stay focused",
                        body: "Missed numbers cost wins. Minimize distractions during play. If you are chatting with friends, make sure you are still listening to every call.",
                      },
                      {
                        title: "Arrive early",
                        body: "At organized events, early arrival lets you pick your seat, settle in, and prepare your cards and markers without feeling rushed.",
                      },
                      {
                        title: "Know the pattern",
                        body: "Before each round starts, make sure you understand exactly what pattern you need. Some patterns are tricky — like a postage stamp (2x2 corner) or a diamond shape.",
                      },
                      {
                        title: "Have fun",
                        body: "Bingo is a social game. Talk to the people around you, enjoy the snacks, and cheer for winners. The best bingo players are the ones having the best time.",
                      },
                    ].map((tip) => (
                      <div
                        key={tip.title}
                        className="bg-white rounded-xl p-5 border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all"
                      >
                        <h3 className="font-bold text-slate-900 mb-2">
                          {tip.title}
                        </h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                          {tip.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="scroll-mt-28 mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-gradient-to-b from-violet-600 to-indigo-600 rounded-full"></span>
                    Frequently Asked Questions
                  </h2>
                  <div className="space-y-6">
                    {faqItems.map((item, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
                      >
                        <h3 className="font-bold text-slate-900 text-lg mb-3">
                          {item.question}
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <section className="py-16 lg:py-24">
            <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 sm:p-14 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/20 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="relative">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    Ready to Play Bingo?
                  </h2>
                  <p className="text-slate-300 mb-8 text-lg max-w-xl mx-auto leading-relaxed">
                    Create custom bingo cards for your next game night, party,
                    or classroom activity. Start with a draft, then choose Premium when you need to save or export.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/create"
                      className="inline-block px-8 py-4 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-xl font-bold text-lg hover:from-violet-400 hover:to-indigo-400 transition-all shadow-lg shadow-indigo-500/30"
                    >
                      Start a Draft
                    </Link>
                    <Link
                      href="/templates"
                      className="inline-block px-8 py-4 bg-white/10 backdrop-blur text-white border border-white/20 rounded-xl font-bold text-lg hover:bg-white/20 transition-all"
                    >
                      Browse Templates
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 pt-16 pb-12">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div className="col-span-1 md:col-span-2">
                <Link href="/" className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    MyBingoCard
                  </span>
                </Link>
                <p className="text-slate-500 max-w-sm leading-relaxed">
                  The easiest way to create custom bingo cards for any occasion.
                  Online bingo draft editor with templates, PDF export after checkout, and
                  live multiplayer games.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-6">Product</h4>
                <ul className="space-y-4">
                  <li>
                    <Link
                      href="/create"
                      className="text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      Create Cards
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/templates"
                      className="text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      Templates
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/pricing"
                      className="text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      Pricing
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-6">More Ideas</h4>
                <ul className="space-y-4">
                  <li>
                    <Link
                      href="/classroom-bingo"
                      className="text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      Classroom Bingo
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/office-party-bingo"
                      className="text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      Office Party Bingo
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/wedding-bingo"
                      className="text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      Wedding Bingo
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/holiday-bingo"
                      className="text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      Holiday Bingo
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-8 text-center text-slate-400 text-sm">
              <p>&copy; {new Date().getFullYear()} MyBingoCard. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
