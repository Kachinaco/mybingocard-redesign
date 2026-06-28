import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";

export const metadata: Metadata = {
  title: "Bridal Shower Bingo Cards Printable: Gift Game Rules",
  description:
    "Create printable bridal shower bingo cards for gift opening. Get rules, blank vs prefilled card tips, prize ideas, markers, and PDF cards.",
  alternates: {
    canonical: "https://mybingocard.com/bridal-shower-bingo",
  },
};

const bridalSquares = [
  "Registry Gift", "Wine Glasses", "Bridal Veil", "Something Blue", "FREE",
  "Champagne Toast", "Maid of Honor", "Gift Unwrapped", "Happy Tears", "Cookware",
  "Bridesmaid Story", "Kitchen Gadget", "Photo Frame", "Group Hug", "Guest Selfie",
  "Funny Proposal", "Honeymoon Fund", "Bride Laughs", "Wedding Date", "Bouquet",
  "Spa Gift", "Towels", "Family Recipe", "Brunch Mimosa", "Prize Winner",
];

const bridalPlanningTips = [
  {
    heading: "Choose the bridal shower bingo format",
    body:
      "Gift opening bingo works best when guests fill or receive squares with registry gifts, household items, honeymoon items, and funny shower moments. Find the guest bingo is better as an icebreaker before food or gifts because guests mingle to match prompts with real people in the room. Classic called bingo works when the host wants to read bridal words from a call list instead of waiting for gifts.",
  },
  {
    heading: "Make enough unique cards",
    body:
      "Plan one card per guest plus a few extras for late attendees, hosts, and family members who decide to join. Most printable packs in this market offer 30 to 50 cards because showers often include mixed friend and family groups. Unique shuffled cards keep the game fair because everyone watches the same gift table, but the squares appear in different positions.",
  },
  {
    heading: "Set the winning pattern before play",
    body:
      "Tell guests whether they need five in a row, four corners, an X pattern, picture frame, or blackout before the bride starts opening gifts. For shorter showers, one row or four corners keeps the game moving. For long gift openings, blackout can work if you have multiple small prizes and enough time to verify each winner.",
  },
  {
    heading: "Use practical square ideas",
    body:
      "Strong bridal shower squares include towels, cookware, wine glasses, picture frame, gift card, candle, mixing bowls, sheet set, recipe book, honeymoon fund, bride laughs, happy tears, maid of honor story, honeymoon hint, family recipe, something blue, group photo, and thank you card.",
  },
  {
    heading: "Prepare markers and small prizes",
    body:
      "Put pens, stickers, candy pieces, or small markers near the cards before guests sit down. Simple prizes such as candles, coffee cards, candy, mini champagne bottles, lotion, or spa gifts are enough because the game is meant to support the shower, not take over the event. If two guests call bingo at once, verify both cards and use a small tie prize or first verified card rule.",
  },
  {
    heading: "Decide between blank and prefilled cards",
    body:
      "Blank bridal bingo cards are useful when guests should predict the gifts the bride will open. Prefilled cards are better when you want fast setup and less writing at the tables. For a large shower, prefilled unique cards save time; for a small shower, blank prediction cards create more conversation.",
  },
  {
    heading: "Run the game during gift opening",
    body:
      "Hand out cards before the bride starts opening gifts. Guests mark squares as matching gifts appear, then call bingo when they complete the announced pattern. Ask the winner to read the marked gifts out loud so the host can confirm each gift has already been opened.",
  },
  {
    heading: "Use an alternate version when gifts stay wrapped",
    body:
      "For display showers or no gift opening showers, use guest prompts, bridal trivia, couple facts, shower moments, or advice card themes instead of registry gifts. This keeps the game playable even when gifts are displayed on a table or opened later at home.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://mybingocard.com/bridal-shower-bingo#webpage",
      name: "Bridal Shower Bingo Cards Printable - Gift Bingo Game",
      url: "https://mybingocard.com/bridal-shower-bingo",
      description:
        "Create printable bridal shower bingo cards for gift opening, guest icebreakers, and shower games with clear rules and unique card layouts.",
    },
    {
      "@type": "WebApplication",
      "@id": "https://mybingocard.com/bridal-shower-bingo#app",
      name: "Bridal Shower Bingo Cards Printable Generator",
      url: "https://mybingocard.com/bridal-shower-bingo",
      description:
        "Create custom printable bridal shower bingo cards with gift prediction squares, blank or prefilled card options, guest prompts, PDF export, and online play options.",
      applicationCategory: "GameApplication",
      operatingSystem: "All",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How do you play bridal shower bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Give each guest a card before gifts are opened. Guests mark a square when a matching gift, shower moment, or guest prompt happens, and the first player to complete the chosen pattern wins.",
          },
        },
        {
          "@type": "Question",
          name: "Can bridal shower bingo use gift predictions?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. You can place registry items, household gifts, honeymoon gifts, and personal prompts on the card so guests can play during gift opening.",
          },
        },
        {
          "@type": "Question",
          name: "Can I make different cards for each shower guest?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. MyBingoCard can shuffle the same bridal shower square list into unique card layouts for guests.",
          },
        },
        {
          "@type": "Question",
          name: "How many bridal shower bingo cards should I print?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Print one card per guest plus a few extras for late RSVPs, hosts, or family members who decide to join during gift opening.",
          },
        },
        {
          "@type": "Question",
          name: "Should bridal shower bingo cards be blank or prefilled?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Blank cards are best when guests predict gifts before the bride opens them. Prefilled cards are better for fast setup, large showers, or host-led games with a call list.",
          },
        },
        {
          "@type": "Question",
          name: "What prizes work for bridal shower bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Simple prizes work best, such as candles, coffee cards, candy, mini champagne bottles, lotion, bath salts, or small spa gifts.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make bridal shower bingo cards",
      step: [
        { "@type": "HowToStep", position: 1, text: "Choose gift opening, find the guest, or classic shower bingo prompts." },
        { "@type": "HowToStep", position: 2, text: "Customize the bridal shower squares to match the bride, registry, and guest list." },
        { "@type": "HowToStep", position: 3, text: "Decide whether guests will use blank prediction cards or prefilled cards." },
        { "@type": "HowToStep", position: 4, text: "Shuffle unique cards for guests and decide the winning pattern before the shower." },
        { "@type": "HowToStep", position: 5, text: "Print the cards, prepare markers and prizes, then verify any bingo before awarding a prize." },
        { "@type": "HowToStep", position: 6, text: "Export printable cards or use online links when guests will play on devices." },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-rose-300 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-pink-300 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = ["from-rose-400 to-pink-500","from-pink-500 to-fuchsia-500","from-fuchsia-500 to-purple-500","from-purple-500 to-rose-500","from-rose-500 to-pink-400"];
              return <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>;
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Bridal Shower Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div key={i} className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
              ${i === 12 ? "bg-gradient-to-br from-rose-400 to-pink-500 text-white ring-2 ring-pink-100" : "bg-white text-slate-600 border border-slate-100 hover:border-pink-200 hover:bg-pink-50/50"}`}>
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
      <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50">
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
              <Link href="/create" className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 shadow-lg">Create Card</Link>
            </div>
          </div>
        </header>

        <main className="pt-28 pb-20 px-4">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wide mb-6">
                💐 Bridal Shower Bingo
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Custom Printable <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-500">Bridal Shower Bingo</span> Cards
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Turn gift opening into an easy shower game with cards for gift predictions, registry items, guest icebreakers, bridal trivia, and shower moments. Customize the squares, shuffle unique cards, and export printable PDFs when you are ready.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/create" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:opacity-90 shadow-lg shadow-pink-500/30">
                  Create Your Card
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/templates" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-800 rounded-xl font-bold text-lg hover:bg-slate-50 border border-slate-200 shadow-sm">See All Templates</Link>
              </div>
            </div>
            <BingoGrid squares={bridalSquares} />
          </div>

          <div className="max-w-3xl mx-auto bg-gradient-to-r from-rose-500 to-pink-500 rounded-3xl p-12 text-center text-white mb-20">
            <h2 className="text-3xl font-bold mb-4">Gift Opening, Guest Bingo, or Classic Shower Play 💍</h2>
            <p className="text-rose-100 text-lg mb-8">Use one card list for gift predictions, find the guest prompts, bridal trivia, or shower moments. Decide the winning pattern before the shower so guests know whether to play for one row, four corners, picture frame, or blackout.</p>
            <Link href="/create" className="inline-block px-8 py-4 bg-white text-rose-600 rounded-xl font-bold text-lg hover:bg-rose-50 transition-colors shadow-lg">Create Bridal Shower Bingo</Link>
          </div>

          <section className="max-w-5xl mx-auto mb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Plan a Bridal Shower Bingo Game Guests Can Actually Follow</h2>
              <p className="text-slate-600 text-lg leading-relaxed">
                A good bridal shower bingo card does more than fill a grid. It tells guests what to watch for, keeps gift opening from feeling passive, and gives the host a simple way to run prizes without stopping the flow of the shower. Use blank cards for gift predictions, prefilled cards for faster setup, and online cards when guests will join from different places.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {bridalPlanningTips.map((tip) => (
                <div key={tip.heading} className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{tip.heading}</h3>
                  <p className="text-slate-600 leading-relaxed">{tip.body}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">More Event Bingo Cards</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { href: "/wedding-bingo", label: "💍 Wedding" },
                { href: "/baby-shower-bingo", label: "👶 Baby Shower" },
                { href: "/birthday-bingo", label: "🎂 Birthday" },
                { href: "/graduation-bingo", label: "🎓 Graduation" },
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
