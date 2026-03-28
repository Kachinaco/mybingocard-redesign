import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";

export const metadata: Metadata = {
  title: "Party Bingo Cards — Free Bingo Card Generator for Any Party",
  description:
    "Create free printable party bingo cards for birthdays, game nights, dinner parties, and celebrations. The best party bingo card generator with instant PDF download and digital play.",
  keywords: [
    "party bingo cards",
    "birthday bingo",
    "game night bingo",
    "dinner party bingo",
    "bingo card generator",
    "free bingo cards",
    "printable bingo cards",
    "custom party games",
  ],
  alternates: {
    canonical: "/party-bingo",
  },
  openGraph: {
    title: "Party Bingo Cards — Free Bingo Card Generator for Any Party",
    description:
      "Create free custom bingo cards for birthdays, game nights, dinner parties, and any celebration. Instant PDF & digital play.",
    url: "https://mybingocard.com/party-bingo",
    type: "website",
  },
};

const partySquares = [
  "Dance Off", "Photo Bomb", "Cake Time", "Toast!", "FREE",
  "Karaoke", "Late Arrival", "Gift Pile", "Group Selfie", "DJ Request",
  "Funny Story", "Pizza!", "Dance Circle", "Confetti", "Bad Joke",
  "Surprise Guest", "Balloon Pop", "Slow Song", "Dessert Bar", "Sing-Along",
  "Sparklers", "Best Dressed", "Card Games", "Belly Laugh", "Last Dance",
];

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Party Bingo Card Generator",
  url: "https://mybingocard.com/party-bingo",
  description:
    "Free party bingo card generator. Create custom printable bingo cards for birthdays, game nights, dinner parties, and any celebration.",
  applicationCategory: "GameApplication",
  operatingSystem: "All",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
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
                Create Free
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
                    Turn any party into an unforgettable event with custom bingo cards! Whether you&apos;re hosting a birthday bash, game night, dinner party, housewarming, or backyard BBQ, our free party bingo card maker creates stunning cards that keep guests entertained all night. Fill squares with party moments like &quot;dance-off,&quot; &quot;cake time,&quot; &quot;surprise guest,&quot; and &quot;group selfie&quot; — or write your own custom squares with inside jokes and personal touches. Every card is uniquely shuffled so each guest plays a different layout, and you can generate as many as you need. Download print-ready PDFs for place settings, share digital links for phone play, or project on a TV. From intimate dinner parties to blowout birthday celebrations, party bingo is the easiest way to break the ice and create memories. Start making your party bingo cards free today!
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
                  <p className="text-sm text-slate-400">Free to start · Sign up in seconds · Instant PDF download</p>
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
                Party bingo for every occasion
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
                Custom bingo cards make every celebration more interactive, memorable, and fun.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: "🎂", title: "Birthday Parties", desc: "Create birthday bingo cards with party moments, gift predictions, and silly challenges for all ages." },
                  { icon: "🃏", title: "Game Night", desc: "Add a bingo round to your game night rotation with custom cards themed to your group." },
                  { icon: "🍽️", title: "Dinner Parties", desc: "Elegant conversation bingo keeps dinner party guests engaged and laughing all evening." },
                  { icon: "🏠", title: "Housewarming", desc: "Fun icebreaker bingo for housewarming parties — perfect when not everyone knows each other." },
                  { icon: "🎤", title: "Karaoke Night", desc: "Song-themed bingo cards that guests mark off as different tunes are performed." },
                  { icon: "🏖️", title: "Backyard BBQ", desc: "Outdoor fun bingo with squares like &quot;someone asks for seconds&quot; and &quot;dog steals food.&quot;" },
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
                  { step: "1", title: "Add Your Squares", desc: "Type your party moments, inside jokes, or choose from our suggestion library. Need 25 items for a standard card." },
                  { step: "2", title: "Customize the Design", desc: "Pick colors, fonts, and a theme that matches your party vibe. Preview your card in real-time." },
                  { step: "3", title: "Print or Share", desc: "Download a print-ready PDF with unique shuffled cards, or share a digital link for phone play." },
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
                Create custom party bingo cards in under 2 minutes. Free — no sign-up required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-emerald-50 transition-all duration-300 shadow-xl">
                  Create Party Bingo Cards Free
                </Link>
                <Link href="/pricing" className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  See Pricing Plans
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
              <p>&copy; 2025 MyBingoCard. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
