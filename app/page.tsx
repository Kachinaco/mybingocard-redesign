import type { Metadata } from "next";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import AdUnit from "@/components/AdUnit";
import { EmailCaptureInline } from "@/components/EmailCapture";
import { seoLandingPages, type SeoLandingPageData } from "@/lib/seo-landing-pages";
import { FACEBOOK_PAGE_URL, IOS_APP_STORE_URL, REDDIT_COMMUNITY_URL } from "@/lib/social-links";

export const metadata: Metadata = {
  title: "Free Bingo Draft Editor & Bingo Card Maker | MyBingoCard",
  description:
    "Create custom bingo cards online with a free bingo draft editor and bingo card maker. Make printable bingo boards, PDF cards, templates, AI ideas, and Premium live online games.",
  keywords: [
    "free bingo draft editor",
    "bingo card generator",
    "printable bingo cards",
    "bingo card maker",
    "bingo board generator",
    "custom bingo cards",
    "online bingo card maker",
    "wedding bingo cards",
    "baby shower bingo cards",
    "classroom bingo cards",
    "team building bingo",
  ],
  alternates: {
    canonical: "https://mybingocard.com",
  },
};

const faqItems = [
  {
    question: "How do I create a custom bingo card online?",
    answer:
      "Start with a blank bingo card or a template, add your own words or images, choose a grid size, then export a PDF, share a link, or host the game online after checkout. MyBingoCard works as a bingo card generator, bingo card maker, and bingo board generator in one place.",
  },
  {
    question: "Is this also a bingo board generator?",
    answer:
      "Yes. You can use MyBingoCard as a bingo board generator to make 3x3, 4x4, or 5x5 bingo boards, then export PDFs or share online cards with players after checkout.",
  },
  {
    question: "What is the difference between a bingo card generator and a bingo card maker?",
    answer:
      "A bingo card generator usually creates shuffled card layouts quickly, while a bingo card maker gives you more control over words, images, colors, grid size, printing, and online play after checkout. MyBingoCard does both.",
  },
  {
    question: "Can I print bingo cards from MyBingoCard?",
    answer:
      "Yes. MyBingoCard exports printable bingo cards as PDF files, and Premium users can also export higher-resolution files and larger batches.",
  },
  {
    question: "What types of bingo cards can I make?",
    answer:
      "You can make bingo cards for classrooms, baby showers, weddings, birthday parties, holidays, office parties, team building, family reunions, trivia nights, and more.",
  },
  {
    question: "Can people play MyBingoCard games online?",
    answer:
      "Yes. You can share bingo cards with links and host live multiplayer bingo games after checkout, so players can join from phones, tablets, or laptops.",
  },
];

const generatorFooterLinks = [
  "bingo-card-maker",
  "printable-bingo-cards",
  "online-bingo-card-generator",
  "bingo-board-generator",
  "ai-bingo-card-generator",
  "word-bingo-generator",
  "math-bingo-generator",
]
  .map((slug) => seoLandingPages[slug])
  .filter((page): page is SeoLandingPageData => Boolean(page));

const demoBingoItems = [
  "Free Drinks", "Dance Off", "Photo Booth", "Cake Time", "FREE",
  "First Kiss", "Funny Speech", "Crying Guest", "Dad Joke", "Late Arrival",
  "Champagne", "Bouquet", "First Dance", "Dessert", "Confetti",
  "Group Photo", "Live Music", "Toasts", "Slow Dance", "Fireworks",
  "Happy Tears", "Best Man", "Ring Bearer", "Flower Girl", "DJ",
];

