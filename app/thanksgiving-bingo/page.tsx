import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Thanksgiving Bingo Cards Printable: Family Game",
  description:
    "Create printable Thanksgiving bingo cards for kids, family dinners, Friendsgiving, classrooms, calling cards, and holiday party games.",
  alternates: {
    canonical: "https://mybingocard.com/thanksgiving-bingo",
  },
};

const thanksgivingSquares = [
  "Turkey", "Pumpkin Pie", "Stuffing", "Gravy Boat", "FREE",
  "Cranberry Sauce", "Someone Late", "Mashed Potatoes", "Football Game", "Food Coma",
  "Family Photo", "Third Plate", "Nap Time", "Green Bean Dish", "Dinner Rolls",
  "Leftovers", "Kids Table", "Thankful Toast", "Cornucopia", "Black Friday",
  "Sweet Potato", "Apple Cider", "Calling Card", "Gratitude Note", "Dessert First",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Thanksgiving Bingo Cards Printable",
      url: "https://mybingocard.com/thanksgiving-bingo",
      description:
        "Create printable Thanksgiving bingo cards for kids, family dinners, Friendsgiving, classrooms, calling cards, and holiday party games.",
    },
    {
      "@type": "WebApplication",
      name: "Thanksgiving Bingo Cards Printable Generator",
      url: "https://mybingocard.com/thanksgiving-bingo",
      description:
        "Create custom printable Thanksgiving bingo cards with family dinner prompts, kids table activities, calling cards, Friendsgiving ideas, and holiday PDFs.",
      applicationCategory: "GameApplication",
      operatingSystem: "All",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What should I put on Thanksgiving bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use Thanksgiving food, family dinner moments, gratitude prompts, football, leftovers, kids table activities, fall icons, and simple picture friendly words.",
          },
        },
        {
          "@type": "Question",
          name: "Can I print Thanksgiving bingo cards for kids?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Add Thanksgiving words or pictures, generate shuffled cards, and export printable PDFs for kids, classrooms, family dinners, or Friendsgiving parties.",
          },
        },
        {
          "@type": "Question",
          name: "How do you play Thanksgiving bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Print cards and calling cards, give each player markers, call Thanksgiving words or dinner moments, and award prizes for a line, four corners, or a full card.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make Thanksgiving bingo cards",
      step: [
        {
          "@type": "HowToStep",
          name: "Choose Thanksgiving prompts",
          text: "Add turkey, pie, fall icons, gratitude prompts, family traditions, food table moments, and kids table activities.",
        },
        {
          "@type": "HowToStep",
          name: "Generate unique cards",
          text: "Create shuffled boards so kids, adults, classroom groups, and dinner guests each get a different layout.",
        },
        {
          "@type": "HowToStep",
          name: "Print and play",
          text: "Export PDFs, use calling cards, and play before dinner, while the turkey cooks, or after dessert.",
        },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = ["from-amber-500 to-orange-500","from-orange-500 to-red-500","from-red-500 to-amber-600","from-amber-600 to-yellow-500","from-yellow-500 to-amber-500"];
              return <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>;
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Thanksgiving Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div key={i} className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
              ${i === 12 ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white ring-2 ring-amber-100" : "bg-white text-slate-600 border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50"}`}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ThanksgivingBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="thanksgiving-bingo" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
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
              <Link href="/create" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 shadow-lg">Create Card</Link>
            </div>
          </div>
        </header>

        <main className="pt-28 pb-20 px-4">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wide mb-6">
                🦃 Thanksgiving Bingo
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Custom Printable <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Thanksgiving Bingo</span> Cards
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Create printable Thanksgiving bingo cards for kids, family dinners, Friendsgiving parties, classroom activities, gratitude games, and holiday table fun. Add turkey, pumpkin pie, fall icons, food prompts, family traditions, calling card words, thankful notes, and leftovers moments, then generate unique shuffled cards for every chair at the table.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/create" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:opacity-90 shadow-lg">
                  Create Your Card
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/templates" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-800 rounded-xl font-bold text-lg hover:bg-slate-50 border border-slate-200 shadow-sm">See All Templates</Link>
              </div>
            </div>
            <BingoGrid squares={thanksgivingSquares} />
          </div>

          <div className="max-w-3xl mx-auto bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-12 text-center text-white mb-20">
            <h2 className="text-3xl font-bold mb-4">Give Thanks & Play Bingo! 🦃</h2>
            <p className="text-amber-100 text-lg mb-8">Draft Thanksgiving bingo cards for kids, classrooms, Friendsgiving, family dinner, and after dessert games, then print or share when you are ready.</p>
            <Link href="/create" className="inline-block px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:bg-amber-50 transition-colors shadow-lg">Create Thanksgiving Bingo</Link>
          </div>

          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">More Holiday Bingo Cards</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { href: "/halloween-bingo", label: "🎃 Halloween" },
                { href: "/holiday-bingo", label: "🎄 Holiday" },
                { href: "/super-bowl-bingo", label: "🏈 Super Bowl" },
                { href: "/birthday-bingo", label: "🎂 Birthday" },
                { href: "/office-party-bingo", label: "🏢 Office Party" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="bg-white rounded-xl p-4 text-center text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 transition-all hover:shadow-md">{link.label}</Link>
              ))}
            </div>
          </div>
          <SeoSupportBlock slug="thanksgiving-bingo" />
        </main>

        <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MyBingoCard. All rights reserved. · <Link href="/privacy" className="hover:text-indigo-600">Privacy</Link> · <Link href="/terms" className="hover:text-indigo-600">Terms</Link></p>
        </footer>
      </div>
    </>
  );
}
