import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Church Bingo Cards Printable: Sunday School Game",
  description:
    "Create printable church bingo cards for Sunday school, youth groups, Bible study, fundraisers, potlucks, and fellowship events.",
  alternates: {
    canonical: "https://mybingocard.com/church-bingo",
  },
};

const churchSquares = [
  "Bible Verse", "Prayer Request", "Hymn Sung", "Sunday School", "FREE",
  "Youth Group", "Choir Song", "Fellowship Hall", "Potluck Dish", "Welcome Visitor",
  "Bible Story", "Memory Verse", "Mission Trip", "Offering Plate", "Small Group",
  "Pastor Greeting", "Church Van", "Bake Sale", "Volunteer Sign Up", "Communion",
  "Camp Story", "Prayer Circle", "Bulletin Board", "Fundraiser Prize", "Hallelujah",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://mybingocard.com/church-bingo#webpage",
      url: "https://mybingocard.com/church-bingo",
      name: "Church Bingo Cards Printable: Sunday School Game",
      description:
        "Create printable church bingo cards for Sunday school, youth groups, Bible study, fundraisers, potlucks, and fellowship events.",
      isPartOf: {
        "@type": "WebSite",
        name: "MyBingoCard",
        url: "https://mybingocard.com",
      },
      about: [
        { "@type": "Thing", name: "church bingo" },
        { "@type": "Thing", name: "Bible bingo" },
        { "@type": "Thing", name: "Sunday school games" },
        { "@type": "Thing", name: "church fundraiser games" },
      ],
    },
    {
      "@type": "WebApplication",
      "@id": "https://mybingocard.com/church-bingo#app",
      name: "Church Bingo Cards Generator",
      url: "https://mybingocard.com/church-bingo",
      description:
        "Custom church bingo card generator for Sunday school, Bible study, youth group games, church fundraisers, fellowship nights, potlucks, and camps.",
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
      "@id": "https://mybingocard.com/church-bingo#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "What can church bingo cards be used for?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Church bingo cards can be used for Sunday school, Bible study, youth group nights, fellowship meals, church camps, fundraisers, retreats, and volunteer appreciation events.",
          },
        },
        {
          "@type": "Question",
          name: "What should I put on church bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use Bible stories, books of the Bible, memory verses, prayer prompts, church activities, volunteer roles, fellowship moments, fundraiser prizes, or youth group icebreaker prompts.",
          },
        },
        {
          "@type": "Question",
          name: "Can every player get a unique church bingo card?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. MyBingoCard can shuffle your church or Bible themed square list into unique card layouts for each player.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      "@id": "https://mybingocard.com/church-bingo#howto",
      name: "How to make church bingo cards",
      description: "Create printable or online church bingo cards for fellowship, Sunday school, and fundraisers.",
      step: [
        {
          "@type": "HowToStep",
          name: "Choose the church event",
          text: "Pick Sunday school, Bible study, youth group, fundraiser, potluck, fellowship night, camp, or retreat.",
        },
        {
          "@type": "HowToStep",
          name: "Add Bible or fellowship prompts",
          text: "Enter Bible stories, memory verses, church activities, volunteer roles, or mixer prompts.",
        },
        {
          "@type": "HowToStep",
          name: "Shuffle unique cards",
          text: "Generate different layouts for children, youth groups, adults, tables, or teams.",
        },
        {
          "@type": "HowToStep",
          name: "Print or share",
          text: "Export printable PDFs or share online cards for virtual Bible study and hybrid church gatherings.",
        },
      ],
    },
  ],
};

function BingoGrid({ squares, label, gradient }: { squares: string[]; label: string; gradient: string }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-amber-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
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
                  ? "bg-gradient-to-br from-amber-500 to-yellow-500 text-white ring-2 ring-amber-100"
                  : "bg-white text-slate-600 border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50"
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

export default function ChurchBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="church-bingo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-slate-50 selection:bg-amber-100 selection:text-amber-900">
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
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-200/40 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-yellow-200/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border border-amber-100 shadow-sm rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Church Edition</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    Church{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-500">
                      Bingo Cards Generator
                    </span>
                  </h1>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Create printable church bingo cards for Sunday school, Bible study, youth group nights, fellowship meals, fundraisers, camps, retreats, potlucks, and volunteer appreciation events. Add Bible stories, books of the Bible, memory verses, prayer prompts, church activities, youth group icebreakers, and fundraiser prize squares, then shuffle unique cards for every player. Export PDFs for tables and classrooms or share online cards for virtual Bible study and hybrid gatherings.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:-translate-y-1 transition-all duration-300"
                    >
                      Generate Church Bingo Cards
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
                  <BingoGrid
                    squares={churchSquares}
                    label="Church Edition"
                    gradient="bg-gradient-to-br from-amber-500 to-yellow-500"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                Church bingo for Sunday school, fellowship, youth groups, and fundraisers
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
                Use one card maker for Bible lessons, church game nights, retreats, camps, potlucks, and outreach events.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: "⛪",
                    title: "Bible and Fellowship Prompts",
                    desc: "Add Bible stories, books, memory verses, prayer prompts, church roles, and fellowship moments.",
                  },
                  {
                    icon: "🖨️",
                    title: "Printable PDFs",
                    desc: "Export cards for classrooms, fellowship hall tables, fundraiser packets, youth rooms, and take home activities.",
                  },
                  {
                    icon: "🔀",
                    title: "Unique Player Cards",
                    desc: "Shuffle layouts so children, youth groups, adults, teams, and tables do not all receive the same card.",
                  },
                  {
                    icon: "📱",
                    title: "Online or In Person",
                    desc: "Print cards for church events or share online cards for virtual Bible study and hybrid gatherings.",
                  },
                  {
                    icon: "✏️",
                    title: "Custom Church Themes",
                    desc: "Use sermon series, camp themes, outreach topics, seasonal services, or church traditions.",
                  },
                  {
                    icon: "💸",
                    title: "Simple Game Rules",
                    desc: "Choose one row, four corners, blackout, team play, prize drawings, or a timed mixer format.",
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
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-yellow-600/20"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Ready for a better church game night?
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Draft church bingo cards for Sunday school, youth groups, fellowship, fundraisers, and Bible study, then print or share when you are ready.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-amber-50 transition-all duration-300 shadow-xl">
                  Create Church Bingo Cards
                </Link>
                <Link href="/pricing" className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  See Pricing Plans
                </Link>
              </div>
            </div>
          </section>
          <SeoSupportBlock slug="church-bingo" />
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
                  A flexible bingo card generator for churches, classrooms, office parties, and more.
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
