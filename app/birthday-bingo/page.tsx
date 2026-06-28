import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Birthday Bingo Cards Printable: 30 Party Cards",
  description:
    "Create printable birthday bingo cards for kids and adults with 30 card sets, calling cards, markers, prizes, PDF export, and online play.",
  alternates: {
    canonical: "https://mybingocard.com/birthday-bingo",
  },
};

const birthdaySquares = [
  "Birthday Song", "Cake Cutting", "Party Hat", "Piñata", "FREE",
  "Gift Table", "Group Photo", "Candle Wish", "Confetti", "Ice Cream",
  "Funny Speech", "Prize Winner", "Party Game", "Photo Booth", "Dance Break",
  "Cupcakes", "Family Hug", "Wrapping Paper", "Silly Face", "First Slice",
  "Guest Arrives", "Birthday Card", "Party Favor", "Sticker Prize", "Calling Card",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://mybingocard.com/birthday-bingo#webpage",
      name: "Birthday Bingo Cards Printable: 30 Party Cards",
      url: "https://mybingocard.com/birthday-bingo",
      description:
        "Create printable birthday bingo cards for kids and adults with 30 card sets, calling cards, markers, prizes, PDF export, and online play.",
    },
    {
      "@type": "WebApplication",
      "@id": "https://mybingocard.com/birthday-bingo#app",
      name: "Birthday Bingo Cards Printable Generator",
      url: "https://mybingocard.com/birthday-bingo",
      description:
        "Create custom birthday bingo cards with party moments, calling card prompts, printable PDF export, unique shuffled cards, online play options, and custom square lists.",
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
          name: "How do you play birthday bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Give each player a birthday bingo card and markers. Draw calling cards from a bowl or call birthday items, party moments, or custom prompts. Players cover matching squares, and the first player to complete the chosen pattern wins.",
          },
        },
        {
          "@type": "Question",
          name: "How many birthday bingo cards should I print?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Print one card per guest. For larger parties, create enough unique cards for the full guest list, or pair younger kids into small groups when the party has more players than printed cards.",
          },
        },
        {
          "@type": "Question",
          name: "Can birthday bingo work for kids and adults?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Use simple picture style prompts for young kids, party moments for mixed ages, or inside jokes, age milestones, hobbies, and favorite memories for adult birthday parties.",
          },
        },
        {
          "@type": "Question",
          name: "What markers work best for birthday bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Candy, buttons, craft gems, pom poms, bingo chips, washable markers, dot markers, or dry erase markers all work. Laminate cards if you want to reuse them for classroom birthdays or annual family parties.",
          },
        },
        {
          "@type": "Question",
          name: "Can every birthday guest get a different card?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. MyBingoCard can shuffle the same birthday square list into unique card layouts so guests do not all win at the same time.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make birthday bingo cards",
      step: [
        { "@type": "HowToStep", position: 1, text: "Choose birthday items, party moments, gift prompts, favorite foods, hobbies, or custom inside jokes." },
        { "@type": "HowToStep", position: 2, text: "Customize the card title, square list, and free space for the party theme, age, or guest of honor." },
        { "@type": "HowToStep", position: 3, text: "Add calling card prompts so the host can draw items from a bowl, jar, or digital list." },
        { "@type": "HowToStep", position: 4, text: "Shuffle unique cards for every guest and choose row, diagonal, four corners, or full card rules before play starts." },
        { "@type": "HowToStep", position: 5, text: "Print one, two, or four cards per page on paper or card stock, then set out markers or wrapped candy." },
        { "@type": "HowToStep", position: 6, text: "Export printable PDFs or share online cards for guests who will play on phones." },
      ],
    },
  ],
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
                Create printable birthday bingo cards for kids parties, milestone birthdays, classroom celebrations, game nights, and family gatherings. Add birthday images, gift prompts, party favors, inside jokes, age milestones, favorite foods, or simple picture style squares, then shuffle unique cards for each guest. Print a 10, 24, 30, or 40 guest set, make calling cards, choose markers and prizes, export PDFs for party tables, or share online cards for guests who want to play on phones.
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
            <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Birthday bingo that is ready for the whole guest list</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: "🎈", title: "Guest count planning", desc: "Make one card per guest for small parties, 30 card sets for bigger birthdays, or extra unique cards so parents, grandparents, and classmates can join." },
                { icon: "🖨️", title: "Printable party setup", desc: "Export PDFs for paper or card stock, print one, two, or four cards per page, then use candy, chips, dot markers, or dry erase markers." },
                { icon: "✨", title: "Rules and calling cards", desc: "Add gift predictions, cake moments, piñata squares, favorite foods, and call list prompts, then play row, diagonal, four corners, or full card rounds." },
                { icon: "🎁", title: "Birthday theme variants", desc: "Build picture cards for young kids, hobby prompts for teens, milestone memories for adults, or family prompts for grandparents. Swap in favorite snacks, colors, songs, pets, school friends, party favors, and birthday traditions so the game feels personal instead of generic." },
                { icon: "🏫", title: "Classroom birthday rounds", desc: "Teachers can print a reusable class set, laminate the cards, and keep a simple calling list for monthly birthdays. Picture style squares help younger students play without reading every prompt, while older students can use words, memories, or classmate friendly clues." },
                { icon: "🏆", title: "Prize friendly winner checks", desc: "Plan the prize rules before guests start marking cards. Use first row for quick rounds, diagonal or four corners when you have a few prizes, and full card only when you want a longer game with enough calling prompts to avoid tied winners." },
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
            <h2 className="text-3xl font-bold mb-4">Ready for candles, gifts, and party prizes?</h2>
            <p className="text-yellow-100 text-lg mb-8">Draft birthday bingo cards in minutes, then print cards, calling prompts, and winner rules for the party or share online cards with guests.</p>
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
