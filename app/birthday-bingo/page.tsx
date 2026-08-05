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
    "Create custom printable birthday bingo cards for guests with editable party squares, individual PDF/PNG exports, and paid digital play options.",
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
      <div className="absolute -top-6 -left-6 w-14 h-14 bg-[#cdeee9] border-[2.5px] border-[#33312e] rounded-2xl rotate-12 shadow-[0_3px_0_#33312e]"></div>
      <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-[#ffb800] border-[2.5px] border-[#33312e] rounded-full -rotate-12 shadow-[0_3px_0_#33312e]"></div>
      <div className="relative bg-white rounded-2xl border-[2.5px] border-[#33312e] shadow-[0_6px_0_#33312e] p-6 transform rotate-2 hover:rotate-0 transition-all duration-500">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B", "I", "N", "G", "O"].map((l, i) => {
              const colors = [
                "from-[#ffb800] to-[#ff8a3d]",
                "from-[#ff8a3d] to-[#ff5d8f]",
                "from-[#ff5d8f] to-[#ff5d8f]",
                "from-[#ff5d8f] to-[#ff5d8f]",
                "from-[#ff5d8f] to-[#ffb800]",
              ];
              return (
                <span key={i} className={["text-[#ff5d8f]", "text-[#7c5cff]", "text-[#2ec4b6]", "text-[#ff8a3d]", "text-[#ffb800]"][i % 5]}>{l}</span>
              );
            })}
          </div>
          <p className="text-[#a39a88] text-xs uppercase tracking-widest font-bold mt-2">Birthday Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-lg text-center text-[9px] leading-tight font-bold cursor-pointer
                ${i === 12
                  ? "bg-[#ff5d8f] text-white border-2 border-[#33312e]"
                  : "bg-[#fff7ed] text-[#33312e] border-2 border-[#33312e]"
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
      <div className="min-h-screen bg-[#fff7ed] overflow-x-clip">
        {/* Header */}
        <header className="fixed top-0 w-full z-50 bg-[#fff7ed]/95 backdrop-blur-md border-b-[3px] border-[#33312e]">
          <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-[#ff5d8f] border-2 border-[#33312e] rounded-xl flex items-center justify-center shadow-[0_2px_0_#33312e] group-hover:-rotate-6 transition-all duration-300">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-lg font-heading font-bold text-[#ff5d8f]">MyBingoCard</span>
            </Link>
            <div className="flex gap-3">
              <Link href="/login" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">Sign In</Link>
              <Link href="/create" className="cbtn cbtn-sm">
                Create Card
              </Link>
            </div>
          </div>
        </header>

        <main className="pt-28 pb-20 px-4">
          {/* Hero */}
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border-2 border-[#33312e] shadow-[0_2px_0_#33312e] text-[#5b3fd4] text-xs font-heading font-bold uppercase tracking-wide mb-6">
                🎂 Birthday Bingo
              </div>
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#33312e] mb-6 leading-tight">
                Custom Printable <span className="text-[#ff5d8f]">Birthday Bingo</span> Cards
              </h1>
              <p className="text-xl font-semibold text-[#6b6459] mb-8 leading-relaxed">
                Make any birthday party more interactive with editable bingo cards. Save one card and export an individual PDF or PNG for free, then use a paid batch pack when every guest needs a unique printable layout.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/create"
                  className="cbtn !text-lg !px-8 !py-4 inline-flex items-center gap-2"
                >
                  Create Your Card
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/templates"
                  className="cbtn cbtn-white !text-lg !px-8 !py-4 inline-flex items-center gap-2"
                >
                  See All Templates
                </Link>
              </div>
            </div>
            <BingoGrid squares={birthdaySquares} />
          </div>

          {/* Features */}
          <div className="max-w-5xl mx-auto mb-20">
            <h2 className="text-3xl font-heading font-bold text-[#33312e] text-center mb-12">Why Use Birthday Bingo?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: "🎈", title: "Keeps Guests Engaged", desc: "No more awkward silences. Bingo gets everyone involved from kids to grandparents." },
                { icon: "🖨️", title: "Individual Export", desc: "Export one PDF or PNG card for free, then use a paid batch pack for unique cards across the guest list." },
                { icon: "✨", title: "Fully Customizable", desc: "Add inside jokes, personalized squares, and custom themes to match any party." },
              ].map((f) => (
                <div key={f.title} className="ccard ccard-hover p-8 text-center">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-lg font-heading font-bold text-[#33312e] mb-2">{f.title}</h3>
                  <p className="font-semibold text-[#6b6459] text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Banner */}
          <div className="max-w-3xl mx-auto bg-[#7c5cff] border-[3px] border-[#33312e] shadow-[0_6px_0_#33312e] rounded-3xl p-12 text-center text-white mb-20">
            <h2 className="text-3xl font-bold mb-4">Ready to Party? 🎉</h2>
            <p className="text-white/85 font-semibold text-lg mb-8">Make a custom birthday bingo card in under 2 minutes, then add a paid batch pack when every guest needs a unique printable card.</p>
            <Link
              href="/create"
              className="cbtn cbtn-yellow !text-lg !px-8 !py-4"
            >
              Create Birthday Bingo Cards
            </Link>
          </div>

          {/* Related Pages */}
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-heading font-bold text-[#33312e] text-center mb-8">More Bingo Card Ideas</h2>
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
                  className="cchip !rounded-xl !p-4 text-center"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <SeoSupportBlock slug="birthday-bingo" />
        </main>

        <footer className="bg-white border-t-[3px] border-[#33312e] py-8 text-center text-[#6b6459] text-sm font-semibold">
          <p>&copy; {new Date().getFullYear()} MyBingoCard. All rights reserved. · <Link href="/privacy" className="hover:text-[#ff5d8f]">Privacy</Link> · <Link href="/terms" className="hover:text-[#ff5d8f]">Terms</Link></p>
        </footer>
      </div>
    </>
  );
}
