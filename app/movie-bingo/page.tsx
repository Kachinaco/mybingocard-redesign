import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Movie Bingo Cards Printable: Watch Party Game",
  description:
    "Create printable movie bingo cards for watch parties, family movie nights, Oscar parties, horror marathons, and film trope games.",
  alternates: {
    canonical: "https://mybingocard.com/movie-bingo",
  },
};

const movieSquares = [
  "Plot Twist", "Jump Scare", "Love Scene", "Car Chase", "FREE",
  "Bad Accent", "Chosen One", "Explosion", "Sequel Setup", "Famous Quote",
  "Montage", "Slow Motion", "Plot Armor", "Villain Speech", "Comic Relief",
  "Training Scene", "Flashback", "Cliffhanger", "Post Credits", "Award Speech",
  "Dramatic Rain", "Cool Walk", "Surprise Ally", "Final Battle", "Happy Ending",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Movie Bingo Cards Printable",
      url: "https://mybingocard.com/movie-bingo",
      description:
        "Create printable movie bingo cards for watch parties, family movie nights, Oscar parties, horror marathons, and film trope games.",
    },
    {
      "@type": "WebApplication",
      name: "Movie Bingo Card Generator",
      url: "https://mybingocard.com/movie-bingo",
      description:
        "Custom movie bingo card generator for printable watch party cards, film trope prompts, award night games, horror movie marathons, and online movie bingo.",
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
          name: "What should I put on movie bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use film tropes, genre moments, famous quotes, jump scares, plot twists, car chases, romantic scenes, post credit scenes, award show moments, and prompts specific to the movie or franchise.",
          },
        },
        {
          "@type": "Question",
          name: "Can I print unique cards for a movie night?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Add your movie prompts once, generate shuffled boards, and export printable PDFs so every watch party guest has a different card.",
          },
        },
        {
          "@type": "Question",
          name: "How do you play movie bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Hand out cards before the movie starts, mark squares when a matching trope or scene happens, and award prizes for five in a row, four corners, or a full card.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make movie bingo cards",
      step: [
        {
          "@type": "HowToStep",
          name: "Pick movie prompts",
          text: "Add film tropes, genre cliches, watch party jokes, award show moments, franchise details, or scene predictions.",
        },
        {
          "@type": "HowToStep",
          name: "Generate unique boards",
          text: "Create shuffled bingo cards so friends, family, students, or party guests each get a different layout.",
        },
        {
          "@type": "HowToStep",
          name: "Print or share",
          text: "Export PDFs for the couch, classroom, or watch party table, or share online cards for remote viewing.",
        },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-400 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-amber-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = [
                "from-amber-600 to-orange-600",
                "from-orange-600 to-red-600",
                "from-red-600 to-rose-600",
                "from-rose-600 to-pink-600",
                "from-pink-600 to-fuchsia-600",
              ];
              return (
                <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>
              );
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Movie Night Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
                ${i === 4
                  ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white ring-2 ring-amber-100"
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

export default function MovieBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="movie-bingo" />
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
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-orange-200/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border border-amber-100 shadow-sm rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Movie Night Edition</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    Movie Bingo{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                      Cards
                    </span>
                  </h1>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Create printable movie bingo cards for watch parties, family movie nights, Oscar parties, horror marathons, date nights, media studies classes, and franchise binges. Add film tropes, famous quotes, genre cliches, plot twists, jump scares, award show moments, post credit scenes, and custom prompts for the exact movie you are watching. Generate shuffled cards so every guest has a different board, then export PDFs or share online cards for remote viewing.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:-translate-y-1 transition-all duration-300"
                    >
                      Create Movie Bingo Cards
                    </Link>
                    <Link
                      href="/pricing"
                      className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      See Activation
                    </Link>
                  </div>
                  <p className="text-sm text-slate-400">Draft tools · Works with any film · Premium export</p>
                </div>

                <div className="relative">
                  <BingoGrid squares={movieSquares} />
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                A customizable watch party companion
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
                Turn passive watching into a game with printable boards, online cards, genre prompts, and simple watch party rules.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: "🎬", title: "Film Trope Prompts", desc: "Use plot twists, jump scares, villain speeches, dramatic rain, post credit scenes, and classic genre moments." },
                  { icon: "✏️", title: "Custom Movie Lists", desc: "Add prompts for a specific film, franchise, director, award show, classroom unit, or themed movie marathon." },
                  { icon: "🎥", title: "Any Genre Works", desc: "Build cards for horror, romance, comedy, action, sci-fi, holiday movies, kids movies, or Oscar night." },
                  { icon: "🖨️", title: "Printable PDFs", desc: "Export clean PDF cards for couch tables, classrooms, sleepovers, date nights, and watch party handouts." },
                  { icon: "🍿", title: "Watch Party Rules", desc: "Mark a square when the scene appears, then play for five in a row, four corners, blackout, or prize rounds." },
                  { icon: "🎞️", title: "Online Or In Person", desc: "Print cards for local guests or share online boards when everyone is watching from different homes." },
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
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-orange-600/20"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Lights, camera, bingo!
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Draft movie bingo cards for watch parties, Oscar night, horror marathons, and family movie nights, then print or share when you are ready.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-amber-50 transition-all duration-300 shadow-xl">
                  Start a Free Movie Bingo Draft
                </Link>
                <Link href="/pricing" className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  See Activation
                </Link>
              </div>
            </div>
          </section>
          <SeoSupportBlock slug="movie-bingo" />
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
                  The bingo card maker for movie nights, watch parties, and every occasion.
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
