import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";

export const metadata: Metadata = {
  title: "Bridal Shower Bingo Cards Printable — Custom Bridal Shower Bingo Generator | MyBingoCard",
  description:
    "Create custom printable bridal shower bingo cards for your guests. The best bridal shower bingo card generator — custom squares, free PDF export for any bridal shower.",
  alternates: {
    canonical: "https://mybingocard.com/bridal-shower-bingo",
  },
};

const bridalSquares = [
  "Engagement Ring", "Bridal Veil", "Something Blue", "Champagne Toast", "FREE",
  "Flower Crown", "Maid of Honor", "Gift Unwrapped", "Happy Tears", "Love Advice",
  "Bridesmaids", "Lace Lingerie", "Kitchen Gadget", "Photo Album", "Group Hug",
  "Funny Proposal", "First Dance Song", "Blushing Bride", "Wedding Date", "Bouquet",
  "Spa Gift", "Honeymoon Hint", "Future Mother-in-Law", "Awkward Gift", "Brunch Mimosa",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://mybingocard.com/bridal-shower-bingo#app",
      name: "Bridal Shower Bingo Cards Printable Generator",
      url: "https://mybingocard.com/bridal-shower-bingo",
      description:
        "Create custom printable bridal shower bingo cards with editable square ideas and individual PDF export.",
      applicationCategory: "GameApplication",
      operatingSystem: "All",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      "@id": "https://mybingocard.com/bridal-shower-bingo#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "What should go on bridal shower bingo cards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use a mix of gift categories, wedding details, and shower moments that guests can spot while the bride opens presents.",
          },
        },
        {
          "@type": "Question",
          name: "How many bridal shower bingo cards should I make?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Make one card per guest plus a few extras. Use a larger shuffled batch when you need a unique card for each guest.",
          },
        },
        {
          "@type": "Question",
          name: "How do guests win bridal shower bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Decide before gift opening whether a winning card needs one line, four corners, or a full blackout, then verify each marked square against the gifts or moments that occurred.",
          },
        },
      ],
    },
  ],
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
              const colors = ["from-rose-400 to-pink-500","from-pink-500 to-fuchsia-500","from-fuchsia-500 to-purple-500","from-purple-500 to-rose-500","from-rose-500 to-pink-400"];
              return <span key={i} className={["text-[#ff5d8f]", "text-[#7c5cff]", "text-[#2ec4b6]", "text-[#ff8a3d]", "text-[#ffb800]"][i % 5]}>{l}</span>;
            })}
          </div>
          <p className="text-[#a39a88] text-xs uppercase tracking-widest font-bold mt-2">Bridal Shower Edition</p>
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

