import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Super Bowl Bingo Cards Printable: Party Game",
  description:
    "Create printable Super Bowl bingo cards for watch parties, commercials, halftime, football moments, party prizes, and online play.",
  alternates: {
    canonical: "https://mybingocard.com/super-bowl-bingo",
  },
};

const superBowlSquares = [
  "Touchdown", "Halftime Show", "Commercial Cry", "Flag On Play", "FREE",
  "Field Goal", "Interception", "Celebrity Cameo", "Funny Ad", "Instant Replay",
  "Sack", "Coin Toss", "Nachos Spilled", "Wardrobe Moment", "Party Prize",
  "Coach Challenge", "Two Minute Warning", "Overtime Talk", "Referee Debate", "Big Catch",
  "Prop Bet", "Puppy Bowl", "National Anthem", "Confetti Drop", "MVP Speech",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Super Bowl Bingo Cards Printable",
      url: "https://mybingocard.com/super-bowl-bingo",
      description:
        "Create printable Super Bowl bingo cards for watch parties, commercials, halftime, football moments, party prizes, and online play.",
    },
    {
      "@type": "WebApplication",
      name: "Super Bowl Bingo Cards Printable Generator",
      url: "https://mybingocard.com/super-bowl-bingo",
      description:
        "Create custom printable Super Bowl bingo cards for commercials, halftime show moments, football plays, prop bets, party prizes, and remote watch parties.",
      applicationCategory: "GameApplication",
      operatingSystem: "All",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What should I put on Super Bowl bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use a mix of football plays, commercials, celebrity cameos, halftime moments, food table moments, prop bet prompts, referee calls, and party prize squares.",
          },
        },
        {
          "@type": "Question",
          name: "Can I print different Super Bowl bingo cards for every guest?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Add your Super Bowl prompts once, generate shuffled cards, and export printable PDFs so each guest gets a different board.",
          },
        },
        {
          "@type": "Question",
          name: "How do you play Super Bowl bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Hand out cards before kickoff, mark squares as plays, ads, halftime moments, and party events happen, then award prizes for five in a row, four corners, or blackout.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make Super Bowl bingo cards",
      step: [
        {
          "@type": "HowToStep",
          name: "Choose game and ad prompts",
          text: "Add football plays, commercial themes, celebrity cameos, halftime ideas, food table moments, and prize rules.",
        },
        {
          "@type": "HowToStep",
          name: "Generate unique cards",
          text: "Create shuffled bingo cards so football fans and commercial watchers each get a different layout.",
        },
        {
          "@type": "HowToStep",
          name: "Print or share",
          text: "Export PDFs for the party table or share online cards for remote Super Bowl watch parties.",
        },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-green-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = ["from-green-600 to-emerald-600","from-emerald-600 to-teal-600","from-teal-600 to-slate-700","from-slate-700 to-green-700","from-green-700 to-emerald-600"];
              return <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>;
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Super Bowl Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div key={i} className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
              ${i === 12 ? "bg-gradient-to-br from-green-600 to-emerald-600 text-white ring-2 ring-green-100" : "bg-white text-slate-600 border border-slate-100 hover:border-green-200 hover:bg-green-50/50"}`}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SuperBowlBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="super-bowl-bingo" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-slate-100">
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
          <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-slate-900">MyBingoCard</span>
            </Link>
            <div className="flex gap-3">
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Sign In</Link>
              <Link href="/create" className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 shadow-lg">Create Card</Link>
            </div>
          </div>
        </header>

        <main className="pt-28 pb-20 px-4">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-100 border border-green-200 text-green-700 text-xs font-bold uppercase tracking-wide mb-6">
                🏈 Super Bowl Bingo
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Custom Printable <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">Super Bowl Bingo</span> Cards
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Create printable Super Bowl bingo cards for watch parties, commercial bingo, halftime show games, football plays, prop bets, and party prizes. Add touchdowns, celebrity ads, referee calls, snack table moments, the national anthem, funny commercials, and MVP speech prompts, then generate unique shuffled cards for football fans and guests who are only there for the ads.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/create" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:opacity-90 shadow-lg">
                  Create Your Card
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/templates" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-800 rounded-xl font-bold text-lg hover:bg-slate-50 border border-slate-200 shadow-sm">See All Templates</Link>
              </div>
            </div>
            <BingoGrid squares={superBowlSquares} />
          </div>

          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
            {[
              { icon: "📺", title: "Commercial Bingo", desc: "Add celebrity cameos, emotional ads, product reveals, brand slogans, and funny commercial moments." },
              { icon: "🏆", title: "Watch Party Prizes", desc: "Set prizes for a line, four corners, halftime winner, final score round, or full card blackout." },
              { icon: "🍕", title: "Cards For Every Guest", desc: "Generate unique cards for football fans, kids, casual viewers, and remote friends watching from home." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl p-12 text-center text-white mb-20">
            <h2 className="text-3xl font-bold mb-4">Touchdown! Time to Play 🏈</h2>
            <p className="text-green-100 text-lg mb-8">Draft Super Bowl bingo cards for commercials, halftime, game moments, party food, and prize rounds, then print or share when you are ready.</p>
            <Link href="/create" className="inline-block px-8 py-4 bg-white text-green-700 rounded-xl font-bold text-lg hover:bg-green-50 transition-colors shadow-lg">Create Super Bowl Bingo</Link>
          </div>

          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">More Party Bingo Cards</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { href: "/thanksgiving-bingo", label: "🦃 Thanksgiving" },
                { href: "/halloween-bingo", label: "🎃 Halloween" },
                { href: "/holiday-bingo", label: "🎄 Holiday" },
                { href: "/office-party-bingo", label: "🏢 Office Party" },
                { href: "/birthday-bingo", label: "🎂 Birthday" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="bg-white rounded-xl p-4 text-center text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 transition-all hover:shadow-md">{link.label}</Link>
              ))}
            </div>
          </div>
          <SeoSupportBlock slug="super-bowl-bingo" />
        </main>

        <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MyBingoCard. All rights reserved. · <Link href="/privacy" className="hover:text-indigo-600">Privacy</Link> · <Link href="/terms" className="hover:text-indigo-600">Terms</Link></p>
        </footer>
      </div>
    </>
  );
}
