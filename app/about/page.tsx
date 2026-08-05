import type { Metadata } from "next";
import Link from "next/link";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "About Us — MyBingoCard",
  description: "Learn about MyBingoCard — the easiest way to create custom bingo cards for any occasion.",
  alternates: {
    canonical: "https://mybingocard.com/about",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fff7ed]">
      <header className="bg-[#fff7ed]/95 backdrop-blur-md border-b-[3px] border-[#33312e]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#ff5d8f] border-2 border-[#33312e] rounded-lg flex items-center justify-center shadow-[0_2px_0_#33312e]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-heading font-bold text-[#ff5d8f]">MyBingoCard</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">Sign In</Link>
            <Link href="/signup" className="cbtn cbtn-sm">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="ccard !rounded-2xl p-8 md:p-12">
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
                  <li className="text-slate-600">Included templates for common bingo occasions</li>
                  <li className="text-slate-600">Paid live multiplayer bingo rooms for real-time games</li>
                  <li className="text-slate-600">One saved card and individual PDF and PNG exports on the free plan</li>
                  <li className="text-slate-600">Paid batch generation for up to 500 unique printable cards at once</li>
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
                <p className="text-slate-600 leading-relaxed">Create your first card at <Link href="/create" className="text-indigo-600 hover:text-indigo-700 font-medium underline">mybingocard.com/create</Link> or browse our templates at <Link href="/templates" className="text-indigo-600 hover:text-indigo-700 font-medium underline">mybingocard.com/templates</Link>. The free plan includes one saved card and individual PDF/PNG exports.</p>
              </div>

          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-sm">
        <p>&copy; 2026 MyBingoCard. All rights reserved.</p>
      </footer>      <SeoSupportBlock slug="about" />

    </div>
  );
}
