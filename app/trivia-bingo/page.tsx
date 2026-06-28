import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";

export const metadata: Metadata = {
  title: "Trivia Bingo Cards Printable: Pub Quiz Generator",
  description:
    "Make printable trivia bingo cards for pub quizzes, answer based rounds, bar trivia, classrooms, team tables, call lists, and PDF cards.",
  alternates: {
    canonical: "https://mybingocard.com/trivia-bingo",
  },
};

const triviaSquares = [
  "Easy Answer", "Wild Guess", "Team Debate", "Wrong Answer", "FREE",
  "Bonus Round", "Clutch Play", "Phone Check", "History Round", "Pop Culture",
  "Science Question", "Sports Round", "Movie Quote", "Music Lyric", "Geography",
  "Picture Round", "Lucky Guess", "Comeback", "Perfect Round", "Tiebreaker",
  "Final Answer", "Answer Card", "Table Team", "Host Clue", "Prize Round",
];

const triviaPlanningTips = [
  {
    title: "Choose the trivia bingo format",
    desc: "Use answer based cards when players mark correct answers, category cards when rounds are announced, or moment cards for host clues, table debates, lucky guesses, and tiebreakers.",
  },
  {
    title: "Build a balanced answer pool",
    desc: "Mix history, geography, science, sports, movies, music, and pop culture so the card feels like a real pub quiz instead of one narrow trivia category.",
  },
  {
    title: "Run it by table or by player",
    desc: "For bar trivia, give one card to each team table. For classrooms, family nights, and private parties, give each player their own shuffled card.",
  },
  {
    title: "Print enough unique cards",
    desc: "Small game nights may only need 10 to 20 cards, but pubs, fundraisers, and school events often need 50, 100, or 200 unique cards so tables do not share the same layout.",
  },
  {
    title: "Explain phone and marking rules",
    desc: "Tell players whether phones are allowed, whether only announced answers count, and whether a square can be marked during picture rounds, music clips, or bonus questions.",
  },
  {
    title: "Use venue-friendly winning patterns",
    desc: "One row keeps a busy pub quiz moving. Four corners, diagonal, blackout, and prize round patterns work well when you want trivia bingo to last longer.",
  },
  {
    title: "Keep a host answer sheet",
    desc: "Print the call list, answer key, or host prompt sheet beside the quiz deck so the host can confirm disputed squares before awarding prizes or moving to a tiebreaker.",
  },
  {
    title: "Match the print layout to the room",
    desc: "Use one card per page when tables need large type, two cards per page for standard handouts, or four cards per page when players only need a quick side game.",
  },
  {
    title: "Plan the tiebreaker before play",
    desc: "If two teams call bingo on the same question, use the next trivia question, a closest number guess, or a sudden death bonus round instead of deciding at the prize table.",
  },
];

