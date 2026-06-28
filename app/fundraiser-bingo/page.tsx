import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Fundraiser Bingo Cards Printable: Charity Night",
  description:
    "Create printable fundraiser bingo cards for charity nights, school events, church halls, tickets, prizes, raffles, sponsors, and 100 guest games.",
  alternates: {
    canonical: "https://mybingocard.com/fundraiser-bingo",
  },
};

const fundraiserSquares = [
  "Ticket Sale", "Silent Auction", "Raffle Ticket", "Paddle Raise", "FREE",
  "Sponsor Table", "Door Prize", "Guest Speaker", "Dessert Dash", "Volunteer Hero",
  "Mission Story", "Matching Gift", "Fund A Need", "Prize Winner", "Four Corners",
  "Donation Goal", "Thank You Speech", "School Spirit", "Church Hall", "Charity Table",
  "Bingo Caller", "Bonus Round", "Grand Total", "Full Card", "Final Prize",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Fundraiser Bingo Cards Printable",
      url: "https://mybingocard.com/fundraiser-bingo",
      description:
        "Create printable fundraiser bingo cards for charity nights, school events, church halls, tickets, prizes, raffles, sponsors, and 100 guest games.",
    },
    {
      "@type": "WebApplication",
      name: "Fundraiser Bingo Card Generator",
      url: "https://mybingocard.com/fundraiser-bingo",
      description:
        "Custom fundraiser bingo card generator for charity bingo nights, nonprofit galas, school fundraisers, church fundraisers, raffle games, prize tables, sponsor moments, house rules, and donor engagement.",
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
          name: "How do fundraiser bingo cards help a charity event?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Fundraiser bingo gives guests a simple activity between raffles, auctions, speeches, dinner, and donation moments. It can highlight sponsors, mission stories, prize tables, donation goals, ticket sales, and volunteer wins.",
          },
        },
        {
          "@type": "Question",
          name: "What should I include on fundraiser bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use squares for raffle tickets, silent auction bids, sponsor tables, paddle raises, mission moments, donation goals, volunteer shoutouts, prize drawings, dessert dashes, ticket sales, and table captain prompts.",
          },
        },
        {
          "@type": "Question",
          name: "Can I print cards for a bingo fundraiser night?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Create your fundraiser bingo prompts, generate shuffled cards, and export printable PDFs for admission packets, table settings, ticket bundles, or check in handouts.",
          },
        },
        {
          "@type": "Question",
          name: "How many cards do I need for a fundraiser bingo night?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Make one card per player, plus extras for walk ups, sponsor guests, volunteers, and table changes. Many school, church, and charity events plan 50, 100, or 500 guest cards depending on room size.",
          },
        },
        {
          "@type": "Question",
          name: "What winning patterns work for fundraiser bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use simple house rules such as one line, four corners, full card, or a final jackpot round. Announce the pattern before each round and check the winning card against the called items before awarding a prize.",
          },
        },
        {
          "@type": "Question",
          name: "Do fundraiser bingo events need rules or permits?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Many charity bingo, raffle, and prize events have local rules. Before selling tickets, raffles, or prize entries, check the rules for your location and keep your house rules clear for players.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make fundraiser bingo cards",
      step: [
        {
          "@type": "HowToStep",
          name: "List event moments",
          text: "Add ticket, raffle, auction, donation, sponsor, volunteer, prize, and mission prompts from your fundraiser schedule.",
        },
        {
          "@type": "HowToStep",
          name: "Choose card count and house rules",
          text: "Plan one card per guest, choose simple winning patterns such as one line or four corners, and decide how prizes will be checked.",
        },
        {
          "@type": "HowToStep",
          name: "Generate unique cards",
          text: "Create shuffled cards for guests, table teams, volunteers, sponsor tables, or donor groups.",
        },
        {
          "@type": "HowToStep",
          name: "Print or share",
          text: "Export PDFs for check in packets, table settings, and ticket bundles, or share online cards for hybrid charity events.",
        },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-teal-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-400 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-teal-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = [
                "from-teal-600 to-emerald-600",
                "from-emerald-600 to-green-600",
                "from-green-600 to-lime-600",
                "from-lime-600 to-yellow-600",
                "from-yellow-600 to-amber-600",
              ];
              return (
                <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>
              );
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Fundraiser Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
                ${i === 4
                  ? "bg-gradient-to-br from-teal-500 to-emerald-500 text-white ring-2 ring-teal-100"
                  : "bg-white text-slate-600 border border-slate-100 hover:border-teal-200 hover:bg-teal-50/50"
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

export default function FundraiserBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="fundraiser-bingo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-slate-50 selection:bg-teal-100 selection:text-teal-900">
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
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-200/40 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-emerald-200/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border border-teal-100 shadow-sm rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Fundraiser Edition</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    Fundraiser Bingo{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">
                      Cards
                    </span>
                  </h1>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Create printable fundraiser bingo cards for charity bingo nights, school fundraisers, nonprofit galas, church events, booster clubs, raffles, auctions, and donor appreciation nights. Add sponsor shoutouts, raffle tickets, mission stories, paddle raises, prize drawings, donation goals, volunteer moments, ticket sales, and winning patterns. Generate shuffled guest cards for table settings, admission packets, ticket bundles, or check in handouts, then export PDFs or share online boards for hybrid events.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-teal-500/20 hover:shadow-teal-500/40 hover:-translate-y-1 transition-all duration-300"
                    >
                      Create Fundraiser Bingo Cards
                    </Link>
                    <Link
                      href="/pricing"
                      className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      See Activation
                    </Link>
                  </div>
                  <p className="text-sm text-slate-400">Draft tools · Premium export · Works for any cause</p>
                </div>

                <div className="relative">
                  <BingoGrid squares={fundraiserSquares} />
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                Fundraiser bingo for charity nights, auctions, raffles, and donor events
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
                Give guests a simple game that fits between dinner, speeches, prize drawings, paddle raises, silent auctions, raffle sales, ticket bundles, and mission moments.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: "💰", title: "Donation Moment Prompts", desc: "Build cards around paddle raises, matching gifts, giving goals, table captains, mission stories, ticket sales, and final totals." },
                  { icon: "📋", title: "Easy Event Setup", desc: "Print 50, 100, or 500 guest cards for admission packets, table settings, volunteer folders, prize tables, or walk up players." },
                  { icon: "🏆", title: "Prize and Sponsor Squares", desc: "Add prize drawings, raffle tickets, sponsor tables, dessert dashes, live auction moments, door prizes, and 50/50 raffle reminders." },
                  { icon: "🖨️", title: "Printable PDFs", desc: "Export PDF files for bulk printing at school fundraisers, church halls, nonprofit galas, PTA nights, and community benefits." },
                  { icon: "❤️", title: "Works for Any Cause", desc: "Use it for schools, churches, nonprofits, hospitals, animal shelters, youth sports, service clubs, booster groups, and local charities." },
                  { icon: "👨‍👩‍👧", title: "Clear House Rules", desc: "Announce one line, four corners, full card, jackpot, or bonus round rules, then check local permit rules before selling tickets or raffle entries." },
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
              <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 to-emerald-600/20"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Turn your next event into a fundraising win
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Draft fundraiser bingo cards for charity nights, raffles, auctions, donor tables, school events, church halls, ticket bundles, and prize rounds, then print or share when you are ready.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-teal-50 transition-all duration-300 shadow-xl">
                  Start a Free Fundraiser Bingo Draft
                </Link>
                <Link href="/pricing" className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  See Activation
                </Link>
              </div>
            </div>
          </section>
          <SeoSupportBlock slug="fundraiser-bingo" />
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
                  The bingo card maker for fundraisers, charity events, ticket bundles, prize rounds, and every occasion.
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
