import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Birthday Bingo Cards Printable — Custom Birthday Bingo Generator | MyBingoCard",
  description:
    "Create custom printable birthday bingo cards for your party guests. The best birthday bingo card generator — custom squares, PDF export, and digital play for any birthday celebration.",
  alternates: {
    canonical: "https://mybingocard.com/birthday-bingo",
  },
};

const birthdaySquares = [
  "Candles Blown", "Birthday Song", "Cake Cutting", "Party Hat", "FREE",
  "Balloon Pop", "Present Pile", "Happy Tears", "Awkward Speech", "Confetti",
  "Group Photo", "Piñata Time", "Ice Cream", "Surprise Guest", "Silly Dance",
  "Birthday Wish", "Party Games", "Streamer Chaos", "First Slice", "Photo Booth",
  "Birthday Kiss", "Family Hug", "Embarrassing Story", "Age Jokes", "Midnight Snack",
];

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Birthday Bingo Cards Printable Generator",
  url: "https://mybingocard.com/birthday-bingo",
  description:
    "Create custom printable birthday bingo cards for guests. Custom birthday bingo with free PDF export and digital play options.",
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
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-pink-400 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-yellow-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B", "I", "N", "G", "O"].map((l, i) => {
              const colors = [
                "from-yellow-500 to-orange-500",
                "from-orange-500 to-pink-500",
                "from-pink-500 to-rose-500",
                "from-rose-500 to-red-500",
                "from-red-500 to-yellow-500",
              ];
              return (
                <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>
              );
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Birthday Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
                ${i === 12
                  ? "bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-orange-200 ring-2 ring-orange-100"
                  : "bg-white text-slate-600 border border-slate-100 hover:border-orange-200 hover:bg-orange-50/50"
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

export default function BirthdayBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="birthday-bingo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        {/* Header */}
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
          <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-slate-900">MyBingoCard</span>
            </Link>
            <div className="flex gap-3">
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Sign In</Link>
              <Link href="/create" className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg">
                Create Card
              </Link>
            </div>
          </div>
        </header>

        <main className="pt-28 pb-20 px-4">
          {/* Hero */}
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-100 border border-yellow-200 text-yellow-700 text-xs font-bold uppercase tracking-wide mb-6">
                🎂 Birthday Bingo
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Custom Printable <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">Birthday Bingo</span> Cards
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Make any birthday party unforgettable with custom bingo cards. Generate unique cards for every guest, export as PDF for free, and play in minutes.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/30"
                >
                  Create Your Card
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/templates"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-800 rounded-xl font-bold text-lg hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
                >
                  See All Templates
                </Link>
              </div>
            </div>
            <BingoGrid squares={birthdaySquares} />
          </div>

          {/* Features */}
          <div className="max-w-5xl mx-auto mb-20">
            <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Why Use Birthday Bingo?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: "🎈", title: "Keeps Guests Engaged", desc: "No more awkward silences. Bingo gets everyone involved from kids to grandparents." },
                { icon: "🖨️", title: "PDF Export", desc: "Generate unique card drafts, then export a PDF for free." },
                { icon: "✨", title: "Fully Customizable", desc: "Add inside jokes, personalized squares, and custom themes to match any party." },
              ].map((f) => (
                <div key={f.title} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Banner */}
          <div className="max-w-3xl mx-auto bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl p-12 text-center text-white mb-20">
            <h2 className="text-3xl font-bold mb-4">Ready to Party? 🎉</h2>
            <p className="text-yellow-100 text-lg mb-8">Draft your custom birthday bingo cards in under 2 minutes, then start checkout to save.</p>
            <Link
              href="/create"
              className="inline-block px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:bg-yellow-50 transition-colors shadow-lg"
            >
              Create Birthday Bingo Cards
            </Link>
          </div>

          {/* Related Pages */}
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">More Bingo Card Ideas</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { href: "/wedding-bingo", label: "💍 Wedding" },
                { href: "/baby-shower-bingo", label: "👶 Baby Shower" },
                { href: "/bridal-shower-bingo", label: "💐 Bridal Shower" },
                { href: "/graduation-bingo", label: "🎓 Graduation" },
                { href: "/halloween-bingo", label: "🎃 Halloween" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="bg-white rounded-xl p-4 text-center text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 transition-all hover:shadow-md"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <SeoSupportBlock slug="birthday-bingo" />
        </main>

        <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MyBingoCard. All rights reserved. · <Link href="/privacy" className="hover:text-indigo-600">Privacy</Link> · <Link href="/terms" className="hover:text-indigo-600">Terms</Link></p>
        </footer>
      </div>
    </>
  );
}
