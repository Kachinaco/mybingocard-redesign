import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Baby Shower Bingo Cards Printable: Gift Game",
  description:
    "Create printable baby shower bingo cards for gift opening, blank or prefilled games, call lists, markers, prizes, virtual showers, and PDFs.",
  alternates: {
    canonical: "https://mybingocard.com/baby-shower-bingo",
  },
};

const babySquares = [
  "Diaper Bag", "Onesie", "Baby Monitor", "Stroller", "FREE",
  "Gift Wrap", "Rattles", "Baby Blanket", "Burp Cloth", "Pacifier",
  "Baby Shoes", "Crib Mobile", "Baby Lotion", "Swaddle", "Bottle Set",
  "Nursery Art", "Baby Wipes", "Sleep Sack", "Teether", "Baby Book",
  "Blank Card", "Prefilled Card", "Calling Card", "Diaper Raffle", "Prize Winner",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://mybingocard.com/baby-shower-bingo#webpage",
      name: "Baby Shower Bingo Cards Printable: Gift Game",
      url: "https://mybingocard.com/baby-shower-bingo",
      description:
        "Create printable baby shower bingo cards for gift opening, classic baby bingo, blank or prefilled cards, call lists, markers, prizes, and virtual shower play.",
    },
    {
      "@type": "WebApplication",
      "@id": "https://mybingocard.com/baby-shower-bingo#app",
      name: "Baby Shower Bingo Cards Generator",
      url: "https://mybingocard.com/baby-shower-bingo",
      description:
        "Create custom baby shower bingo cards with gift prediction squares, classic baby items, blank or prefilled cards, call lists, printable PDF export, unique shuffled cards, and online play options.",
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
          name: "How do you play baby shower bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Give each guest a baby shower bingo card before the game starts. Guests mark squares when a called baby item appears, when the guest of honor opens a matching gift, or when a shower moment happens. Hosts usually choose one row, four corners, or blackout as the winning pattern and verify the winner before handing out a prize.",
          },
        },
        {
          "@type": "Question",
          name: "Can baby shower bingo work for gift opening?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Add likely registry items and baby gifts to the card, or use blank cards so guests write their own gift predictions before presents are opened. Guests mark a square when a matching gift appears.",
          },
        },
        {
          "@type": "Question",
          name: "Should baby shower bingo cards be blank or prefilled?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both formats work. Blank cards are best when guests should predict gifts themselves, while prefilled cards are faster for large showers, coed showers, virtual showers, and hosts who want a ready to print game.",
          },
        },
        {
          "@type": "Question",
          name: "What supplies do I need for baby shower bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Plan one card per guest, a few extra cards, pens, markers or wrapped candy, a call list or calling cards, an answer key for the host, and small prizes. For larger groups, prepare 30 to 50 unique cards so guests do not all share the same board.",
          },
        },
        {
          "@type": "Question",
          name: "Can every baby shower guest get a different card?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. MyBingoCard can shuffle the same baby shower square list into unique layouts so guests do not all play identical cards. This helps with 20, 30, or 50 guest showers where duplicate cards can create messy ties.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make baby shower bingo cards",
      step: [
        { "@type": "HowToStep", position: 1, text: "Choose classic baby items, registry gifts, diaper raffle prompts, advice prompts, wishes for baby, or custom shower moments." },
        { "@type": "HowToStep", position: 2, text: "Decide whether the game should use blank prediction cards, prefilled baby bingo cards, or a mixed list for gift opening." },
        { "@type": "HowToStep", position: 3, text: "Customize the title, square list, free space, parent names, boy, girl, or neutral theme, and call list." },
        { "@type": "HowToStep", position: 4, text: "Shuffle 30 to 50 unique cards when the shower has a larger guest list, then choose one row, four corners, or blackout as the winner rule." },
        { "@type": "HowToStep", position: 5, text: "Export printable PDFs, print on regular paper or card stock, provide markers or wrapped candy, and share online cards for virtual guests." },
      ],
    },
  ],
};

function BingoGrid({ squares, label, gradient }: { squares: string[]; label: string; gradient: string }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-pink-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-rose-400 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-pink-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
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
                  ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white ring-2 ring-pink-100"
                  : "bg-white text-slate-600 border border-slate-100 hover:border-pink-200 hover:bg-pink-50/50"
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

export default function BabyShowerBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="baby-shower-bingo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-slate-50 selection:bg-pink-100 selection:text-pink-900">
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
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-200/40 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-rose-200/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border border-pink-100 shadow-sm rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-semibold text-pink-700 uppercase tracking-wide">🍼 Baby Shower Edition</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    Baby Shower{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">
                      Bingo Cards Generator
                    </span>
                  </h1>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Make the shower easier to host with printable baby shower bingo cards for gift opening, classic baby item bingo, or a custom shower game. Use blank cards for guest gift predictions or prefilled cards for faster setup. Add registry gifts, baby gear, diaper raffle prompts, advice and wishes, parent trivia, or inside jokes, then shuffle 30 to 50 unique cards so every guest has a different layout. Prepare a call list, markers, prizes, PDF export, online cards for virtual showers, and simple winner rules before play starts.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-1 transition-all duration-300"
                    >
                      Generate Baby Shower Bingo
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
                    squares={babySquares}
                    label="Baby Shower Edition"
                    gradient="bg-gradient-to-br from-pink-500 to-rose-500"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                Baby shower bingo for every game style
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
                Use one card maker for classic baby bingo, gift prediction bingo, coed showers, boy or girl themes, neutral themes, and online shower games.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: "🎀",
                    title: "Classic baby bingo",
                    desc: "Use baby gear, nursery items, diapers, bottles, blankets, toys, pacifiers, and stroller gifts as easy squares that every guest understands.",
                  },
                  {
                    icon: "🖨️",
                    title: "Printable PDF cards",
                    desc: "Export cards for home printing, card stock, party tables, or a local print shop. Choose cards per page, use one card per guest, and keep extras for late RSVPs.",
                  },
                  {
                    icon: "🔀",
                    title: "Unique guest cards",
                    desc: "Shuffle the same baby shower list into different layouts for 20, 30, or 50 guests so duplicate cards do not create confusing ties.",
                  },
                  {
                    icon: "📱",
                    title: "Virtual shower play",
                    desc: "Share online cards for remote family, hybrid showers, and guests who need to mark cards on a phone during a video call.",
                  },
                  {
                    icon: "✏️",
                    title: "Blank or prefilled cards",
                    desc: "Use blank cards when guests should write gift predictions, or prefilled cards when you want a ready to print game.",
                  },
                  {
                    icon: "💸",
                    title: "Call lists and winner rules",
                    desc: "Prepare calling cards, a call list, answer key, markers, wrapped candy, and prizes. Tell guests whether one row, four corners, or blackout wins.",
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
              <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 to-rose-600/20"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Ready for gift opening, games, and guest laughs?
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Draft baby shower bingo cards in minutes, then print unique cards for the party, share online cards for virtual guests, and keep the call list ready for the host.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-pink-50 transition-all duration-300 shadow-xl">
                  Create Baby Shower Bingo Cards
                </Link>
                <Link href="/pricing" className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  See Activation
                </Link>
              </div>
            </div>
          </section>
          <SeoSupportBlock slug="baby-shower-bingo" />
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
                  A flexible bingo card generator for baby showers, classrooms, office parties, and more.
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
