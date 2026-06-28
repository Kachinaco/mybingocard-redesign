import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Music Bingo Cards Printable: Playlist Game",
  description:
    "Create printable music bingo cards for playlists, name that tune games, bars, parties, classrooms, fundraisers, and music trivia nights.",
  alternates: {
    canonical: "https://mybingocard.com/music-bingo",
  },
};

const musicSquares = [
  "Hit Song", "One Hit Wonder", "Classic Rock", "Pop Anthem", "FREE",
  "Country Tune", "80s Hit", "90s Jam", "Love Song", "Dance Track",
  "Movie Theme", "TV Jingle", "Guitar Solo", "Song Intro", "Piano Keys",
  "Sing Along", "Name That Tune", "Remix", "Duet", "Encore",
  "Crowd Favorite", "Hidden Gem", "Chart Topper", "Playlist Pick", "Final Song",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Music Bingo Cards Printable",
      url: "https://mybingocard.com/music-bingo",
      description:
        "Create printable music bingo cards for playlists, name that tune games, bars, parties, classrooms, fundraisers, and music trivia nights.",
    },
    {
      "@type": "WebApplication",
      name: "Music Bingo Card Generator",
      url: "https://mybingocard.com/music-bingo",
      description:
        "Custom music bingo card generator for printable song bingo cards, playlist games, name that tune nights, bar events, fundraisers, classrooms, and online play.",
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
          name: "How do you make music bingo cards from a playlist?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "List the songs, artists, decades, genres, or lyric clues you want players to recognize, generate shuffled cards, then use the playlist as your call sheet during the game.",
          },
        },
        {
          "@type": "Question",
          name: "What should I put on music bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use song titles, artist names, decades, genres, movie themes, TV jingles, one hit wonders, duet prompts, name that tune clues, or playlist categories.",
          },
        },
        {
          "@type": "Question",
          name: "Can I use music bingo for bars or fundraisers?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Create themed cards for bar trivia nights, school events, charity fundraisers, senior activities, classroom games, wedding receptions, or house parties.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make music bingo cards",
      step: [
        {
          "@type": "HowToStep",
          name: "Choose a playlist",
          text: "Pick songs, artists, decades, genres, or name that tune clues from the playlist or event theme.",
        },
        {
          "@type": "HowToStep",
          name: "Generate shuffled cards",
          text: "Create unique music bingo boards so every guest, student, table, or team gets a different card.",
        },
        {
          "@type": "HowToStep",
          name: "Play the songs",
          text: "Use the playlist as the call sheet, let players mark matching squares, and award prizes for lines, corners, or blackout.",
        },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-rose-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-pink-400 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-rose-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = [
                "from-rose-600 to-pink-600",
                "from-pink-600 to-fuchsia-600",
                "from-fuchsia-600 to-purple-600",
                "from-purple-600 to-violet-600",
                "from-violet-600 to-indigo-600",
              ];
              return (
                <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>
              );
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Music Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
                ${i === 4
                  ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white ring-2 ring-rose-100"
                  : "bg-white text-slate-600 border border-slate-100 hover:border-rose-200 hover:bg-rose-50/50"
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

export default function MusicBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="music-bingo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-slate-50 selection:bg-rose-100 selection:text-rose-900">
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
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-200/40 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-pink-200/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border border-rose-100 shadow-sm rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Music Edition</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    Music Bingo{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-500">
                      Cards
                    </span>
                  </h1>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Create printable music bingo cards for playlists, name that tune games, bar trivia nights, school events, fundraisers, senior activities, wedding receptions, and house parties. Add song titles, artists, decades, genres, movie themes, TV jingles, lyric clues, one hit wonders, and custom playlist picks. Generate shuffled cards so every guest, table, team, or student has a different board, then use your playlist as the call sheet and export PDFs or share online cards.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-rose-500/20 hover:shadow-rose-500/40 hover:-translate-y-1 transition-all duration-300"
                    >
                      Create Music Bingo Cards
                    </Link>
                    <Link
                      href="/pricing"
                      className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      See Activation
                    </Link>
                  </div>
                  <p className="text-sm text-slate-400">Draft tools · Any genre · Premium export</p>
                </div>

                <div className="relative">
                  <BingoGrid squares={musicSquares} />
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                Everything you need for music bingo night
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
                Build printable cards, online boards, and call sheets for playlist games, DJ nights, classrooms, bars, and fundraisers.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: "🎵", title: "Name That Tune Play", desc: "Play a song intro, chorus, or clue while players mark the matching song, artist, genre, or decade." },
                  { icon: "🎧", title: "Playlist Based Cards", desc: "Build bingo cards from party playlists, decade hits, country nights, wedding songs, school themes, or bar trivia sets." },
                  { icon: "🎉", title: "Event Ready", desc: "Use music bingo for bars, fundraisers, classrooms, team socials, senior centers, family parties, and wedding receptions." },
                  { icon: "🖨️", title: "PDF Or Online Cards", desc: "Export printable PDFs for table teams or share online cards for phones, remote players, and hybrid events." },
                  { icon: "🎸", title: "Genre Themes", desc: "Create cards for classic rock, 80s pop, country, hip hop, jazz, Broadway, Disney songs, or holiday music." },
                  { icon: "👨‍👩‍👧", title: "Simple Call Sheet", desc: "Use your playlist as the call sheet, shuffle songs, and award prizes for one line, four corners, or blackout." },
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
              <div className="absolute inset-0 bg-gradient-to-br from-rose-600/20 to-pink-600/20"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Hit play on the best party game ever
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Draft music bingo cards for playlists, bars, parties, fundraisers, classrooms, and trivia nights, then print or share when you are ready.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-rose-50 transition-all duration-300 shadow-xl">
                  Start a Free Music Bingo Draft
                </Link>
                <Link href="/pricing" className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  See Activation
                </Link>
              </div>
            </div>
          </section>
          <SeoSupportBlock slug="music-bingo" />
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
                  The bingo card maker for music nights, parties, classrooms, and every occasion.
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
