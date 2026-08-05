import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Printable Baby Shower Bingo Cards Generator | MyBingoCard",
  description:
    "Create printable baby shower bingo cards in minutes. Custom baby shower bingo card generator for gift bingo, prediction bingo, and custom shower games.",
  alternates: {
    canonical: "https://mybingocard.com/baby-shower-bingo",
  },
};

const babySquares = [
  "Diaper Bag", "Onesie", "Baby Monitor", "Stroller", "FREE",
  "First Cry", "Rattles", "Baby Blanket", "Burp Cloth", "Pacifier",
  "Baby Shoes", "Crib Mobile", "Baby Lotion", "Swaddle", "Gift Wrap",
  "Breast Pump", "Nursery Art", "Baby Wipes", "Sleep Sack", "Teether",
  "Baby Book", "Thermometer", "Play Mat", "Baby Hat", "Nasal Bulb",
];

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Baby Shower Bingo Cards Generator",
  url: "https://mybingocard.com/baby-shower-bingo",
  description:
    "Custom baby shower bingo card maker with editable gift-opening squares and individual printable exports.",
  applicationCategory: "GameApplication",
  operatingSystem: "All",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

function BingoGrid({ squares, label, gradient }: { squares: string[]; label: string; gradient: string }) {
  return (
    <div className="relative">
      <div className="absolute -top-6 -left-6 w-14 h-14 bg-[#ffd9e6] border-[2.5px] border-[#33312e] rounded-2xl rotate-12 shadow-[0_3px_0_#33312e]"></div>
      <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-[#ffb800] border-[2.5px] border-[#33312e] rounded-full -rotate-12 shadow-[0_3px_0_#33312e]"></div>
      <div className="relative bg-white rounded-2xl border-[2.5px] border-[#33312e] shadow-[0_6px_0_#33312e] p-6 transform rotate-2 hover:rotate-0 transition-all duration-500">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {"BINGO".split("").map((letter, i) => (
              <span key={i} className={["text-[#ff5d8f]", "text-[#7c5cff]", "text-[#2ec4b6]", "text-[#ff8a3d]", "text-[#ffb800]"][i % 5]}>{letter}</span>
            ))}
          </div>
          <p className="text-[#a39a88] text-xs uppercase tracking-widest font-bold mt-2">{label}</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-lg text-center text-[9px] leading-tight font-bold cursor-pointer
                ${i === 4
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

export default function BabyShowerBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="baby-shower-bingo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-[#fff7ed]">
        {/* Navbar */}
        <header className="fixed top-0 w-full z-50 bg-[#fff7ed]/95 backdrop-blur-md border-b-[3px] border-[#33312e]">
          <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-[#ff5d8f] border-2 border-[#33312e] rounded-xl flex items-center justify-center shadow-[0_2px_0_#33312e] group-hover:-rotate-6 transition-all duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-xl font-heading font-bold text-[#ff5d8f]">
                MyBingoCard
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/templates" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">Templates</Link>
              <Link href="/pricing" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">Pricing</Link>
              <div className="w-[2px] h-4 bg-[#33312e]/20"></div>
              <Link href="/login" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">Sign In</Link>
              <Link href="/create" className="cbtn cbtn-sm">
                Create a Card
              </Link>
            </nav>
          </div>
        </header>

        <main className="pt-20">
          {/* Hero */}
          <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
            
            

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border-2 border-[#33312e] shadow-[0_2px_0_#33312e] rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-heading font-semibold text-[#5b3fd4] uppercase tracking-wide">🍼 Baby Shower Edition</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-heading font-bold text-[#33312e] mb-6 leading-[1.1]">
                    Baby Shower{" "}
                    <span className="text-[#ff5d8f]">
                      Bingo Cards Generator
                    </span>
                  </h1>
                  <p className="text-lg font-semibold text-[#6b6459] mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Make your baby shower memorable with editable bingo cards built around the gift list and shower moments. Add your own squares or start with suggestions, save one card, and export an individual PDF or PNG for free. When every guest needs a different printable layout, choose a paid batch pack; paid player links support online play.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="cbtn !text-lg !px-8 !py-4"
                    >
                      Generate Baby Shower Bingo
                    </Link>
                    <Link
                      href="/pricing"
                      className="cbtn cbtn-white !text-lg !px-8 !py-4 flex items-center justify-center gap-2"
                    >
                      View Pricing
                    </Link>
                  </div>
                  <p className="text-sm font-semibold text-[#a39a88]">1 free saved card · Individual PDF/PNG export · Paid group options</p>
                </div>

                <div className="relative">
                  <BingoGrid
                    squares={babySquares}
                    label="Baby Shower Edition"
                    gradient="bg-gradient-to-br from-[#ff5d8f] to-[#ff5d8f]"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#33312e] text-center mb-4">
                Why use our baby shower bingo maker?
              </h2>
              <p className="font-semibold text-[#6b6459] text-center max-w-2xl mx-auto mb-14">
                Everything you need for the perfect baby shower bingo game — from PDF exports to Premium virtual play.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: "🎀",
                    title: "Cute Themes",
                    desc: "Choose from adorable baby-themed designs with pastel colors, baby animals, and more.",
                  },
                  {
                    icon: "🖨️",
                    title: "PDF Exports",
                    desc: "Export one PDF or PNG card for home printing or a local print shop at no cost.",
                  },
                  {
                    icon: "🔀",
                    title: "Paid Group Batches",
                    desc: "Use a paid batch pack when every guest needs a different shuffled printable card.",
                  },
                  {
                    icon: "📱",
                    title: "Play Online",
                    desc: "Share a link with paid links for virtual baby showers. Guests mark squares on their phones — no printing needed.",
                  },
                  {
                    icon: "✏️",
                    title: "Custom Word Lists",
                    desc: "Add your own gift list, baby names, or inside jokes. Make it personal and memorable.",
                  },
                  {
                    icon: "💸",
                    title: "Free Individual Card",
                    desc: "Save one card and export it as a PDF or PNG for free. Paid batch packs, player links, and hosted bingo cover group play.",
                  },
                ].map((f) => (
                  <div key={f.title} className="ccard ccard-hover p-8">
                    <div className="text-4xl mb-4">{f.icon}</div>
                    <h3 className="text-xl font-heading font-bold text-[#33312e] mb-2">{f.title}</h3>
                    <p className="font-semibold text-[#6b6459] text-sm leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="cband cband-purple py-24 relative overflow-hidden">
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 tracking-tight">
                Ready to wow the mom-to-be?
              </h2>
              <p className="text-xl font-semibold text-white/85 mb-10 max-w-2xl mx-auto">
                Make a baby shower card in under 2 minutes, then add a paid batch pack when the whole guest list needs unique printable cards.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="cbtn cbtn-yellow !text-lg !px-10 !py-4">
                  Create Baby Shower Bingo Cards
                </Link>
                <Link href="/pricing" className="cbtn cbtn-purple !text-lg !px-10 !py-4 !border-white/80 !shadow-[0_3px_0_rgba(255,255,255,.8)]">
                  See Pricing Plans
                </Link>
              </div>
            </div>
          </section>
          <SeoSupportBlock slug="baby-shower-bingo" />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t-[3px] border-[#33312e] pt-16 pb-12">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div className="col-span-1 md:col-span-2">
                <Link href="/" className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-[#ff5d8f] border-2 border-[#33312e] rounded-lg flex items-center justify-center shadow-[0_2px_0_#33312e]">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <span className="text-xl font-heading font-bold text-[#33312e]">MyBingoCard</span>
                </Link>
                <p className="font-semibold text-[#6b6459] max-w-sm leading-relaxed">
                  A flexible bingo card generator for baby showers, classrooms, office parties, and more.
                </p>
              </div>
              <div>
                <h4 className="font-heading font-bold text-[#33312e] mb-6">Product</h4>
                <ul className="space-y-4">
                  <li><Link href="/create" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Create Cards</Link></li>
                  <li><Link href="/templates" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Templates</Link></li>
                  <li><Link href="/pricing" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-heading font-bold text-[#33312e] mb-6">More Ideas</h4>
                <ul className="space-y-4">
                  <li><Link href="/classroom-bingo" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Classroom Bingo</Link></li>
                  <li><Link href="/office-party-bingo" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Office Party Bingo</Link></li>
                  <li><Link href="/wedding-bingo" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Wedding Bingo</Link></li>
                  <li><Link href="/holiday-bingo" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Holiday Bingo</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t-2 border-[#33312e]/10 pt-8 text-center text-[#a39a88] text-sm font-semibold">
              <p>&copy; {new Date().getFullYear()} MyBingoCard. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
