import type { Metadata } from "next";
import Link from "next/link";
import LandingPageTracker from "@/components/LandingPageTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Classroom Bingo Cards Printable: Teacher Game",
  description:
    "Create printable classroom bingo cards for teachers. Build vocabulary, math, spelling, science, and review games with PDFs or online play.",
  alternates: {
    canonical: "https://mybingocard.com/classroom-bingo",
  },
};

const classroomSquares = [
  "Vocabulary Word", "Math Fact", "Spelling Word", "Science Term", "FREE",
  "Read Aloud", "Exit Ticket", "Review Question", "Partner Work", "Brain Break",
  "History Date", "Map Skill", "Book Character", "Fraction Match", "Class Rule",
  "Sight Word", "Lab Safety", "Writing Prompt", "Word Problem", "Quiz Review",
  "Small Group", "Homework Check", "Test Prep", "Teacher Choice", "Class Win",
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://mybingocard.com/classroom-bingo#webpage",
      url: "https://mybingocard.com/classroom-bingo",
      name: "Classroom Bingo Cards Printable: Teacher Game",
      description:
        "Create printable classroom bingo cards for teachers. Build vocabulary, math, spelling, science, and review games with PDFs or online play.",
      isPartOf: {
        "@type": "WebSite",
        name: "MyBingoCard",
        url: "https://mybingocard.com",
      },
      about: [
        { "@type": "Thing", name: "classroom bingo" },
        { "@type": "Thing", name: "teacher bingo cards" },
        { "@type": "Thing", name: "vocabulary bingo" },
        { "@type": "Thing", name: "math review games" },
      ],
    },
    {
      "@type": "WebApplication",
      "@id": "https://mybingocard.com/classroom-bingo#app",
      name: "Classroom Bingo Cards for Teachers",
      url: "https://mybingocard.com/classroom-bingo",
      description:
        "Custom classroom bingo card generator for vocabulary, math facts, spelling words, science terms, test review, and student engagement games.",
      applicationCategory: "EducationApplication",
      operatingSystem: "All",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://mybingocard.com/classroom-bingo#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "What can teachers use classroom bingo for?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Teachers can use classroom bingo for vocabulary review, math facts, spelling words, science terms, history dates, sight words, test prep, station work, and brain breaks.",
          },
        },
        {
          "@type": "Question",
          name: "Can every student get a different bingo card?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. MyBingoCard can shuffle the same classroom word list into unique card layouts so students do not all mark the same squares.",
          },
        },
        {
          "@type": "Question",
          name: "Can classroom bingo work online?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Teachers can export PDFs for printed lessons or share online cards for remote learning, computer labs, tablets, and hybrid classrooms.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      "@id": "https://mybingocard.com/classroom-bingo#howto",
      name: "How to make classroom bingo cards",
      description: "Create printable or online classroom bingo cards for teachers.",
      step: [
        {
          "@type": "HowToStep",
          name: "Choose the lesson goal",
          text: "Pick vocabulary, math facts, spelling words, science terms, review questions, or classroom routines.",
        },
        {
          "@type": "HowToStep",
          name: "Add student friendly squares",
          text: "Enter words, prompts, numbers, images, or answers that match the grade level and subject.",
        },
        {
          "@type": "HowToStep",
          name: "Shuffle unique cards",
          text: "Generate different card layouts for students, groups, stations, or teams.",
        },
        {
          "@type": "HowToStep",
          name: "Print or share",
          text: "Export printable PDFs for class or share online cards for remote and hybrid lessons.",
        },
      ],
    },
  ],
};

function BingoGrid({ squares }: { squares: string[] }) {
  return (
    <div className="relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyan-400 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-blue-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-4">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            {["B","I","N","G","O"].map((l, i) => {
              const colors = [
                "from-blue-600 to-cyan-600",
                "from-cyan-600 to-teal-600",
                "from-teal-600 to-emerald-600",
                "from-emerald-600 to-green-600",
                "from-green-600 to-lime-600",
              ];
              return (
                <span key={i} className={`text-transparent bg-clip-text bg-gradient-to-br ${colors[i]}`}>{l}</span>
              );
            })}
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Classroom Edition</p>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {squares.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-1.5 rounded-xl text-center text-[9px] leading-tight font-semibold cursor-pointer shadow-sm
                ${i === 4
                  ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white ring-2 ring-blue-100"
                  : "bg-white text-slate-600 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50"
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

export default function ClassroomBingoPage() {
  return (
    <>
      <LandingPageTracker templateCategory="classroom-bingo" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-slate-50 selection:bg-blue-100 selection:text-blue-900">
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
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-cyan-200/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-4 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="text-center lg:text-left animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 bg-white border border-blue-100 shadow-sm rounded-full px-4 py-1.5 mb-8">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">🍎 For Educators</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    Bingo Cards{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
                      for Teachers
                    </span>
                  </h1>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Create printable classroom bingo cards for vocabulary practice, math facts, spelling words, sight words, science terms, history dates, test review, centers, and brain breaks. Add your lesson words or prompts, choose a grid, and shuffle unique cards so each student has a different layout. Export PDFs for desks, stations, and substitute plans or share online cards for remote learning, tablets, and hybrid classrooms.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6">
                    <Link
                      href="/create"
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300"
                    >
                      Create Classroom Bingo Cards
                    </Link>
                    <Link
                      href="/pricing"
                      className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      See Activation
                    </Link>
                  </div>
                  <p className="text-sm text-slate-400">Draft tools · Premium saves and exports</p>
                </div>

                <div className="relative">
                  <BingoGrid squares={classroomSquares} />
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-4">
                Classroom bingo for every subject and grade level
              </h2>
              <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
                Turn word lists, review questions, math facts, and unit terms into printable or online games students can play quickly.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: "📖", title: "Vocabulary Bingo", desc: "Turn ELA, ESL, reading, and foreign language word lists into review games with student friendly prompts." },
                  { icon: "🔢", title: "Math Facts Bingo", desc: "Practice multiplication, addition, fractions, decimals, geometry terms, and word problem answers." },
                  { icon: "🔬", title: "Science Term Bingo", desc: "Review lab safety, biology, chemistry, Earth science, and physics vocabulary before quizzes." },
                  { icon: "🗺️", title: "History and Geography", desc: "Use people, places, dates, map skills, landmarks, and unit terms for social studies review." },
                  { icon: "🎨", title: "Art and Music Bingo", desc: "Explore art vocabulary, music notes, instruments, composers, and creative classroom routines." },
                  { icon: "🎉", title: "Sub Plans and Brain Breaks", desc: "Keep a quick printable game ready for substitute folders, early finishers, reward days, and holidays." },
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
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-600/20"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Make review feel like a game
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Draft classroom bingo cards for vocabulary, math, spelling, science, and test prep, then print or share when you are ready.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-blue-50 transition-all duration-300 shadow-xl">
                  Start a Free Classroom Bingo Draft
                </Link>
                <Link href="/pricing" className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                  See Activation
                </Link>
              </div>
            </div>
          </section>
          <SeoSupportBlock slug="classroom-bingo" />
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
                  A bingo card maker for teachers, tutors, homeschool families, and classroom activity planners.
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
                  <li><Link href="/baby-shower-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Baby Shower Bingo</Link></li>
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