const triviaFormats = [
  {
    title: "Answer based trivia bingo",
    body:
      "Put answer words on the cards, ask the quiz questions, then have players mark a square when the host reveals a matching answer. This format works well for pub quizzes, classroom review, and family trivia because the card rewards knowledge and luck at the same time.",
  },
  {
    title: "Category and round bingo",
    body:
      "Use squares like picture round, sports question, music clue, science round, geography, bonus round, and tiebreaker. Players mark the card as each round appears, which makes a good side game for existing trivia nights.",
  },
  {
    title: "Host moment bingo",
    body:
      "Use table debates, phone check, lucky guess, wrong answer, host clue, technical difficulty, perfect round, and prize round prompts. This version is lighter and works well at bars, restaurants, team events, and casual game nights.",
  },
  {
    title: "Write in answer bingo",
    body:
      "Give players blank or partially blank cards, have them write expected answers into random squares, then read answers in a random order after the quiz. The first team to complete the selected pattern wins after the host verifies the answers.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Trivia Bingo Cards Printable",
      url: "https://mybingocard.com/trivia-bingo",
      description:
        "Make printable trivia bingo cards for pub quizzes, answer based rounds, bar trivia, classrooms, team tables, call lists, and PDF cards.",
    },
    {
      "@type": "WebApplication",
      name: "Trivia Bingo Cards Generator",
      url: "https://mybingocard.com/trivia-bingo",
      description:
        "Custom trivia bingo generator for printable pub quiz cards, answer based bingo, team table games, classroom trivia, bar events, online game nights, call lists, answer keys, and PDF card sets.",
      applicationCategory: "GameApplication",
      operatingSystem: "All",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does trivia bingo work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Trivia bingo can use answer words, category prompts, host moments, or team behaviors on the card. Players mark squares as questions, answers, rounds, or trivia night moments happen.",
          },
        },
        {
          "@type": "Question",
          name: "What should I put on trivia bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use trivia categories, answer terms, picture rounds, music clues, tiebreakers, bonus rounds, table team moments, lucky guesses, and prize round prompts.",
          },
        },
        {
          "@type": "Question",
          name: "Can I print trivia bingo cards for a pub quiz?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Add your trivia prompts once, generate shuffled boards, and export printable PDFs for bar tables, restaurant events, classrooms, or private game nights.",
          },
        },
        {
          "@type": "Question",
          name: "Should trivia bingo use answers or categories?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Either works. Answer based trivia bingo is best when players mark answers as the host reveals them, while category or moment bingo works well for casual pub quizzes, classrooms, and party games.",
          },
        },
        {
          "@type": "Question",
          name: "How many trivia bingo cards should I print?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Print one unique card for each player or team table, plus extras for late arrivals. Small game nights may need 10 to 20 cards, while pubs, fundraisers, and school events may need 50, 100, or more.",
          },
        },
        {
          "@type": "Question",
          name: "Do trivia bingo hosts need a call list or answer key?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A call list or answer key helps the host verify disputed squares, track which answers have been announced, and confirm the winning card before awarding a prize.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make trivia bingo cards",
      step: [
        {
          "@type": "HowToStep",
          name: "Choose trivia prompts",
          text: "Add categories, answer words, host clues, team moments, round types, tiebreakers, and prize rules.",
        },
        {
          "@type": "HowToStep",
          name: "Generate shuffled boards",
          text: "Create unique bingo cards for each table, team, student, or player.",
        },
        {
          "@type": "HowToStep",
          name: "Prepare host materials",
          text: "Keep the call list, answer key, question deck, and tiebreaker rule ready before the first round starts.",
        },
        {
          "@type": "HowToStep",
          name: "Print or share",
          text: "Export PDFs with one, two, or four cards per page for pub quiz tables, or share online cards for remote trivia nights.",
        },
        {
          "@type": "HowToStep",
          name: "Verify winners",
          text: "Check the winning card against the announced answers or host prompts before awarding prizes.",
        },
      ],
    },
  ],
};

