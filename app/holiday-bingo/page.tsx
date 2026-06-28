import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";

export const metadata: Metadata = {
  title: "Holiday Bingo Cards Printable: Seasonal Game",
  description:
    "Create printable holiday bingo cards for Christmas, Thanksgiving, Halloween, classrooms, offices, 30 card sets, calling cards, and online play.",
  alternates: {
    canonical: "https://mybingocard.com/holiday-bingo",
  },
};

const holidaySquares = [
  "Santa Claus", "Thanksgiving", "Halloween", "Hot Cocoa", "FREE",
  "Ugly Sweater", "Christmas Tree", "Candy Cane", "Gift Wrap", "Jingle Bells",
  "Stocking", "Holiday Lights", "Calling Card", "Snowman", "Star On Top",
  "Carolers", "Cookie Tray", "Ornaments", "White Elephant", "Prize Table",
  "Class Party", "Office Party", "Holiday Movie", "30 Cards", "New Year",
];

const holidayPlanningTips = [
  {
    title: "Pick the right grid for the group",
    desc: "Use a short 3x3 game for young kids, a quick 4x4 game for party stations, or a full 5x5 board for older students, coworkers, and family game night.",
  },
  {
    title: "Match squares to the event",
    desc: "Build one set for classroom Christmas parties, another for office gift exchanges, and another for family traditions so the prompts feel specific instead of generic.",
  },
  {
    title: "Prepare calling cards and markers",
    desc: "Print a caller list, cut the prompts into slips, or show picture clues. Coins, wrapped candy, stickers, and mini marshmallows all work as easy table markers.",
  },
  {
    title: "Make enough unique cards",
    desc: "Create one card per guest plus a few extras. Use 24 to 30 unique cards for most classrooms and 50 or more for office, church, school, or community events.",
  },
  {
    title: "Choose a winning pattern before play",
    desc: "Announce one row, four corners, diagonal, postage stamp, or blackout before the first call so classrooms, office parties, and family groups all follow the same rules.",
  },
  {
    title: "Reuse cards for more than one party",
    desc: "For classroom centers or annual holiday events, sleeve or laminate the printed cards and keep the same prompt list with the decorations and prize supplies.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Holiday Bingo Cards Printable",
      url: "https://mybingocard.com/holiday-bingo",
      description:
        "Create printable holiday bingo cards for Christmas, Thanksgiving, Halloween, classrooms, office events, winter games, calling cards, and online play.",
    },
    {
      "@type": "WebApplication",
      name: "Christmas Holiday Bingo Card Maker",
      url: "https://mybingocard.com/holiday-bingo",
      description:
        "Christmas, Thanksgiving, Halloween, and holiday bingo card maker for printable cards, classroom parties, office events, family games, calling cards, and online play.",
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
          name: "What should I put on holiday bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use holiday pictures, Christmas words, Thanksgiving foods, Halloween costumes, winter activities, classroom party prompts, office party moments, family traditions, gift exchange clues, and simple calling card terms.",
          },
        },
        {
          "@type": "Question",
          name: "Can I make printable Christmas bingo cards for a classroom?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Add holiday prompts, generate shuffled boards, and export printable PDFs so each student has a different card for the class party.",
          },
        },
        {
          "@type": "Question",
          name: "How do you play holiday bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Print cards, hand out markers, read holiday calling cards or show picture prompts, and let players win with five in a row, four corners, or a full card.",
          },
        },
        {
          "@type": "Question",
          name: "How many holiday bingo cards should I make?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Make one shuffled card for each guest, student, coworker, or family member. Small family games may need 8 to 12 cards, classrooms often need 24 to 30 cards, and large office or church events may need 50 or more cards.",
          },
        },
        {
          "@type": "Question",
          name: "Can I make Thanksgiving or Halloween bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Use Thanksgiving squares such as turkey, pumpkin pie, parade, gratitude, and football, or Halloween squares such as costume, pumpkin, bat, ghost, candy, and trick or treat.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make holiday bingo cards",
      step: [
        {
          "@type": "HowToStep",
          name: "Choose holiday prompts",
          text: "Add Christmas, Thanksgiving, Halloween, winter, family, office party, classroom, and gift exchange words or pictures.",
        },
        {
          "@type": "HowToStep",
          name: "Generate unique cards",
          text: "Create randomized boards so students, coworkers, relatives, or party guests each get a different layout.",
        },
        {
          "@type": "HowToStep",
          name: "Print or share",
          text: "Export PDFs for the party table or share online cards for remote holiday gatherings.",
        },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-green-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-400 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-green-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = [
                "from-red-600 to-rose-600",
                "from-green-600 to-emerald-600",
                "from-red-600 to-rose-600",
                "from-green-600 to-emerald-600",
                "from-red-600 to-rose-600",
              ];
              return (
                <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>
              );
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">🎄 Holiday Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
                ${i === 4
                  ? "bg-gradient-to-br from-red-600 to-green-600 text-white ring-2 ring-green-100"
                  : "bg-white text-slate-600 border border-slate-100 hover:border-green-200 hover:bg-green-50/50"
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

export default function HolidayBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="holiday-bingo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen overflow-x-hidden bg-slate-50 selection:bg-green-100 selection:text-green-900">
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
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-200/40 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-red-200/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border border-green-100 shadow-sm rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">🎄 Holiday Season</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    Christmas Holiday{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-red-600">
                      Bingo Card Maker
                    </span>
                  </h1>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Create printable holiday bingo cards for classroom Christmas parties, Thanksgiving gatherings, Halloween activities, office events, ugly sweater parties, winter break activities, white elephant exchanges, and virtual holiday calls. Add Santa, turkey, pumpkins, snowflakes, gift wrap, holiday lights, cookie trays, calling card words, family traditions, and party prizes. Generate 24, 30, 50, or more shuffled cards so kids, coworkers, and relatives do not all play the same board, then export PDFs or share online cards.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-1 transition-all duration-300"
                    >
                      Create Holiday Bingo Cards
                    </Link>
                    <Link
                      href="/pricing"
                      className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      See Activation
                    </Link>
                  </div>
                  <p className="text-sm text-slate-400">Draft tools · Festive themes · Premium export</p>
                </div>

                <div className="relative">
                  <BingoGrid squares={holidaySquares} />
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                Holiday bingo for every festive occasion
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
                Build printable cards and simple calling prompts for Christmas parties, Thanksgiving dinners, Halloween classrooms, winter games, office celebrations, and family holiday nights.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: "🏫", title: "Classroom Holiday Party", desc: "Print shuffled cards for Christmas parties, Halloween centers, Thanksgiving week, winter break, and quiet holiday stations." },
                  { icon: "👨‍👩‍👧‍👦", title: "Family Gatherings", desc: "Make one game work for kids, parents, grandparents, cousins, Thanksgiving guests, and holiday dinner tables." },
                  { icon: "🎅", title: "Santa Visit Events", desc: "Use picture friendly prompts and simple calling cards while kids wait for Santa or prize drawings." },
                  { icon: "💻", title: "Virtual Holiday Parties", desc: "Share online bingo cards for remote family calls, distributed teams, and hybrid office celebrations." },
                  { icon: "🧥", title: "Ugly Sweater Parties", desc: "Build cards around sweater features, blinking lights, reindeer, snowflakes, and party prizes." },
                  { icon: "🎬", title: "Holiday Movie Night", desc: "Create cards with classic movie moments, cookie trays, cocoa, gift wrap, and winter traditions." },
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
                How to plan a better holiday bingo game
              </h2>
              <p className="text-slate-600 text-center max-w-3xl mx-auto mb-14">
                The best holiday bingo pages answer the host&apos;s next question: which card size to use, how to call squares, how many unique cards to print, and how to keep Christmas, Thanksgiving, Halloween, classroom, office, and family games fair for a full room.
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {holidayPlanningTips.map((tip) => (
                  <div key={tip.title} className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-3">{tip.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{tip.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-900">
              <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-red-600/20"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Make this holiday season the most fun ever
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Draft holiday bingo cards for Christmas parties, Thanksgiving gatherings, Halloween classrooms, office events, and family nights, then print or share when you are ready.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-green-50 transition-all duration-300 shadow-xl">
                  Start a Free Holiday Bingo Draft
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
                  Festive holiday bingo cards for every occasion, including Christmas, Thanksgiving, Halloween, Hanukkah, New Year&apos;s, winter classrooms, and office parties.
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
                  <li><Link href="/baby-shower-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Baby Shower Bingo</Link></li>
                  <li><Link href="/classroom-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Classroom Bingo</Link></li>
                  <li><Link href="/office-party-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Office Party Bingo</Link></li>
                  <li><Link href="/wedding-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Wedding Bingo</Link></li>
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
