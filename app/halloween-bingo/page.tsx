import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Halloween Bingo Cards Printable: Party Game",
  description:
    "Create printable Halloween bingo cards for kids, classrooms, adult parties, trunk or treat events, movie nights, and spooky game night.",
  alternates: {
    canonical: "https://mybingocard.com/halloween-bingo",
  },
};

const halloweenSquares = [
  "Pumpkin", "Candy Corn", "Witch Hat", "Black Cat", "FREE",
  "Full Moon", "Haunted House", "Spider Web", "Trick or Treat", "Ghost",
  "Skeleton", "Vampire Cape", "Costume Contest", "Candy Bowl", "Bat",
  "Monster Mask", "Mummy Wrap", "Broomstick", "Pumpkin Patch", "Class Party",
  "Jump Scare", "Movie Night", "Glow Stick", "Calling Card", "Prize Bag",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Halloween Bingo Cards Printable",
      url: "https://mybingocard.com/halloween-bingo",
      description:
        "Create printable Halloween bingo cards for kids, classrooms, adult parties, trunk or treat events, movie nights, and spooky game night.",
    },
    {
      "@type": "WebApplication",
      name: "Halloween Bingo Cards Printable Generator",
      url: "https://mybingocard.com/halloween-bingo",
      description:
        "Create custom printable Halloween bingo cards with unique shuffled boards, spooky squares, classroom party prompts, candy marker ideas, and online play.",
      applicationCategory: "GameApplication",
      operatingSystem: "All",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What should I put on Halloween bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use a mix of pumpkins, ghosts, bats, costumes, candy, movie moments, class party prompts, trunk or treat clues, and simple picture friendly Halloween words.",
          },
        },
        {
          "@type": "Question",
          name: "Can I print different Halloween bingo cards for a classroom?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Add your Halloween prompts once, generate shuffled cards, and export printable PDFs so each student or party guest gets a different board.",
          },
        },
        {
          "@type": "Question",
          name: "How do you play Halloween bingo at a party?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Hand out cards, use candy or small stickers as markers, call Halloween words or show picture prompts, and award prizes for five in a row, four corners, or a full card.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make Halloween bingo cards",
      step: [
        {
          "@type": "HowToStep",
          name: "Choose spooky prompts",
          text: "Add Halloween icons, classroom party words, costume clues, candy prompts, movie moments, or trunk or treat ideas.",
        },
        {
          "@type": "HowToStep",
          name: "Generate unique cards",
          text: "Create shuffled boards so students, kids, adults, or party guests each receive a different card.",
        },
        {
          "@type": "HowToStep",
          name: "Print and play",
          text: "Export PDFs, use candy markers, read calling cards, and play for five in a row or a full card.",
        },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-orange-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = ["from-orange-500 to-amber-500","from-amber-500 to-orange-600","from-orange-600 to-purple-600","from-purple-600 to-violet-600","from-violet-600 to-orange-500"];
              return <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>;
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Halloween Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div key={i} className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
              ${i === 12 ? "bg-gradient-to-br from-orange-500 to-purple-600 text-white ring-2 ring-orange-100" : "bg-white text-slate-600 border border-slate-100 hover:border-orange-200 hover:bg-orange-50/50"}`}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HalloweenBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="halloween-bingo" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-purple-50">
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
              <Link href="/create" className="bg-gradient-to-r from-orange-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 shadow-lg">Create Card</Link>
            </div>
          </div>
        </header>

        <main className="pt-28 pb-20 px-4">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-orange-700 text-xs font-bold uppercase tracking-wide mb-6">
                🎃 Halloween Bingo
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Custom Printable <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-purple-600">Halloween Bingo</span> Cards
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Create printable Halloween bingo cards for classroom parties, trunk or treat events, kids activities, adult costume parties, family game night, and spooky movie marathons. Add pumpkins, ghosts, bats, candy, costume clues, prize prompts, and calling card words, then generate unique shuffled boards for every player.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/create" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:opacity-90 shadow-lg">
                  Create Your Card
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/templates" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-800 rounded-xl font-bold text-lg hover:bg-slate-50 border border-slate-200 shadow-sm">See All Templates</Link>
              </div>
            </div>
            <BingoGrid squares={halloweenSquares} />
          </div>

          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
            {[
              { icon: "👻", title: "Classroom Party Cards", desc: "Print unique cards for every student and use candy corn, stickers, or small erasers as markers." },
              { icon: "🎃", title: "Movie Night Prompts", desc: "Build boards around spooky movie moments, jump scares, pumpkins, monsters, and classic Halloween scenes." },
              { icon: "🕸️", title: "Trunk Or Treat Games", desc: "Use candy, costume clues, prize bags, and calling cards for a quick activity at church, school, or neighborhood events." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto bg-gradient-to-r from-orange-500 to-purple-600 rounded-3xl p-12 text-center text-white mb-20">
            <h2 className="text-3xl font-bold mb-4">BOO! Ready to Play? 👻</h2>
            <p className="text-orange-100 text-lg mb-8">Create spooky bingo cards in minutes for classrooms, parties, trunk or treat tables, and Halloween movie night. Draft your card first, then activate saves, exports, templates, image cells, player links, and live hosting.</p>
            <Link href="/create" className="inline-block px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:bg-orange-50 transition-colors shadow-lg">Create Halloween Bingo</Link>
          </div>

          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">More Seasonal Bingo Cards</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { href: "/thanksgiving-bingo", label: "🦃 Thanksgiving" },
                { href: "/holiday-bingo", label: "🎄 Holiday" },
                { href: "/super-bowl-bingo", label: "🏈 Super Bowl" },
                { href: "/birthday-bingo", label: "🎂 Birthday" },
                { href: "/classroom-bingo", label: "📚 Classroom" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="bg-white rounded-xl p-4 text-center text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 transition-all hover:shadow-md">{link.label}</Link>
              ))}
            </div>
          </div>
          <SeoSupportBlock slug="halloween-bingo" />
        </main>

        <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MyBingoCard. All rights reserved. · <Link href="/privacy" className="hover:text-indigo-600">Privacy</Link> · <Link href="/terms" className="hover:text-indigo-600">Terms</Link></p>
        </footer>
      </div>
    </>
  );
}