export default function BridalShowerBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="bridal-shower-bingo" />
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
                💐 Bridal Shower Bingo
              </div>
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#33312e] mb-6 leading-tight">
                Custom Printable <span className="text-[#ff5d8f]">Bridal Shower Bingo</span> Cards
              </h1>
              <p className="text-xl font-semibold text-[#6b6459] mb-8 leading-relaxed">
                Turn gift opening into a party game with editable bingo cards for guests. Start with familiar shower moments, export an individual PDF for free, and add paid batches or online sharing only if the event needs them.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/create" className="cbtn !text-lg !px-8 !py-4 inline-flex items-center gap-2">
                  Create Your Card
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/templates" className="cbtn cbtn-white !text-lg !px-8 !py-4 inline-flex items-center gap-2">See All Templates</Link>
              </div>
            </div>
            <BingoGrid squares={bridalSquares} />
          </div>

          <div className="max-w-3xl mx-auto bg-[#7c5cff] border-[3px] border-[#33312e] shadow-[0_6px_0_#33312e] rounded-3xl p-12 text-center text-white mb-20">
            <h2 className="text-3xl font-bold mb-4">She Said Yes! Now Make It Fun 💍</h2>
            <p className="text-white/85 font-semibold text-lg mb-8">Bridal shower bingo gives guests something to follow while gifts are opened. Build an editable card, export an individual PDF for free, then choose a paid batch or online sharing if you need it.</p>
            <Link href="/create" className="cbtn cbtn-yellow !text-lg !px-8 !py-4">Create Bridal Shower Bingo</Link>
          </div>

          <section className="max-w-5xl mx-auto mb-20">
            <div className="grid lg:grid-cols-2 gap-8">
              <article className="bg-white rounded-2xl border border-rose-100 p-8 shadow-sm">
                <h2 className="text-2xl font-heading font-bold text-[#33312e] mb-4">How to set up bridal shower gift bingo</h2>
                <p className="font-semibold text-[#6b6459] leading-relaxed mb-5">
                  The easiest format is a quiet table game: guests mark a square when the bride opens a matching gift or when a planned shower moment happens. Start with broad categories so the game does not reveal registry surprises.
                </p>
                <ol className="space-y-3 font-semibold text-[#6b6459] list-decimal list-inside">
                  <li>Use gift categories, wedding details, and a few light shower moments.</li>
                  <li>Make more than 24 prompts so shuffled cards do not all look alike.</li>
                  <li>Choose one winning pattern before the first present is opened.</li>
                  <li>Keep a short list of opened gifts so a winning card is easy to verify.</li>
                </ol>
              </article>
              <article className="bg-white rounded-2xl border border-rose-100 p-8 shadow-sm">
                <h2 className="text-2xl font-heading font-bold text-[#33312e] mb-4">Square ideas that feel personal</h2>
                <p className="font-semibold text-[#6b6459] leading-relaxed mb-5">
                  Mix dependable gift categories with details that fit the couple. Avoid exact brand names or overly specific gifts, then edit the list once you know the shower plan.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm font-bold text-[#33312e]">
                  {["Cookware", "Bath towels", "Serving tray", "Gift card", "Wedding date", "Honeymoon hint", "Something blue", "Advice card", "Champagne toast", "Group photo"].map((idea) => (
                    <div key={idea} className="rounded-xl bg-rose-50 px-4 py-3">{idea}</div>
                  ))}
                </div>
              </article>
            </div>

            <div className="mt-8 bg-white rounded-2xl border border-rose-100 p-8 shadow-sm">
              <h2 className="text-2xl font-heading font-bold text-[#33312e] mb-5">Bridal shower bingo FAQs</h2>
              <div className="grid md:grid-cols-3 gap-6 font-semibold text-[#6b6459] leading-relaxed">
                <div>
                  <h3 className="font-heading font-bold text-[#33312e] mb-2">What should go on the cards?</h3>
                  <p>Use a mix of gift categories, wedding details, and shower moments guests can recognize without interrupting gift opening.</p>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-[#33312e] mb-2">How many cards do I need?</h3>
                  <p>Make one per guest plus a few extras. Use a larger shuffled batch when every guest needs a different printable card.</p>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-[#33312e] mb-2">How do guests win?</h3>
                  <p>Choose one line, four corners, or blackout before play begins, then verify every marked square against the gifts or moments that occurred.</p>
                </div>
              </div>
              <p className="mt-6 font-semibold text-[#6b6459]">
                For a gift-only list, start with <Link href="/bridal-shower-gift-bingo" className="font-semibold text-rose-600 hover:text-rose-700">bridal shower gift bingo</Link>. For reception moments, use <Link href="/wedding-reception-bingo" className="font-semibold text-rose-600 hover:text-rose-700">wedding reception bingo</Link>.
              </p>
            </div>
          </section>

          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-heading font-bold text-[#33312e] text-center mb-8">More Event Bingo Cards</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { href: "/wedding-bingo", label: "💍 Wedding" },
                { href: "/baby-shower-bingo", label: "👶 Baby Shower" },
                { href: "/birthday-bingo", label: "🎂 Birthday" },
                { href: "/graduation-bingo", label: "🎓 Graduation" },
                { href: "/office-party-bingo", label: "🏢 Office Party" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="cchip !rounded-xl !p-4 text-center">{link.label}</Link>
              ))}
            </div>
          </div>
        </main>

        <footer className="bg-white border-t-[3px] border-[#33312e] py-8 text-center text-[#6b6459] text-sm font-semibold">
          <p>&copy; {new Date().getFullYear()} MyBingoCard. All rights reserved. · <Link href="/privacy" className="hover:text-[#ff5d8f]">Privacy</Link> · <Link href="/terms" className="hover:text-[#ff5d8f]">Terms</Link></p>
        </footer>
      </div>
    </>
  );
}