function BingoCardDemo() {
  return (
    <div className="relative animate-fade-in-up animation-delay-200">
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500 rounded-full blur-3xl opacity-20 animate-pulse animation-delay-400"></div>

      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl shadow-indigo-500/10 p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 border border-white/50">
        <div className="text-center mb-6">
          <div className="flex justify-center gap-3 text-4xl font-black tracking-widest">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-violet-600 to-indigo-600">B</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-blue-600">I</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-cyan-600">N</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-600 to-teal-600">G</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-teal-600 to-emerald-600">O</span>
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mt-2">Wedding Edition</p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {demoBingoItems.map((item, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center p-2 rounded-xl text-center text-[10px] leading-tight font-semibold cursor-pointer shadow-sm ${
                i === 12
                  ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-100"
                  : "bg-white text-slate-600 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50"
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

function FeatureCard({ icon, title, description, delay = "" }: { icon: React.ReactNode; title: string; description: string; delay?: string }) {
  return (
    <div className={`group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 border border-slate-100 hover:border-indigo-100 animate-fade-in-up ${delay}`}>
      <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border border-indigo-100/50">
        <div className="text-indigo-600">
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed text-sm">{description}</p>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center p-8 rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300">
      <div className="text-5xl md:text-5xl font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent mb-3">
        {number}
      </div>
      <div className="text-slate-600 font-semibold text-base uppercase tracking-wide">{label}</div>
    </div>
  );
}

function WorkflowCard({ title, audience, description, steps }: { title: string; audience: string; description: string; steps: string[] }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 h-full flex flex-col">
      <div className="mb-5">
        <div className="text-xs font-bold uppercase tracking-wide text-indigo-600 mb-2">{audience}</div>
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      </div>
      <p className="text-slate-600 mb-6 leading-relaxed flex-grow">{description}</p>
      <ul className="space-y-3 pt-6 border-t border-slate-50">
        {steps.map((step) => (
          <li key={step} className="flex gap-3 text-sm text-slate-600">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500"></span>
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar */}
      <MobileNav />

      <main className="pt-20">
        {/* Hero Section - Strong CTA above the fold */}
        <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-40 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-200/50 rounded-full blur-[100px] animate-blob"></div>
            <div className="absolute top-20 left-0 w-[500px] h-[500px] bg-violet-200/50 rounded-full blur-[100px] animate-blob animation-delay-200"></div>
          </div>

          <div className="container mx-auto px-4 lg:px-8 relative">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Left Content */}
              <div className="text-center lg:text-left animate-fade-in-up">
                <div className="inline-flex items-center gap-2 bg-white border border-indigo-100 shadow-sm rounded-full px-4 py-1.5 mb-8 transform hover:scale-105 transition-transform duration-300 cursor-default">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">Free Bingo Draft Editor</span>
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                  Free <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">Bingo Draft Editor</span> for Printable and Online Cards
                </h1>
                
                <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Make unique bingo cards and bingo boards for classrooms, baby showers, weddings, parties, team events, and social challenges. Add words or images, shuffle cards, export PDFs after checkout, or send a play link.
                </p>

                {/* Primary CTA - prominent above the fold */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href="/create" className="group bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3">
                    Start a Free Draft
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </Link>
                  <Link href="/templates" className="bg-white text-indigo-600 border-2 border-indigo-200 px-8 py-5 rounded-2xl font-bold text-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300 flex items-center justify-center gap-2">
                    Browse Templates
                  </Link>
                </div>


                <p className="mt-4 text-sm text-slate-500 text-center lg:text-left">
                  Free to draft. Start a trial or choose lifetime when you are ready to save.
                </p>

                <div className="mt-6 flex flex-col items-center gap-2 lg:items-start">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Also available for iPhone</p>
                  <a
                    href={IOS_APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download MyBingoCard on the App Store"
                    className="inline-flex h-12 items-center justify-center rounded-lg px-1 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <img
                      src="/badges/download-on-the-app-store.svg"
                      alt="Download on the App Store"
                      width={120}
                      height={40}
                      className="h-10 w-auto"
                    />
                  </a>
                </div>

                <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500">
                  <div className="flex -space-x-3">
                    {[
                      { bg: "bg-violet-400", emoji: "😊" },
                      { bg: "bg-indigo-400", emoji: "🎉" },
                      { bg: "bg-pink-400",   emoji: "🙌" },
                      { bg: "bg-emerald-400",emoji: "⭐" },
                    ].map((av, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full border-2 border-white ${av.bg} flex items-center justify-center text-sm`}>
                        {av.emoji}
                      </div>
                    ))}
                  </div>
                  <div>Used for classrooms, parties, showers, weddings, and team events</div>
                </div>
              </div>

              {/* Right Visual */}
              <div className="relative">
                <BingoCardDemo />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 border-y border-slate-200 bg-slate-50/50">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-12">
              <StatCard number="Draft" label="Free Preview" />
              <StatCard number="3x3-5x5" label="Grid Sizes" />
              <StatCard number="PDF" label="Print Exports" />
              <StatCard number="Premium" label="Online Play" />
            </div>
          </div>
        </section>

        {/* Ad placement - below stats */}
        <section className="py-6 bg-slate-50">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <AdUnit slot="homepage-top" format="horizontal" className="my-4" />
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 lg:py-32 bg-slate-50">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-20 animate-fade-in-up">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
                Everything you need in a <span className="text-indigo-600">bingo card maker</span>
              </h2>
              <p className="text-lg text-slate-600">
                Build printable bingo cards, online bingo games, bingo boards, and themed templates for real events and classrooms.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                title="Image Bingo Cards"
                description="Add photos and images to any cell. Perfect for kids, vocabulary games, or picture-based bingo nights."
                delay="animation-delay-200"
              />
              <FeatureCard
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
                title="Theme Library"
                description="Choose from starter and premium templates for weddings, baby showers, classrooms, holidays, office events, and parties."
                delay="animation-delay-400"
              />
              <FeatureCard
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                title="Print and Batch PDFs"
                description="Print small games from your browser, or use Premium and event packs for PDF/PNG exports and larger batches."
                delay=""
              />
              <FeatureCard
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                title="Virtual Play"
                description="Host games remotely or in the room after checkout. Players join from a browser link on their phones, no app required."
                delay="animation-delay-200"
              />
              <FeatureCard
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                title="Magic Shuffle"
                description="Our algorithm ensures every card is unique and winners are distributed evenly."
                delay="animation-delay-400"
              />
              <FeatureCard
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
                title="AI Card Generator"
                description="Describe your theme, pick a tone, and AI generates a polished draft. Dating bingo, office meetings, baby showers — done in seconds."
                delay=""
              />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 lg:py-28 bg-slate-50 border-t border-slate-200">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
                Bingo Card Generator FAQ
              </h2>
              <p className="text-lg text-slate-600">
                Short answers for the questions people ask before choosing a bingo card generator or bingo card maker.
              </p>
            </div>

            <div className="space-y-4">
              {faqItems.map((item) => (
                <div key={item.question} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{item.question}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faqItems.map((item) => ({
                  "@type": "Question",
                  name: item.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: item.answer,
                  },
                })),
              }),
            }}
          />
        </section>

        {/* Workflow Examples Section */}
        <section className="py-24 lg:py-32 bg-white">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-block px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wide mb-6">
                Common workflows
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
                Built for <span className="text-indigo-600">real bingo jobs</span>
              </h2>
              <p className="text-lg text-slate-600">
                Start from the setup closest to your event, then export, share links, or host online after checkout.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <WorkflowCard
                title="Vocabulary review"
                audience="Teacher"
                description="Turn a unit word list into a classroom review game students can play on paper or devices."
                steps={["Paste vocabulary terms", "Choose 4x4 or 5x5", "Export or share after checkout"]}
              />
              <WorkflowCard
                title="Gift-opening bingo"
                audience="Baby shower host"
                description="Use common registry gifts, shuffle unique cards, and keep guests involved during present opening."
                steps={["Start from a gift list", "Create unique cards", "Export after checkout"]}
              />
              <WorkflowCard
                title="Remote team game"
                audience="HR team"
                description="Run meeting bingo, onboarding bingo, or an icebreaker without asking players to install an app."
                steps={["Start checkout", "Share the browser link", "Verify winners in the host view"]}
              />
              <WorkflowCard
                title="Wedding reception game"
                audience="Wedding planner"
                description="Create reception-safe squares for speeches, photos, dancing, dessert, and guest moments."
                steps={["Use a reception template", "Add couple-specific details", "Export or use phone play after checkout"]}
              />
              <WorkflowCard
                title="Activity-center bingo"
                audience="Program coordinator"
                description="Prepare repeatable cards for senior centers, community rooms, libraries, and church events."
                steps={["Reuse saved card themes", "Adjust grid size", "Export called lists after games"]}
              />
              <WorkflowCard
                title="Holiday party bingo"
                audience="Party host"
                description="Make seasonal cards for family gatherings, office parties, classrooms, or neighborhood events."
                steps={["Pick a holiday list", "Add party-specific squares", "Export after checkout or share"]}
              />
            </div>
          </div>
        </section>


        {/* Email Capture Section */}
        <section className="py-16 bg-slate-50">
          <div className="container mx-auto px-4 lg:px-8 max-w-2xl">
            <EmailCaptureInline />
          </div>
        </section>

        {/* Ad placement - above CTA */}
        <section className="py-6 bg-slate-50">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <AdUnit slot="homepage-bottom" format="horizontal" className="my-4" />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
           <div className="absolute inset-0 bg-slate-900">
             <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-indigo-600/20"></div>
           </div>
           
           <div className="container mx-auto px-4 relative z-10 text-center">
             <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
               Ready to create custom bingo cards?
             </h2>
             <p className="text-xl text-slate-300 mb-4 max-w-2xl mx-auto">
               Make printable or online bingo cards in a few minutes for classrooms, parties, showers, work events, and holiday games.
             </p>
             <p className="text-indigo-300 mb-12">
               Start with a free draft, then upgrade only if you need AI tools, image cards, PDF and PNG exports, or bigger batches.
             </p>
             <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/create"
                  className="bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-indigo-50 transition-all duration-300 shadow-xl"
                >
                  Start a Draft
                </Link>
                <Link
                  href="/pricing"
                  className="bg-transparent border border-white/30 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300"
                >
                  View Pricing
                </Link>
             </div>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-5 gap-10 mb-12">
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
                Free bingo draft editor for printable and online bingo games. Build custom cards for classrooms, parties, showers, weddings, and team events.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Product</h4>
              <ul className="space-y-4">
                <li><Link href="/create" className="text-slate-500 hover:text-indigo-600 transition-colors">Create Cards</Link></li>
                <li><Link href="/templates" className="text-slate-500 hover:text-indigo-600 transition-colors">Templates</Link></li>
                <li><Link href="/pricing" className="text-slate-500 hover:text-indigo-600 transition-colors">Pricing</Link></li>
                <li><Link href="/features" className="text-slate-500 hover:text-indigo-600 transition-colors">Features</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Generators</h4>
              <ul className="space-y-4">
                {generatorFooterLinks.map((page) => (
                  <li key={page.slug}>
                    <Link href={`/${page.slug}`} className="text-slate-500 hover:text-indigo-600 transition-colors">
                      {page.eyebrow}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Company</h4>
              <ul className="space-y-4">
                <li><Link href="/about" className="text-slate-500 hover:text-indigo-600 transition-colors">About Us</Link></li>
                <li><Link href="/blog" className="text-slate-500 hover:text-indigo-600 transition-colors">Blog</Link></li>
                <li>
                  <a href={FACEBOOK_PAGE_URL} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-indigo-600 transition-colors">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href={REDDIT_COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-indigo-600 transition-colors">
                    Reddit
                  </a>
                </li>
                <li><Link href="/privacy" className="text-slate-500 hover:text-indigo-600 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-slate-500 hover:text-indigo-600 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2026 MyBingoCard. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
