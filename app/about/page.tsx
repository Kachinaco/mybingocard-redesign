import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us — MyBingoCard",
  description: "Learn about MyBingoCard — the easiest way to create custom bingo cards for any occasion.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">MyBingoCard</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Sign In</Link>
            <Link href="/signup" className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <h1 className="text-3xl font-black text-slate-900 mb-2">About MyBingoCard</h1>

          <div className="mt-8 space-y-8">

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Our Mission</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">MyBingoCard makes it easy for anyone to create beautiful, custom bingo cards for any occasion — from baby showers and weddings to classrooms and team meetings.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">What We Offer</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">A simple card editor that anyone can use in minutes</li>
                  <li className="text-slate-600">24 professionally designed templates for every occasion</li>
                  <li className="text-slate-600">Live multiplayer bingo rooms for real-time games</li>
                  <li className="text-slate-600">PDF and PNG exports for printing or sharing digitally</li>
                  <li className="text-slate-600">Batch generation for creating up to 100 unique cards at once</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Why Bingo?</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">Bingo is one of those rare games that works for everyone — kids, adults, classrooms, parties, corporate events. We built MyBingoCard because we believe great games bring people together, and making custom bingo cards shouldn't be complicated or expensive.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Get Started</h2>
                <p className="text-slate-600 leading-relaxed">Create your first card for free at mybingocard.com/create or browse our templates at mybingocard.com/templates.</p>
              </div>

          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-sm">
        <p>&copy; 2026 MyBingoCard. All rights reserved.</p>
      </footer>
    </div>
  );
}
