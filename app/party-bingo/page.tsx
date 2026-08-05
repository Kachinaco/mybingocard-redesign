import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Party Bingo Cards — Custom Bingo Card Maker for Any Party",
  description:
    "Create custom printable party bingo cards for birthdays, game nights, dinner parties, and celebrations. Customize the squares, then export an individual PDF or PNG for free or add paid online play.",
  keywords: [
    "party bingo cards",
    "birthday bingo",
    "game night bingo",
    "dinner party bingo",
    "bingo card generator",
    "free bingo cards",
    "printable bingo cards",
    "custom party games",
  ],
  alternates: {
    canonical: "https://mybingocard.com/party-bingo",
  },
  openGraph: {
    title: "Party Bingo Cards — Custom Bingo Card Maker for Any Party",
    description:
      "Create custom bingo cards for birthdays, game nights, dinner parties, and any celebration. Individual PDF/PNG export and paid digital play.",
    url: "https://mybingocard.com/party-bingo",
    type: "website",
  },
};

const partySquares = [
  "Dance Off", "Photo Bomb", "Cake Time", "Toast!", "FREE",
  "Karaoke", "Late Arrival", "Gift Pile", "Group Selfie", "DJ Request",
  "Funny Story", "Pizza!", "Dance Circle", "Confetti", "Bad Joke",
  "Surprise Guest", "Balloon Pop", "Slow Song", "Dessert Bar", "Sing-Along",
  "Sparklers", "Best Dressed", "Card Games", "Belly Laugh", "Last Dance",
];

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Party Bingo Card Generator",
  url: "https://mybingocard.com/party-bingo",
  description:
    "Custom party bingo card generator. Create custom printable bingo cards for birthdays, game nights, dinner parties, and any celebration.",
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
            {["B","I","N","G","O"].map((l, i) => {
              const colors = [
                "from-[#2ec4b6] to-[#2ec4b6]",
                "from-[#2ec4b6] to-[#2ec4b6]",
                "from-[#2ec4b6] to-[#7c5cff]",
                "from-[#7c5cff] to-[#7c5cff]",
                "from-[#7c5cff] to-[#7c5cff]",
              ];
              return (
                <span key={i} className={["text-[#ff5d8f]", "text-[#7c5cff]", "text-[#2ec4b6]", "text-[#ff8a3d]", "text-[#ffb800]"][i % 5]}>{l}</span>
              );
            })}
          </div>
          <p className="text-[#a39a88] text-xs uppercase tracking-widest font-bold mt-2">Party Edition</p>
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

export default function PartyBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="party-bingo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-[#fff7ed] overflow-x-clip">
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
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#2ec4b6]/40 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-[#2ec4b6]/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border border-[#2ec4b6]/15 shadow-sm rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-semibold text-[#2ec4b6] uppercase tracking-wide">🎉 Party Games</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-heading font-bold text-[#33312e] mb-6 leading-[1.1]">
                    Party Bingo Cards{" "}
                    <span className="text-[#ff5d8f]">
                      for Any Celebration
                    </span>
                  </h1>
                  <p className="text-lg font-semibold text-[#6b6459] mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Turn any party into an interactive event with editable bingo cards for birthdays, game nights, dinner parties, housewarmings, and backyard BBQs. Add dance-offs, cake time, surprise guests, group selfies, or your own inside jokes, then save one card and export an individual PDF or PNG for free. Use a paid batch pack for a unique printable card per guest, or add paid player links for phone play.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="cbtn !text-lg !px-8 !py-4"
                    >
                      Create Party Bingo Cards
                    </Link>
                    <Link
                      href="/pricing"
                      className="cbtn cbtn-white !text-lg !px-8 !py-4 inline-flex items-center justify-center gap-2"
                    >
                      View Pricing
                    </Link>
                  </div>
                  <p className="text-sm font-semibold text-[#a39a88]">1 free saved card · Individual PDF/PNG export · Paid group options</p>
                </div>

                <div className="relative">
                  <BingoGrid squares={partySquares} />
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#33312e] text-center mb-4">
                Party bingo for every occasion
              </h2>
              <p className="font-semibold text-[#6b6459] text-center max-w-2xl mx-auto mb-14">
                Custom bingo cards make every celebration more interactive, memorable, and fun.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: "🎂", title: "Birthday Parties", desc: "Create birthday bingo cards with party moments, gift predictions, and silly challenges for all ages." },
                  { icon: "🃏", title: "Game Night", desc: "Add a bingo round to your game night rotation with custom cards themed to your group." },
                  { icon: "🍽️", title: "Dinner Parties", desc: "Elegant conversation bingo keeps dinner party guests engaged and laughing all evening." },
                  { icon: "🏠", title: "Housewarming", desc: "Fun icebreaker bingo for housewarming parties — perfect when not everyone knows each other." },
                  { icon: "🎤", title: "Karaoke Night", desc: "Song-themed bingo cards that guests mark off as different tunes are performed." },
                  { icon: "🏖️", title: "Backyard BBQ", desc: "Outdoor fun bingo with squares like &quot;someone asks for seconds&quot; and &quot;dog steals food.&quot;" },
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

          {/* How It Works */}
          <section className="py-20 bg-[#fff7ed]">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#33312e] text-center mb-14">
                Create party bingo cards in 3 easy steps
              </h2>
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {[
                  { step: "1", title: "Add Your Squares", desc: "Type your party moments, inside jokes, or choose from our suggestion library. Need 25 items for a standard card." },
                  { step: "2", title: "Customize the Design", desc: "Pick colors, fonts, and a theme that matches your party vibe. Preview your card in real-time." },
                  { step: "3", title: "Print or Share", desc: "Export a PDF or share a digital link with paid links for phone play." },
                ].map((s) => (
                  <div key={s.step} className="text-center">
                    <div className="w-16 h-16 bg-[#2ec4b6] border-[2.5px] border-[#33312e] shadow-[0_3px_0_#33312e] rounded-2xl flex items-center justify-center text-white text-2xl font-heading font-bold mx-auto mb-6">
                      {s.step}
                    </div>
                    <h3 className="text-xl font-heading font-bold text-[#33312e] mb-3">{s.title}</h3>
                    <p className="font-semibold text-[#6b6459] text-sm leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#7c5cff]"></div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 tracking-tight">
                Make your next party the one everyone remembers
              </h2>
              <p className="text-xl font-semibold text-white/85 mb-10 max-w-2xl mx-auto">
                Make custom party bingo cards in under 2 minutes, then add a paid batch pack when every guest needs a unique printable card.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="cbtn cbtn-yellow !text-lg !px-10 !py-4">
                  Create Party Bingo Cards
                </Link>
                <Link href="/pricing" className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  See Pricing Plans
                </Link>
              </div>
            </div>
          </section>
          <SeoSupportBlock slug="party-bingo" />
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
                  The easiest bingo card generator for parties, celebrations, and good times.
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
                  <li><Link href="/wedding-bingo" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Wedding Bingo</Link></li>
                  <li><Link href="/baby-shower-bingo" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Baby Shower Bingo</Link></li>
                  <li><Link href="/classroom-bingo" className="font-semibold text-[#6b6459] hover:text-[#ff5d8f] transition-colors">Classroom Bingo</Link></li>
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
