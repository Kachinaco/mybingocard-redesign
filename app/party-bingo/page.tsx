import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Party Bingo Cards Printable: Any Celebration Generator",
  description:
    "Create printable party bingo cards for birthdays, game nights, dinner parties, housewarmings, and celebrations. Customize, shuffle, and export PDFs.",
  keywords: [
    "party bingo cards",
    "birthday bingo",
    "game night bingo",
    "dinner party bingo",
    "bingo card generator",
    "printable bingo cards",
    "custom party games",
  ],
  alternates: {
    canonical: "https://mybingocard.com/party-bingo",
  },
  openGraph: {
    title: "Party Bingo Cards Printable for Any Celebration",
    description:
      "Create custom bingo card drafts for birthdays, game nights, dinner parties, and any celebration. PDF export and digital play.",
    url: "https://mybingocard.com/party-bingo",
    type: "website",
  },
};

const partySquares = [
  "Dance Break", "Photo Bomb", "Cake Time", "Toast", "FREE",
  "Karaoke", "Late Arrival", "Gift Table", "Group Selfie", "DJ Request",
  "Funny Story", "Pizza Slice", "Dance Circle", "Confetti", "Party Joke",
  "Surprise Guest", "Balloon Pop", "Slow Song", "Dessert Bar", "Sing Along",
  "Best Dressed", "Card Game", "Belly Laugh", "Prize Winner", "Last Dance",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://mybingocard.com/party-bingo#webpage",
      name: "Party Bingo Cards Printable: Any Celebration Generator",
      url: "https://mybingocard.com/party-bingo",
      description:
        "Create printable party bingo cards for birthdays, game nights, dinner parties, housewarmings, and celebrations.",
    },
    {
      "@type": "WebApplication",
      "@id": "https://mybingocard.com/party-bingo#app",
      name: "Party Bingo Card Generator",
      url: "https://mybingocard.com/party-bingo",
      description:
        "Create custom party bingo cards with celebration prompts, printable PDF export, unique shuffled cards, online play options, and custom square lists.",
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
          name: "How do you play party bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Give each guest a party bingo card before the game starts. Players mark squares when matching moments happen, when a host calls a prompt, or when guests complete a simple challenge. The first player to complete the chosen pattern wins.",
          },
        },
        {
          "@type": "Question",
          name: "What party events work with bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Party bingo works for birthdays, game nights, dinner parties, housewarmings, backyard gatherings, karaoke nights, family reunions, and casual celebrations.",
          },
        },
        {
          "@type": "Question",
          name: "Can every party guest get a different card?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. MyBingoCard can shuffle the same party square list into unique card layouts so guests have different cards.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make party bingo cards",
      step: [
        { "@type": "HowToStep", position: 1, text: "Choose party moments, guest prompts, conversation starters, or custom celebration squares." },
        { "@type": "HowToStep", position: 2, text: "Customize the card title, square list, and free space for the event theme." },
        { "@type": "HowToStep", position: 3, text: "Shuffle unique cards for guests and choose a winning pattern before play starts." },
        { "@type": "HowToStep", position: 4, text: "Export printable PDFs or share online cards for guests who will play on phones." },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-teal-400 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-emerald-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = [
                "from-emerald-500 to-teal-500",
                "from-teal-500 to-cyan-500",
                "from-cyan-500 to-blue-500",
                "from-blue-500 to-indigo-500",
                "from-indigo-500 to-violet-500",
              ];
              return (
                <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>
              );
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Party Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
                ${i === 4
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white ring-2 ring-emerald-100"
                  : "bg-white text-slate-600 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50"
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

export default function PartyBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="party-bingo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-slate-50 selection:bg-emerald-100 selection:text-emerald-900">
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
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-200/40 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-teal-200/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border border-emerald-100 shadow-sm rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">🎉 Party Games</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    Party Bingo Cards{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
                      for Any Celebration
                    </span>
                  </h1>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Make a party game guests can understand fast and play all night. Build printable party bingo cards for birthdays, game nights, dinner parties, housewarmings, karaoke nights, backyard gatherings, and family celebrations. Add party moments, guest prompts, conversation starters, inside jokes, or prize squares, then shuffle unique cards for each player. Export PDFs for printed cards or share online cards for phone play.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all duration-300"
                    >
                      Create Party Bingo Cards
                    </Link>
                    <Link
                      href="/pricing"
                      className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      View Pricing
                    </Link>
                  </div>
                  <p className="text-sm text-slate-400">Draft tools · Premium saves and exports</p>
                </div>

                <div className="relative">
                  <BingoGrid squares={partySquares} />
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                Party bingo for every kind of celebration
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
                Use one card maker for party icebreakers, table games, guest challenges, and casual prize rounds.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: "🎂", title: "Birthday parties", desc: "Create birthday bingo cards with party moments, gift predictions, cake prompts, and silly challenges for all ages." },
                  { icon: "🃏", title: "Game night", desc: "Add a quick bingo round to board game night, trivia night, or a casual friends gathering." },
                  { icon: "🍽️", title: "Dinner parties", desc: "Use conversation prompts and table moments to keep guests engaged between courses." },
                  { icon: "🏠", title: "Housewarming", desc: "Give guests an easy icebreaker when not everyone knows each other yet." },
                  { icon: "🎤", title: "Karaoke night", desc: "Use song moments, applause, requests, and performer prompts as squares guests can mark." },
                  { icon: "🏖️", title: "Backyard gatherings", desc: "Make casual outdoor parties easier with food, music, yard game, and guest moment squares." },
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

          {/* How It Works */}
          <section className="py-20 bg-slate-50">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-14">
                Create party bingo cards in 3 easy steps
              </h2>
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {[
                  { step: "1", title: "Add your squares", desc: "Type party moments, guest prompts, inside jokes, prize squares, or conversation starters for a standard card." },
                  { step: "2", title: "Shuffle guest cards", desc: "Use the same square list to create different layouts so the whole room does not win at once." },
                  { step: "3", title: "Print or share", desc: "Export a PDF for printed cards or share online cards when guests want to play on phones." },
                ].map((s) => (
                  <div key={s.step} className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg shadow-emerald-200">
                      {s.step}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{s.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-900">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-teal-600/20"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Make your next party the one everyone remembers
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Draft custom party bingo cards in minutes, then print cards for the room or share online cards with guests.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-emerald-50 transition-all duration-300 shadow-xl">
                  Start a Free Party Bingo Draft
                </Link>
                <Link href="/pricing" className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  See Pricing Plans
                </Link>
              </div>
            </div>
          </section>
          <SeoSupportBlock slug="party-bingo" />
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
                  The easiest bingo card generator for parties, celebrations, and good times.
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
                  <li><Link href="/wedding-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Wedding Bingo</Link></li>
                  <li><Link href="/baby-shower-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Baby Shower Bingo</Link></li>
                  <li><Link href="/classroom-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Classroom Bingo</Link></li>
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
