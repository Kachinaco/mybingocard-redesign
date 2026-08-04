import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Super Bowl Bingo Cards Printable — Custom Super Bowl Bingo Generator | MyBingoCard",
  description:
    "Create custom printable Super Bowl bingo cards for your watch party. The best Super Bowl bingo generator — custom squares, PDF export perfect for any football party.",
  alternates: {
    canonical: "https://mybingocard.com/super-bowl-bingo",
  },
};

const superBowlSquares = [
  "Touchdown", "Halftime Show", "Beer Commercial", "Flag on Play", "FREE",
  "Field Goal", "Interception", "Celebrity Cameo", "Funny Ad", "Instant Replay",
  "Sack", "Coin Toss", "Nachos Spilled", "Wardrobe Moment", "Party Bet Won",
  "Coach Challenges", "Two-Minute Warning", "Food Baby", "Overtime", "Referee Argue",
  "Prop Bet", "Puppy Bowl", "National Anthem", "Confetti Drop", "MVP Speech",
];

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Super Bowl Bingo Cards Printable Generator",
  url: "https://mybingocard.com/super-bowl-bingo",
  description:
    "Create custom printable Super Bowl bingo cards for your watch party with editable squares and individual PDF/PNG exports.",
  applicationCategory: "GameApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-6 -left-6 w-14 h-14 bg-[#cdeee9] border-[2.5px] border-[#33312e] rounded-2xl rotate-12 shadow-[0_3px_0_#33312e]"></div>
      <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-[#ffb800] border-[2.5px] border-[#33312e] rounded-full -rotate-12 shadow-[0_3px_0_#33312e]"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = ["from-green-600 to-emerald-600","from-emerald-600 to-teal-600","from-teal-600 to-slate-700","from-slate-700 to-green-700","from-green-700 to-emerald-600"];
              return <span key={i} className={["text-[#ff5d8f]", "text-[#7c5cff]", "text-[#2ec4b6]", "text-[#ff8a3d]", "text-[#ffb800]"][i % 5]}>{l}</span>;
            })}
          </div>
          <p className="text-[#a39a88] text-xs uppercase tracking-widest font-bold mt-2">Super Bowl Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div key={i} className={`aspect-square flex items-center justify-center p-1.5 rounded-lg text-center text-[9px] leading-tight font-bold cursor-pointer
              ${i === 12 ? "bg-[#ff5d8f] text-white border-2 border-[#33312e]" : "bg-[#fff7ed] text-[#33312e] border-2 border-[#33312e]"}`}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SuperBowlBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="super-bowl-bingo" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="min-h-screen bg-[#fff7ed] overflow-x-clip">
        <header className="fixed top-0 w-full z-50 bg-[#fff7ed]/95 backdrop-blur-md border-b-[3px] border-[#33312e]">
          <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-[#ff5d8f] border-2 border-[#33312e] rounded-xl flex items-center justify-center shadow-[0_2px_0_#33312e] group-hover:-rotate-6 transition-all duration-300">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-lg font-heading font-bold text-[#ff5d8f]">MyBingoCard</span>
            </Link>
            <div className="flex gap-3">
              <Link href="/login" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">Sign In</Link>
              <Link href="/create" className="cbtn cbtn-sm">Create Card</Link>
            </div>
          </div>
        </header>

        <main className="pt-28 pb-20 px-4">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border-2 border-[#33312e] shadow-[0_2px_0_#33312e] text-[#5b3fd4] text-xs font-heading font-bold uppercase tracking-wide mb-6">
                🏈 Super Bowl Bingo
              </div>
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#33312e] mb-6 leading-tight">
                Custom Printable <span className="text-[#ff5d8f]">Super Bowl Bingo</span> Cards
              </h1>
              <p className="text-xl font-semibold text-[#6b6459] mb-8 leading-relaxed">
                Even non-football fans can have a blast! Super Bowl bingo keeps your whole watch party engaged — from the commercials to the halftime show to the final score.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/create" className="cbtn !text-lg !px-8 !py-4 inline-flex items-center gap-2">
                  Create Your Card
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/templates" className="cbtn cbtn-white !text-lg !px-8 !py-4 inline-flex items-center gap-2">See All Templates</Link>
              </div>
            </div>
            <BingoGrid squares={superBowlSquares} />
          </div>

          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
            {[
              { icon: "📺", title: "For Every Fan", desc: "Football fans play by game action. Non-fans play by commercials and halftime moments." },
              { icon: "🏆", title: "Party Prizes", desc: "Set prizes for BINGO winners. A simple prize plan gives players another reason to follow along." },
              { icon: "🍕", title: "Print for Everyone", desc: "Use a paid batch pack when each guest needs a different shuffled printable card." },
            ].map((f) => (
              <div key={f.title} className="ccard ccard-hover p-8 text-center">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-heading font-bold text-[#33312e] mb-2">{f.title}</h3>
                <p className="font-semibold text-[#6b6459] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto bg-[#7c5cff] border-[3px] border-[#33312e] shadow-[0_6px_0_#33312e] rounded-3xl p-12 text-center text-white mb-20">
            <h2 className="text-3xl font-bold mb-4">Touchdown! Time to Play 🏈</h2>
            <p className="text-white/85 font-semibold text-lg mb-8">Make a Super Bowl bingo card in minutes, then add a paid batch pack when every guest needs a unique printable card.</p>
            <Link href="/create" className="inline-block px-8 py-4 bg-white text-green-700 rounded-xl font-bold text-lg hover:bg-green-50 transition-colors shadow-lg">Create Super Bowl Bingo</Link>
          </div>

          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-heading font-bold text-[#33312e] text-center mb-8">More Party Bingo Cards</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { href: "/thanksgiving-bingo", label: "🦃 Thanksgiving" },
                { href: "/halloween-bingo", label: "🎃 Halloween" },
                { href: "/holiday-bingo", label: "🎄 Holiday" },
                { href: "/office-party-bingo", label: "🏢 Office Party" },
                { href: "/birthday-bingo", label: "🎂 Birthday" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="cchip !rounded-xl !p-4 text-center">{link.label}</Link>
              ))}
            </div>
          </div>
          <SeoSupportBlock slug="super-bowl-bingo" />
        </main>

        <footer className="bg-white border-t-[3px] border-[#33312e] py-8 text-center text-[#6b6459] text-sm font-semibold">
          <p>&copy; {new Date().getFullYear()} MyBingoCard. All rights reserved. · <Link href="/privacy" className="hover:text-[#ff5d8f]">Privacy</Link> · <Link href="/terms" className="hover:text-[#ff5d8f]">Terms</Link></p>
        </footer>
      </div>
    </>
  );
}
