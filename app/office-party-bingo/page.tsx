import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Office Bingo Card Generator — Free Work Party Bingo | MyBingoCard",
  description:
    "Create hilarious office bingo cards for your next work party or team meeting. Custom office bingo card generator — perfect for holiday parties, team events, and remote meetings.",
  alternates: {
    canonical: "https://mybingocard.com/office-party-bingo",
  },
};

const officeSquares = [
  "Buzzword", "Free Snacks", "IT Issues", "Late Start", "FREE",
  "Long Meeting", "Coffee Run", "Birthday Cake", "Awkward Hug", "Office Gossip",
  "Zoom Freeze", "Mic Muted", "Fire Drill", "Team Photo", "Pizza Order",
  "Secret Santa", "Karaoke", "Ugly Sweater", "White Elephant", "Boss Speech",
  "Happy Hour", "Potluck", "Door Prize", "Name Tag", "Team Building",
];

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Office Bingo Card Generator",
  url: "https://mybingocard.com/office-party-bingo",
  description:
    "Custom office bingo card maker for work parties, holiday events, and team meetings with editable workplace square ideas.",
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
      <div className="absolute -top-6 -left-6 w-14 h-14 bg-[#ffd9e6] border-[2.5px] border-[#33312e] rounded-2xl rotate-12 shadow-[0_3px_0_#33312e]"></div>
      <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-[#ffb800] border-[2.5px] border-[#33312e] rounded-full -rotate-12 shadow-[0_3px_0_#33312e]"></div>
      <div className="relative bg-white rounded-2xl border-[2.5px] border-[#33312e] shadow-[0_6px_0_#33312e] p-6 transform rotate-2 hover:rotate-0 transition-all duration-500">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = [
                "from-[#ffb800] to-[#ff8a3d]",
                "from-[#ff8a3d] to-[#ff5d8f]",
                "from-[#ff5d8f] to-[#ff5d8f]",
                "from-[#ff5d8f] to-[#ff5d8f]",
                "from-[#ff5d8f] to-[#ff5d8f]",
              ];
              return (
                <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>
              );
            })}
          </div>
          <p className="text-[#a39a88] text-xs uppercase tracking-widest font-bold mt-2">Office Party Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-lg text-center text-[9px] leading-tight font-bold cursor-pointer
                ${i === 4
                  ? "bg-[#ffb800] text-white border-2 border-[#33312e]"
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

export default function OfficePartyBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="office-party-bingo" />
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
                    <span className="text-xs font-heading font-semibold text-[#5b3fd4] uppercase tracking-wide">💼 Office Fun</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-heading font-bold text-[#33312e] mb-6 leading-[1.1]">
                    Office Bingo{" "}
                    <span className="text-[#ff5d8f]">
                      Card Generator
                    </span>
                  </h1>
                  <p className="text-lg font-semibold text-[#6b6459] mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Liven up a work party, holiday gathering, or team meeting with editable office bingo cards full of familiar workplace moments. Add inside jokes, company memes, or department-specific phrases, save one card, and export an individual PDF or PNG for free. Use a paid batch pack for unique printable cards across the office, or add paid player links for remote teams.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="cbtn !text-lg !px-8 !py-4"
                    >
                      Generate Office Bingo Cards
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
                  <BingoGrid squares={officeSquares} />
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#33312e] text-center mb-4">
                Office bingo for every work occasion
              </h2>
              <p className="font-semibold text-[#6b6459] text-center max-w-2xl mx-auto mb-14">
                From holiday parties to weekly standups — office bingo cards bring the team together.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: "🎄", title: "Holiday Office Party", desc: "Ugly sweaters, Secret Santa, potluck dishes — create holiday-themed bingo that gets the whole office laughing." },
                  { icon: "💻", title: "Virtual Meeting Bingo", desc: "\"You're on mute!\" — make remote meetings fun with relatable work-from-home bingo squares." },
                  { icon: "🏆", title: "Team Building Events", desc: "Break the ice at company retreats and team-building days with custom corporate bingo cards." },
                  { icon: "🎁", title: "White Elephant Games", desc: "Add a bingo twist to gift exchanges — first to see certain gifts on their card wins a prize!" },
                  { icon: "🥳", title: "Employee Milestones", desc: "Celebrate birthdays, work anniversaries, and retirements with personalized bingo cards." },
                  { icon: "📊", title: "Sales Kickoff Events", desc: "Turn all-hands meetings and conference sessions into interactive bingo games." },
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
                Make the office party one they&apos;ll talk about Monday
              </h2>
              <p className="text-xl font-semibold text-white/85 mb-10 max-w-2xl mx-auto">
                Make an office bingo card in under 2 minutes, then choose a paid batch pack or player links when the team needs its own cards.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="cbtn cbtn-yellow !text-lg !px-10 !py-4">
                  Create Office Bingo Cards
                </Link>
                <Link href="/pricing" className="cbtn cbtn-purple !text-lg !px-10 !py-4 !border-white/80 !shadow-[0_3px_0_rgba(255,255,255,.8)]">
                  See Pricing Plans
                </Link>
              </div>
            </div>
          </section>
          <SeoSupportBlock slug="office-party-bingo" />
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
                  The easiest bingo card generator for office parties, team events, and workplace fun.
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
                  <li><Link href="/baby-shower-bingo" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Baby Shower Bingo</Link></li>
                  <li><Link href="/classroom-bingo" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Classroom Bingo</Link></li>
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
