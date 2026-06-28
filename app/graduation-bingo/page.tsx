import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";

export const metadata: Metadata = {
  title: "Graduation Bingo Cards Printable: Ceremony & Party",
  description:
    "Create printable graduation bingo cards for Class of 2026 ceremonies, grad parties, high school, college, and kindergarten with PDFs and call lists.",
  alternates: {
    canonical: "https://mybingocard.com/graduation-bingo",
  },
};

const graduationSquares = [
  "Cap Toss", "Happy Tears", "Diploma Moment", "Long Speech", "FREE",
  "Family Wave", "Class Photo", "Mortarboard", "School Colors", "Graduate Selfie",
  "Standing Ovation", "Pomp & Circumstance", "Future Plans", "Handshake", "Proud Parent",
  "Tassel Turn", "Scholarship Mention", "Group Hug", "Late Arrival", "Decorated Cap",
  "Class Motto", "Valedictorian", "Faculty Robes", "Confetti Drop", "Find a Guest",
];

const graduationPlanningTips = [
  {
    heading: "Match the card to the event",
    body:
      "Ceremony bingo should use moments guests can spot from their seats, such as cap toss, diploma moment, tassel turn, faculty robes, decorated cap, class motto, standing ovation, and proud parent. Grad party bingo can use photo booth, grad advice, school colors, dessert table, memory wall, first job, college plans, and after party prompts.",
  },
  {
    heading: "Print or share one card per player",
    body:
      "Give each guest, family group, or student a unique card before the ceremony or party begins. If you expect 24 guests, 30 classmates, 50 relatives, or 100 open house visitors, shuffle enough unique cards so two players are not watching the same board. If the venue is crowded or outdoors, online player links can be easier than paper because guests can mark squares from their phones.",
  },
  {
    heading: "Prepare a call list and host sheet",
    body:
      "For party bingo, print a call list or host sheet with every graduation prompt before guests arrive. For ceremony bingo, the caller is usually the event itself, so the host sheet becomes a verification checklist for winners. Include extra prompts such as alma mater, diploma selfie, decorated cap, honor cords, school mascot, class song, and favorite teacher.",
  },
  {
    heading: "Choose the right graduation version",
    body:
      "High school graduation bingo can mention senior year, yearbook, scholarship, varsity jacket, class color, and future plans. College graduation bingo can use major, degree, cap decoration, honor society, alumni, thesis, and campus landmark. Kindergarten or elementary graduation bingo should keep squares visual and simple, such as backpack, certificate, teacher, song, clapping, balloons, and family photo.",
  },
  {
    heading: "Use simple rules for mixed age guests",
    body:
      "Graduation parties often include kids, grandparents, classmates, and neighbors. Choose one row, four corners, X pattern, or blackout before play starts, and announce whether players should call bingo quietly during a ceremony or save winners for the party. If people are seated far apart, ask winners to take a photo of the completed card before prizes are handed out.",
  },
  {
    heading: "Build a stronger graduation word list",
    body:
      "Good graduation bingo squares include diploma, tassel turn, class photo, school colors, senior quote, favorite teacher, decorated cap, future plans, proud parent, group hug, scholarship mention, confetti, yearbook, graduate selfie, honor cords, class ring, thank you speech, and 'Class of 2026'. Mix serious milestone words with funny ceremony moments so the card feels personal instead of generic.",
  },
  {
    heading: "Add a find the guest round",
    body:
      "A graduation open house works well with find the guest bingo. Use prompts such as went to school with the graduate, traveled from out of town, remembers the first day of school, brought a graduation card, knows the school mascot, or has advice for the graduate. Guests mingle, write names in squares, and the first row wins.",
  },
  {
    heading: "Make printing easy for the host",
    body:
      "Print on standard letter paper for fast setup or cardstock if the cards will be passed around during a busy party. Put two cards per page for small groups, one larger card per page for younger kids or older guests, and keep extra pens, pencils, bingo chips, stickers, or wrapped candy near the entrance.",
  },
  {
    heading: "Plan prizes around the crowd",
    body:
      "For a family graduation party, small gift cards, candy jars, school color treats, photo props, or a graduation keepsake work well. For a classroom celebration, use pencil packs, stickers, bookmarks, first choice privileges, or a teacher approved treat instead of anything expensive, especially for younger students. Label prizes by round so guests know whether they are playing for one row, four corners, or blackout.",
  },
  {
    heading: "Support livestreams and watch parties",
    body:
      "If relatives are watching a commencement livestream, send online bingo card links before the ceremony starts. Use prompts that remote guests can see or hear, such as music, diploma close up, applause, speech quote, class photo, camera cutaway, tassel turn, and cap toss. For delayed watch parties, use the same card list and pause between rounds to confirm winners.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://mybingocard.com/graduation-bingo#webpage",
      name: "Graduation Bingo Cards Printable: Ceremony & Party",
      url: "https://mybingocard.com/graduation-bingo",
      dateModified: "2026-06-18",
      description:
        "Create printable graduation bingo cards for Class of 2026 ceremonies, grad parties, high school, college, kindergarten, and school celebrations.",
    },
    {
      "@type": "WebApplication",
      "@id": "https://mybingocard.com/graduation-bingo#app",
      name: "Graduation Bingo Cards Printable Generator",
      url: "https://mybingocard.com/graduation-bingo",
      description:
        "Create custom printable graduation bingo cards with ceremony moments, party prompts, high school, college, kindergarten, PDF export, call lists, and online play options.",
      applicationCategory: "GameApplication",
      operatingSystem: "All",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How do you play graduation bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Give each guest a card before the ceremony or party. Players mark squares when they see graduation moments such as a cap toss, diploma moment, family photo, or class motto, and the first player to complete the chosen pattern wins.",
          },
        },
        {
          "@type": "Question",
          name: "Can graduation bingo work for a ceremony and a party?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Use ceremony prompts for a school graduation, party prompts for an open house, find the guest prompts for mingling, or a mix of all three for family celebrations.",
          },
        },
        {
          "@type": "Question",
          name: "Can every graduation guest get a different card?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. MyBingoCard can shuffle the same graduation square list into unique cards for guests, families, or classmates.",
          },
        },
        {
          "@type": "Question",
          name: "What should I put on a graduation bingo card?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use graduation moments such as cap toss, diploma moment, tassel turn, school colors, decorated cap, class photo, proud parent, future plans, honor cords, scholarship mention, yearbook, class motto, and after party prompts.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need a calling sheet for graduation bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A calling sheet is useful for party bingo and classroom bingo because the host can call prompts in order. For ceremony bingo, guests usually mark squares as moments happen, but the host sheet still helps verify winners.",
          },
        },
        {
          "@type": "Question",
          name: "Can I make graduation bingo for high school, college, or kindergarten?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. High school cards can include senior year and scholarship prompts, college cards can include major and degree prompts, and kindergarten cards can use simple visual prompts such as certificate, teacher, song, backpack, balloons, and family photo.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "How to make graduation bingo cards",
      step: [
        { "@type": "HowToStep", position: 1, text: "Choose ceremony, party, classroom, find the guest, or family watch party prompts." },
        { "@type": "HowToStep", position: 2, text: "Customize the squares with school colors, graduation traditions, Class of 2026 details, and guest friendly moments." },
        { "@type": "HowToStep", position: 3, text: "Add high school, college, kindergarten, or open house prompts that match the actual event." },
        { "@type": "HowToStep", position: 4, text: "Shuffle enough unique cards for every player and decide whether the winning pattern is one row, four corners, X pattern, or blackout." },
        { "@type": "HowToStep", position: 5, text: "Export printable PDFs with a call list or use online links when players will mark cards on phones." },
        { "@type": "HowToStep", position: 6, text: "Prepare markers, prizes, and winner verification before the ceremony, classroom celebration, or party starts." },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = ["from-blue-600 to-indigo-600","from-indigo-600 to-violet-600","from-violet-600 to-blue-600","from-blue-500 to-cyan-600","from-cyan-600 to-blue-600"];
              return <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>;
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Graduation Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div key={i} className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
              ${i === 12 ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-2 ring-blue-100" : "bg-white text-slate-600 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50"}`}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GraduationBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="graduation-bingo" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50">
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
              <Link href="/create" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 shadow-lg">Create Card</Link>
            </div>
          </div>
        </header>

        <main className="pt-28 pb-20 px-4">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
                🎓 Graduation Bingo
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Custom Printable <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Graduation Bingo</span> Cards
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Create graduation bingo cards for Class of 2026 ceremonies, senior celebrations, grad parties, family watch parties, and classroom end of year games. Customize prompts, shuffle unique printable cards, export PDFs, and keep a call list for the host.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/create" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:opacity-90 shadow-lg">
                  Create Your Card
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/templates" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-800 rounded-xl font-bold text-lg hover:bg-slate-50 border border-slate-200 shadow-sm">See All Templates</Link>
              </div>
            </div>
            <BingoGrid squares={graduationSquares} />
          </div>

          <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-center text-white mb-20">
            <h2 className="text-3xl font-bold mb-4">Keep Guests Engaged Through the Ceremony 🎓</h2>
            <p className="text-blue-100 text-lg mb-8">Use ceremony prompts, party moments, find the guest icebreakers, and school traditions so guests have something to watch for between names. Pick the winning pattern before play starts and make enough unique cards for every player.</p>
            <Link href="/create" className="inline-block px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg">Create Graduation Bingo</Link>
          </div>

          <section className="max-w-5xl mx-auto mb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Plan Graduation Bingo for the Ceremony, Party, or Classroom</h2>
              <p className="text-slate-600 text-lg leading-relaxed">
                Graduation bingo works best when the card matches the setting. A ceremony card keeps families engaged while names are called, a party card turns the open house into an activity, a find the guest card gets relatives talking, and a classroom card helps students celebrate the end of the year.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {graduationPlanningTips.map((tip) => (
                <div key={tip.heading} className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm">
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
                { href: "/birthday-bingo", label: "🎂 Birthday" },
                { href: "/wedding-bingo", label: "💍 Wedding" },
                { href: "/baby-shower-bingo", label: "👶 Baby Shower" },
                { href: "/classroom-bingo", label: "📚 Classroom" },
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
