import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Welcome - Create Your Bingo Card | MyBingoCard",
  description: "Create custom bingo cards in seconds. Free to start, then save or export when you are ready. Perfect for parties, classrooms, team building, and more.",
  robots: {
    index: true,
    follow: true,
  },
};

const demoBingoItems = [
  "Free Drinks", "Dance Off", "Photo Booth", "Cake Time", "FREE",
  "First Kiss", "Funny Speech", "Crying Guest", "Dad Joke", "Late Arrival",
  "Champagne", "Bouquet", "First Dance", "Dessert", "Confetti",
  "Group Photo", "Live Music", "Toasts", "Slow Dance", "Fireworks",
  "Happy Tears", "Best Man", "Ring Bearer", "Flower Girl", "DJ"
];

function BingoCardDemo() {
  return (
    <div className="relative">
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>

      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-indigo-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-6">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-violet-600 to-indigo-600">B</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-blue-600">I</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-cyan-600">N</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-600 to-teal-600">G</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-teal-600 to-emerald-600">O</span>
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Wedding Edition</p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {demoBingoItems.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-2 rounded-xl text-center text-[10px] leading-tight font-semibold cursor-pointer shadow-sm
                ${i === 12
                  ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-100"
                  : "bg-white text-slate-600 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50"
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

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">

        {/* Hero with card */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          {/* Left - Text */}
          <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-emerald-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Free to start
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Create Your Custom<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
              Bingo Card
            </span>
          </h1>

          <p className="text-xl text-slate-600 mb-8 max-w-xl mx-auto">
            Add your own words, phrases, or images. Download or play online instantly.
          </p>

          {/* Main CTA */}
          <Link
            href="/create?new=1"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start Creating Now
          </Link>

          <p className="text-sm text-slate-500 mt-4">
            Free to create. No account needed.
          </p>
          </div>

          {/* Right - Bingo Card Demo */}
          <div className="hidden md:block">
            <BingoCardDemo />
          </div>
        </div>

        {/* Quick features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 text-center">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Custom Content</h3>
            <p className="text-sm text-slate-600">Add your own text or pick from our image library</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Download PDF</h3>
            <p className="text-sm text-slate-600">Print your cards or share the PDF file</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Play Online</h3>
            <p className="text-sm text-slate-600">Host live games with friends and family</p>
          </div>
        </div>

        {/* Use cases */}
        <div className="text-center mb-12">
          <p className="text-slate-600 mb-4">Perfect for:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Parties", "Classrooms", "Baby Showers", "Team Building", "Weddings", "Holidays", "Game Nights"].map((use) => (
              <span key={use} className="bg-white px-4 py-2 rounded-full text-sm text-slate-700 border border-slate-200">
                {use}
              </span>
            ))}
          </div>
        </div>

        {/* Secondary CTA */}
        <div className="text-center">
          <Link
            href="/create?new=1"
            className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
          >
            Start creating your card
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center">
          <Link href="/" className="text-slate-500 hover:text-slate-700 text-sm">
            MyBingoCard.com
          </Link>
        </div>
      </div>
    </div>
  );
}
