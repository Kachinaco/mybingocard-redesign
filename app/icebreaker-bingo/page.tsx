import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Icebreaker Bingo Cards Printable: Human Bingo",
  description:
    "Create printable icebreaker bingo cards for classrooms, onboarding, networking events, and team meetings. Add human bingo prompts and play online.",
  alternates: {
    canonical: "https://mybingocard.com/icebreaker-bingo",
  },
};

const icebreakerSquares = [
  "Same Birthday Month", "Has a Pet", "Speaks Two Languages", "New Teammate", "FREE",
  "Morning Person", "Plays Music", "Loves Cooking", "Read This Month", "Night Owl",
  "Ran a Race", "First Day Here", "Visited Another Country", "Writes for Fun", "Tea Over Coffee",
  "Left Handed", "Has a Hidden Talent", "Likes Hiking", "Plant Parent", "Board Gamer",
  "Podcast Fan", "Knows Sign Language", "Mentor Moment", "Favorite Color Match", "Can Teach a Skill",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://mybingocard.com/icebreaker-bingo#webpage",
      url: "https://mybingocard.com/icebreaker-bingo",
      name: "Icebreaker Bingo Cards Printable: Human Bingo",
      description:
        "Create printable icebreaker bingo cards for classrooms, onboarding, networking events, and team meetings. Add human bingo prompts and play online.",
      isPartOf: {
        "@type": "WebSite",
        name: "MyBingoCard",
        url: "https://mybingocard.com",
      },
      about: [
        { "@type": "Thing", name: "icebreaker bingo" },
        { "@type": "Thing", name: "human bingo" },
        { "@type": "Thing", name: "get to know you bingo" },
        { "@type": "Thing", name: "people bingo questions" },
      ],
    },
    {
      "@type": "WebApplication",
      "@id": "https://mybingocard.com/icebreaker-bingo#app",
      name: "Icebreaker Bingo Card Generator",
      url: "https://mybingocard.com/icebreaker-bingo",
      description:
        "Custom icebreaker bingo card generator for human bingo, get to know you games, classrooms, onboarding, networking events, and team meetings.",
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
      "@id": "https://mybingocard.com/icebreaker-bingo#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "How do you play icebreaker bingo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Give each participant a unique card and ask them to find people who match the prompts. Players write names, mark squares, and win with one row, four corners, or blackout.",
          },
        },
        {
          "@type": "Question",
          name: "What are good icebreaker bingo prompts?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Use safe prompts about pets, hobbies, languages, travel, favorite books, hidden talents, shared interests, team roles, and first day experiences.",
          },
        },
        {
          "@type": "Question",
          name: "Can icebreaker bingo work for remote groups?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Share online cards before a Zoom, Teams, Slack, or classroom video session and let players ask questions in breakout rooms or chat.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      "@id": "https://mybingocard.com/icebreaker-bingo#howto",
      name: "How to make icebreaker bingo cards",
      description: "Create printable or online human bingo cards for group introductions.",
      step: [
        {
          "@type": "HowToStep",
          name: "Choose the group setting",
          text: "Pick classroom, onboarding, conference, networking, camp, club, or team meeting prompts.",
        },
        {
          "@type": "HowToStep",
          name: "Add safe conversation prompts",
          text: "Use human bingo questions that are easy to answer and comfortable for mixed groups.",
        },
        {
          "@type": "HowToStep",
          name: "Shuffle unique cards",
          text: "Generate different layouts so participants need to talk to multiple people instead of copying one card.",
        },
        {
          "@type": "HowToStep",
          name: "Print or share",
          text: "Export printable PDFs or share online cards for remote and hybrid groups.",
        },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-sky-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-sky-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = [
                "from-sky-600 to-blue-600",
                "from-blue-600 to-indigo-600",
                "from-indigo-600 to-violet-600",
                "from-violet-600 to-purple-600",
                "from-purple-600 to-fuchsia-600",
              ];
              return (
                <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>
              );
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Icebreaker Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
                ${i === 4
                  ? "bg-gradient-to-br from-sky-500 to-blue-500 text-white ring-2 ring-sky-100"
                  : "bg-white text-slate-600 border border-slate-100 hover:border-sky-200 hover:bg-sky-50/50"
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

export default function IcebreakerBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="icebreaker-bingo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-slate-50 selection:bg-sky-100 selection:text-sky-900">
        {/* Navbar */}
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
          <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                MyBingoCard
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/templates" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Templates</Link>
              <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Pricing</Link>
              <div className="w-px h-4 bg-slate-200"></div>
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Sign In</Link>
              <Link href="/create" className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all duration-200 shadow-lg shadow-slate-900/20">
                Start a Draft
              </Link>
            </nav>
          </div>
        </header>

        <main className="pt-20">
          {/* Hero */}
          <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border border-sky-100 shadow-sm rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Icebreaker Edition</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    Icebreaker Bingo{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-500">
                      Cards
                    </span>
                  </h1>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Create printable icebreaker bingo cards for classrooms, onboarding, networking events, conference mixers, clubs, camps, and team meetings. Add human bingo prompts such as pets, languages, hobbies, travel, favorite books, hidden talents, shared interests, and first day facts, then shuffle unique cards so every participant has a different layout. Export PDFs for in person mingling or share online cards for Zoom, Teams, Slack, and hybrid groups.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="bg-gradient-to-r from-sky-500 to-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-sky-500/20 hover:shadow-sky-500/40 hover:-translate-y-1 transition-all duration-300"
                    >
                      Create Icebreaker Bingo Cards
                    </Link>
                    <Link
                      href="/pricing"
                      className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      See Activation
                    </Link>
                  </div>
                  <p className="text-sm text-slate-400">Draft tools · Any group size · Premium export</p>
                </div>

                <div className="relative">
                  <BingoGrid squares={icebreakerSquares} />
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                Icebreaker bingo for classrooms, onboarding, networking, and teams
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
                Use human bingo prompts that help people learn names, find shared interests, and start safe conversations.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: "🤝", title: "Safe Conversation Starters", desc: "Use prompts that are friendly for students, new hires, volunteers, conference guests, and mixed adult groups." },
                  { icon: "✏️", title: "Custom Human Bingo Questions", desc: "Add your own find someone who prompts for hobbies, work roles, hometowns, skills, books, travel, or goals." },
                  { icon: "👥", title: "Works for Any Group Size", desc: "Run a quick five minute welcome activity or a longer mixer for large classrooms, retreats, and conferences." },
                  { icon: "🖨️", title: "Printable and Online Cards", desc: "Export PDFs for rooms and tables or share online cards with remote participants before the session starts." },
                  { icon: "💼", title: "Onboarding Ready", desc: "Help new employees meet teammates, find mentors, learn team roles, and feel included on the first day." },
                  { icon: "🎓", title: "Classroom Friendly", desc: "Use age appropriate prompts so students learn names, interests, and classroom routines through a simple game." },
                ].map((f) => (
                  <div key={f.title} className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-all duration-300">
                    <div className="text-4xl mb-4">{f.icon}</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{f.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-900">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-600/20 to-blue-600/20"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Start the room with real conversation
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Draft icebreaker bingo cards for classrooms, onboarding, networking, and team events, then print or share when you are ready.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-sky-50 transition-all duration-300 shadow-xl">
                  Start a Free Icebreaker Bingo Draft
                </Link>
                <Link href="/pricing" className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  See Activation
                </Link>
              </div>
            </div>
          </section>
          <SeoSupportBlock slug="icebreaker-bingo" />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 pt-16 pb-12">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div className="col-span-1 md:col-span-2">
                <Link href="/" className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-slate-900">MyBingoCard</span>
                </Link>
                <p className="text-slate-500 max-w-sm leading-relaxed">
                  The bingo card maker for icebreakers, team building, classrooms, and every occasion.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-6">Product</h4>
                <ul className="space-y-4">
                  <li><Link href="/create" className="text-slate-500 hover:text-indigo-600 transition-colors">Create Cards</Link></li>
                  <li><Link href="/templates" className="text-slate-500 hover:text-indigo-600 transition-colors">Templates</Link></li>
                  <li><Link href="/pricing" className="text-slate-500 hover:text-indigo-600 transition-colors">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-6">More Ideas</h4>
                <ul className="space-y-4">
                  <li><Link href="/classroom-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Classroom Bingo</Link></li>
                  <li><Link href="/office-party-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Office Party Bingo</Link></li>
                  <li><Link href="/wedding-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Wedding Bingo</Link></li>
                  <li><Link href="/holiday-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Holiday Bingo</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-8 text-center text-slate-400 text-sm">
              <p>&copy; {new Date().getFullYear()} MyBingoCard. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