function BingoGrid({ squares, label, gradient }: { squares: string[]; label: string; gradient: string }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-violet-400 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-purple-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {"BINGO".split("").map((letter, i) => (
              <span key={i} className={`text-transparent bg-clip-text ${gradient}`}>{letter}</span>
            ))}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">{label}</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
                ${i === 4
                  ? "bg-gradient-to-br from-purple-500 to-violet-500 text-white ring-2 ring-purple-100"
                  : "bg-white text-slate-600 border border-slate-100 hover:border-purple-200 hover:bg-purple-50/50"
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

export default function TriviaBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="trivia-bingo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen overflow-x-hidden bg-slate-50 selection:bg-purple-100 selection:text-purple-900">
        {/* Navbar */}
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
          <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                MyBingoCard
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/templates" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Templates</Link>
              <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Pricing</Link>
              <div className="w-px h-4 bg-slate-200"></div>
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Sign In</Link>
              <Link href="/create" className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all duration-200 shadow-lg shadow-slate-900/20">
                Start a Draft
              </Link>
            </nav>
          </div>
        </header>

        <main className="pt-20">
          {/* Hero */}
          <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-violet-200/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border border-purple-100 shadow-sm rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Trivia Night Edition</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    Trivia Night{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-violet-500">
                      Bingo Cards Generator
                    </span>
                  </h1>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Create printable trivia bingo cards for pub quizzes, bar trivia nights, restaurant events, classrooms, team games, family trivia, and answer based bingo. Add trivia categories, answer words, picture rounds, music clues, lucky guesses, tiebreakers, host prompts, bonus rounds, and table team moments. Generate shuffled cards so every team gets a different layout, then export PDFs with one, two, or four cards per page, keep a host call list, or share online cards for virtual trivia.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="bg-gradient-to-r from-purple-500 to-violet-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 hover:-translate-y-1 transition-all duration-300"
                    >
                      Generate Trivia Bingo Cards
                    </Link>
                    <Link
                      href="/pricing"
                      className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      See Activation
                    </Link>
                  </div>
                  <p className="text-sm text-slate-400">Draft tools · Premium saves and exports</p>
                </div>

                <div className="relative">
                  <BingoGrid
                    squares={triviaSquares}
                    label="Trivia Night Edition"
                    gradient="bg-gradient-to-br from-purple-500 to-violet-500"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                Why use our trivia bingo card maker?
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
                Build printable cards, online boards, and simple rules for pub quizzes, bar trivia, classrooms, team nights, and answer based bingo.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: "🧠",
                    title: "Answer And Clue Squares",
                    desc: "Use answer words, picture rounds, music clues, sports, geography, history, pop culture, and bonus categories.",
                  },
                  {
                    icon: "🖨️",
                    title: "PDF Exports",
                    desc: "Clean PDFs sized for bar tables, restaurant events, classrooms, private parties, team handouts, and one, two, or four card print layouts.",
                  },
                  {
                    icon: "🔀",
                    title: "Unique Every Card",
                    desc: "Every table, team, student, or player gets a shuffled card so the whole room can play without duplicate winners.",
                  },
                  {
                    icon: "📱",
                    title: "Virtual Game Night",
                    desc: "Share online cards for remote trivia nights so players can mark squares on their phones or laptops.",
                  },
                  {
                    icon: "✏️",
                    title: "Custom Categories",
                    desc: "Add your own trivia categories, house rules, venue traditions, sponsor prompts, prize rounds, or team names.",
                  },
                  {
                    icon: "💸",
                    title: "Built for Hosts",
                    desc: "Draft trivia bingo cards first, then activate saves, exports, batches, player links, call tracking, and live hosting when you are ready.",
                  },
                ].map((f) => (
                  <div key={f.title} className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-all duration-300">
                    <div className="text-4xl mb-4">{f.icon}</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{f.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Planning Guide */}
          <section className="py-20 bg-slate-50">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                How to run trivia bingo at a real event
              </h2>
              <p className="text-slate-600 text-center max-w-3xl mx-auto mb-14">
                Strong trivia bingo cards are not just random words. They need a clear answer pool, rules the host can explain quickly, enough shuffled cards for the room, and a winning pattern that matches the pace of the quiz.
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {triviaPlanningTips.map((tip) => (
                  <div key={tip.title} className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-3">{tip.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{tip.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Format Guide */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                Trivia bingo formats that work
              </h2>
              <p className="text-slate-600 text-center max-w-3xl mx-auto mb-14">
                The best format depends on whether trivia bingo is the main game, a pub quiz side game, a classroom review activity, or a casual table game. Pick the rules first, then build the card list around those rules.
              </p>
              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {triviaFormats.map((format) => (
                  <div key={format.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-7 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{format.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{format.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-900">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-violet-600/20"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Ready to level up trivia night?
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Draft trivia bingo cards for pub quizzes, classrooms, team games, and answer based rounds, then print, share, call, and verify winners when you are ready.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-purple-50 transition-all duration-300 shadow-xl">
                  Create Trivia Bingo Cards
                </Link>
                <Link href="/pricing" className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  See Activation
                </Link>
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
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-slate-900">MyBingoCard</span>
                </Link>
                <p className="text-slate-500 max-w-sm leading-relaxed">
                  A flexible bingo card generator for trivia nights, classrooms, office parties, and more.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-6">Product</h4>
                <ul className="space-y-4">
                  <li><Link href="/create" className="text-slate-500 hover:text-indigo-600 transition-colors">Create Cards</Link></li>
                  <li><Link href="/templates" className="text-slate-500 hover:text-indigo-600 transition-colors">Templates</Link></li>
                  <li><Link href="/pricing" className="text-slate-500 hover:text-indigo-600 transition-colors">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-6">More Ideas</h4>
                <ul className="space-y-4">
                  <li><Link href="/classroom-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Classroom Bingo</Link></li>
                  <li><Link href="/office-party-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Office Party Bingo</Link></li>
                  <li><Link href="/wedding-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Wedding Bingo</Link></li>
                  <li><Link href="/holiday-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Holiday Bingo</Link></li>
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
