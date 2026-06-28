import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Family Reunion Bingo Cards: Printable Mingle Game",
  description:
    "Create printable family reunion bingo cards for find someone who games, BBQs, potlucks, family tree prompts, name tags, 30 cards, and online play.",
  alternates: {
    canonical: "https://mybingocard.com/family-reunion-bingo",
  },
};

const reunionSquares = [
  "Find a Cousin", "Same Birthday", "Family Recipe", "Group Photo", "FREE",
  "Family Tree", "Find an Uncle", "Name Tag", "Potluck Dish", "BBQ Table",
  "Traveled Far", "New Baby", "Grandparent Story", "Favorite Aunt", "Photo Booth",
  "Oldest Relative", "Youngest Cousin", "Family History", "Adult Table", "First Reunion",
  "Memory Lane", "Recipe Swap", "Talent Show", "Picnic Blanket", "Call Sheet",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Family Reunion Bingo Cards Printable",
      url: "https://mybingocard.com/family-reunion-bingo",
      description:
        "Create printable family reunion bingo cards for find someone who games, BBQs, potlucks, family tree prompts, name tags, 30 cards, and online play.",
    },
    {
      "@type": "WebApplication",
      name: "Family Reunion Bingo Cards Generator",
      url: "https://mybingocard.com/family-reunion-bingo",
      description:
        "Custom family reunion bingo generator for printable and online reunion games, 24, 30, 50, or 100 card sets, call sheets, family tree prompts, name tag prompts, BBQ prompts, potluck prompts, and find someone who icebreakers.",
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
          name: "What should I put on family reunion bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use a mix of family tree clues, find someone who prompts, uncle and aunt prompts, cousin facts, name tag clues, BBQ moments, potluck dishes, photo booth prompts, reunion traditions, travel facts, old stories, and simple all ages activities.",
          },
        },
        {
          "@type": "Question",
          name: "Can I print different cards for every family member?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Add your family reunion prompts once, generate shuffled cards, then export printable PDFs so each player has a different board. Print 24 cards for small groups, 30 cards for most reunions, or 50 to 100 cards for larger branches.",
          },
        },
        {
          "@type": "Question",
          name: "Can family reunion bingo be a find someone who game?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Use it as mingle bingo by asking relatives to find someone who matches each square, write a name, or mark the space with a pen, sticker, chip, or counter.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need calling cards for family reunion bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Calling cards are optional for mingle play, but a call sheet helps hosts run prize rounds, check winners, call photo prompts, and keep the activity moving at the welcome table.",
          },
        },
        {
          "@type": "Question",
          name: "How do you play family reunion bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Hand out cards with name tags at check in, during lunch, near the BBQ table, or before group photos. Players find relatives or moments that match the squares, mark their cards, and win with five in a row or a full card.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make family reunion bingo cards",
      step: [
        {
          "@type": "HowToStep",
          name: "Choose reunion prompts",
          text: "Add family tree clues, potluck dishes, BBQ moments, photo booth prompts, name tag clues, find someone who prompts, and traditions from your reunion schedule.",
        },
        {
          "@type": "HowToStep",
          name: "Pick the card count",
          text: "Make 24 cards for a small reunion, 30 cards for most family tables, or 50 to 100 cards for large branches, then create shuffled cards so cousins, grandparents, adults, kids, and guests receive different layouts.",
        },
        {
          "@type": "HowToStep",
          name: "Print cards and host sheets",
          text: "Export PDFs for the picnic table, add a call sheet for host led rounds, set out pens, stickers, chips, or counters, and share online cards for relatives joining from home.",
        },
      ],
    },
  ],
};

function BingoGrid({ squares, label, gradient }: { squares: string[]; label: string; gradient: string }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-green-400 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-emerald-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
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
                  ? "bg-gradient-to-br from-emerald-500 to-green-500 text-white ring-2 ring-emerald-100"
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

export default function FamilyReunionBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="family-reunion-bingo" />
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
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-green-200/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border border-emerald-100 shadow-sm rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Family Reunion Edition</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    Family Reunion{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-green-500">
                      Bingo Cards Generator
                    </span>
                  </h1>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Turn the reunion into a real mingling game with printable family reunion bingo cards for BBQs, cookouts, picnics, family tree activities, and all ages icebreakers. Add find someone who prompts, name tag clues, uncle and aunt prompts, recipe clues, group photo moments, travel facts, cousin trivia, grandparent stories, and reunion traditions. Generate 24, 30, 50, or 100 shuffled cards so relatives do not all share the same board, then export PDFs, call sheets, and online cards for the welcome table.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all duration-300"
                    >
                      Generate Reunion Bingo Cards
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
                    squares={reunionSquares}
                    label="Family Reunion Edition"
                    gradient="bg-gradient-to-br from-emerald-500 to-green-500"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                Why use our family reunion bingo maker?
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
                Build printable cards, online boards, call sheets, and simple rules for family tree games, picnic tables, BBQs, cousin mixers, name tag tables, and reunion welcome packets.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: "👨‍👩‍👧‍👦",
                    title: "Family Prompt Squares",
                    desc: "Start with family tree clues, uncle and aunt prompts, name tag clues, BBQ tables, potluck dishes, photo moments, travel facts, old stories, and find someone who prompts.",
                  },
                  {
                    icon: "🖨️",
                    title: "PDF Exports",
                    desc: "Clean PDFs for 24, 30, 50, or 100 card sets, welcome packets, check in folders, picnic tables, or keepsakes for the whole family.",
                  },
                  {
                    icon: "🔀",
                    title: "Unique Every Card",
                    desc: "Every family member gets a different shuffled card for mingle bingo, find someone who play, prize rounds, and full card winner checks.",
                  },
                  {
                    icon: "📱",
                    title: "Virtual Reunion Ready",
                    desc: "Add player links so family members who could not make the trip can still play along from anywhere in the world.",
                  },
                  {
                    icon: "✏️",
                    title: "Custom Family Moments",
                    desc: "Add your own reunion traditions, recipes, nicknames, inside jokes, favorite photos, family history notes, and branch of the family prompts.",
                  },
                  {
                    icon: "💸",
                    title: "Built for Everyone",
                    desc: "Draft family reunion bingo cards for kids, adults, and grandparents first, then activate saves, exports, batches, call sheets, player links, markers, counters, and live hosting when you are ready.",
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

          {/* CTA */}
          <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-900">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-green-600/20"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Ready to bring the family together?
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Draft family reunion bingo cards for BBQs, cookouts, picnics, name tag tables, family tree games, and all ages icebreakers, then print cards, calling cards, call sheets, and online boards when you are ready.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-emerald-50 transition-all duration-300 shadow-xl">
                  Create Family Reunion Bingo Cards
                </Link>
                <Link href="/pricing" className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  See Activation
                </Link>
              </div>
            </div>
          </section>
          <SeoSupportBlock slug="family-reunion-bingo" />
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
                  A flexible bingo card generator for family reunions, classrooms, office parties, and more.
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
