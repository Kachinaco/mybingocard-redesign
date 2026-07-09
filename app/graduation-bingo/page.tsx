import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";

export const metadata: Metadata = {
  title: "Graduation Bingo Cards Printable — Custom Graduation Bingo Generator | MyBingoCard",
  description:
    "Create custom printable graduation bingo cards for your ceremony or party. The best graduation bingo generator — custom squares, PDF export for any graduation celebration.",
  alternates: {
    canonical: "https://mybingocard.com/graduation-bingo",
  },
};

const graduationSquares = [
  "Cap Toss", "Happy Tears", "Diploma Moment", "Long Speech", "FREE",
  "Name Mispronounced", "Family Wave", "Trip on Stage", "Class Photo", "Mortarboard",
  "Standing Ovation", "Pomp & Circumstance", "Selfie Time", "Future Plans", "Handshake",
  "Proud Parent", "Tassel Turn", "Surprise Gift", "Group Hug", "Late Arrival",
  "Class Motto", "Valedictorian", "Faculty Robes", "Confetti Drop", "After Party",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://mybingocard.com/graduation-bingo#app",
      name: "Graduation Bingo Cards Printable Generator",
      url: "https://mybingocard.com/graduation-bingo",
      description:
        "Create custom printable graduation bingo cards with editable ceremony and party square ideas.",
      applicationCategory: "GameApplication",
      operatingSystem: "All",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      "@id": "https://mybingocard.com/graduation-bingo#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "What should go on graduation bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use ceremony moments, family photos, speeches, diplomas, tassels, and party details that match the actual schedule.",
          },
        },
        {
          "@type": "Question",
          name: "How can graduation bingo work during a ceremony?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use quiet, observable moments and set the rule that guests mark cards silently. A host can verify winners after a break or at the end.",
          },
        },
        {
          "@type": "Question",
          name: "How many graduation bingo cards should I make?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Make one card per guest plus a few extras. Use a paid batch pack when you need many unique printable cards for a larger party.",
          },
        },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = ["from-blue-600 to-indigo-600","from-indigo-600 to-violet-600","from-violet-600 to-blue-600","from-blue-500 to-cyan-600","from-cyan-600 to-blue-600"];
              return <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>;
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Graduation Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div key={i} className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
              ${i === 12 ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-2 ring-blue-100" : "bg-white text-slate-600 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50"}`}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GraduationBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="graduation-bingo" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50">
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
          <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-slate-900">MyBingoCard</span>
            </Link>
            <div className="flex gap-3">
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Sign In</Link>
              <Link href="/create" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 shadow-lg">Create Card</Link>
            </div>
          </div>
        </header>

        <main className="pt-28 pb-20 px-4">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
                🎓 Graduation Bingo
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Custom Printable <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Graduation Bingo</span> Cards
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Make the ceremony and celebration more engaging with editable graduation bingo cards for family and friends. Use moments that fit the real schedule, then export an individual PDF for free.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/create" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:opacity-90 shadow-lg">
                  Create Your Card
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/templates" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-800 rounded-xl font-bold text-lg hover:bg-slate-50 border border-slate-200 shadow-sm">See All Templates</Link>
              </div>
            </div>
            <BingoGrid squares={graduationSquares} />
          </div>

          <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-center text-white mb-20">
            <h2 className="text-3xl font-bold mb-4">Survive the Ceremony in Style 🎓</h2>
            <p className="text-blue-100 text-lg mb-8">Turn ceremony moments, photos, and party traditions into a game guests can play quietly and verify together after a break.</p>
            <Link href="/create" className="inline-block px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg">Create Graduation Bingo</Link>
          </div>

          <section className="max-w-5xl mx-auto mb-20">
            <div className="grid lg:grid-cols-2 gap-8">
              <article className="bg-white rounded-2xl border border-blue-100 p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">How to make graduation bingo work</h2>
                <p className="text-slate-600 leading-relaxed mb-5">
                  Graduation bingo works best as a quiet observation game. Build around moments that are likely to happen, then choose a rule that does not distract from the graduates or the ceremony.
                </p>
                <ol className="space-y-3 text-slate-600 list-decimal list-inside">
                  <li>Use the ceremony schedule to identify certain moments and likely ones.</li>
                  <li>Keep square text positive, readable, and respectful to every graduate.</li>
                  <li>Choose a 3x3 or 4x4 card for a short ceremony, or 5x5 for ceremony plus party.</li>
                  <li>Verify winners during a break or after the final procession.</li>
                </ol>
              </article>
              <article className="bg-white rounded-2xl border border-blue-100 p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Graduation square ideas</h2>
                <p className="text-slate-600 leading-relaxed mb-5">
                  Start with ceremony moments, then add details from the graduate&apos;s school or party. Remove any square that depends on someone being embarrassed or singled out.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm font-medium text-slate-700">
                  {["Diploma moment", "Tassel turn", "Class photo", "Proud family member", "Standing ovation", "School song", "Handshake", "Speech applause", "Cake cutting", "After-party photo"].map((idea) => (
                    <div key={idea} className="rounded-xl bg-blue-50 px-4 py-3">{idea}</div>
                  ))}
                </div>
              </article>
            </div>

            <div className="mt-8 bg-white rounded-2xl border border-blue-100 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-5">Graduation bingo FAQs</h2>
              <div className="grid md:grid-cols-3 gap-6 text-slate-600 leading-relaxed">
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">What belongs on the cards?</h3>
                  <p>Use ceremony moments, diplomas, songs, applause, photos, and party traditions that match the event schedule.</p>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Can guests play during the ceremony?</h3>
                  <p>Yes, when the game is quiet and respectful. Save calls, prizes, and winner verification for a break or the end.</p>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">How many cards should I make?</h3>
                  <p>Make one per guest plus a few extras. Use a paid batch pack when you need many unique printable cards for a larger party.</p>
                </div>
              </div>
              <p className="mt-6 text-slate-600">
                For a school-year memory game, try <Link href="/end-of-year-bingo" className="font-semibold text-indigo-600 hover:text-indigo-700">end-of-year bingo</Link>. For a general celebration, browse <Link href="/party-bingo" className="font-semibold text-indigo-600 hover:text-indigo-700">party bingo cards</Link>.
              </p>
            </div>
          </section>

          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">More Event Bingo Cards</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { href: "/birthday-bingo", label: "🎂 Birthday" },
                { href: "/wedding-bingo", label: "💍 Wedding" },
                { href: "/baby-shower-bingo", label: "👶 Baby Shower" },
                { href: "/classroom-bingo", label: "📚 Classroom" },
                { href: "/office-party-bingo", label: "🏢 Office Party" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="bg-white rounded-xl p-4 text-center text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 transition-all hover:shadow-md">{link.label}</Link>
              ))}
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MyBingoCard. All rights reserved. · <Link href="/privacy" className="hover:text-indigo-600">Privacy</Link> · <Link href="/terms" className="hover:text-indigo-600">Terms</Link></p>
        </footer>
      </div>
    </>
  );
}
