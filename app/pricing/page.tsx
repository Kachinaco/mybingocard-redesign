import Link from "next/link";
import { Suspense } from "react";
import { BATCH_PACKS } from "@/lib/batchPacks";
import {
  CheckoutReturnBanner,
  PricingCheckoutButton,
  PricingPageTracker,
} from "./PricingCheckoutActions";

const FREE_FEATURES = [
  "1 saved bingo card",
  "3x3, 4x4, and 5x5 grids",
  "All templates",
  "AI-powered card ideas",
  "Text and image bingo cells",
  "PDF and PNG exports",
  "Optional printable batch packs",
  "Profile and saved-card access",
  "Paid batches, share links, and hosted events are optional",
];

const PREMIUM_FEATURES = [
  "Host live bingo event rooms",
  "Direct player links and email sharing",
  "Unique shuffled card per viewer",
  "Printable batches up to 500 cards",
  "Cleaner saved and shared card experience",
  "Paid sharing workflow for groups",
  "Priority support",
];

const PLAN_ROWS = [
  ["Bingo cards", "1 saved card", "Unlimited", "Unlimited"],
  ["Grid sizes", "3x3, 4x4, 5x5", "3x3, 4x4, 5x5", "3x3, 4x4, 5x5"],
  ["Templates", "All", "All", "All"],
  ["AI generation", "Yes", "Yes", "Yes"],
  ["Image bingo cells", "Yes", "Yes", "Yes"],
  ["PDF export", "Yes", "Yes", "Yes"],
  ["PNG export", "Yes", "Yes", "Yes"],
  ["Custom colors & fonts", "Yes", "Yes", "Yes"],
  ["Batch generation", "Paid packs", "Up to 500 included", "Up to 500 included"],
  ["Paid share links", "A la carte", "Included direct sharing", "Included direct sharing"],
  ["Live event hosting", "Paid add-on", "Included", "Included"],
  ["Billing", "$0", "$7.99/month", "One-time $29.99"],
];

const FAQ_ITEMS = [
  {
    question: "What can I do on the free plan?",
    answer:
      "The free plan includes one saved card, all templates, AI ideas, image cells, and single-card PDF and PNG exports. Premium unlocks unlimited saved cards, while printable batch packs, share links, and hosted bingo events are optional paid tools.",
  },
  {
    question: "What is paid now?",
    answer:
      "Paid features are unlimited saved cards, printable batch packs, sharing workflows, and hosted bingo events. Batch packs are one-time purchases, group share links are sold a la carte, and Premium or Lifetime access covers included batches, live event hosting, and direct sharing tools.",
  },
  {
    question: "Can I pay once instead of subscribing?",
    answer:
      "Yes. The Lifetime plan is a one-time payment of $29.99 for permanent Premium access.",
  },
  {
    question: "Can I cancel monthly Premium?",
    answer:
      "Yes. Monthly Premium bills through Stripe at $7.99/month immediately after checkout. You can cancel anytime from your account settings.",
  },
];

function CheckIcon({ tone = "indigo" }: { tone?: "indigo" | "slate" }) {
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${tone === "indigo" ? "bg-[#cdeee9] text-[#157f76] border-2 border-[#33312e]" : "bg-[#fff0c7] text-[#8a6100] border-2 border-[#33312e]"}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function PlanFeatureList({ features, tone = "indigo" }: { features: string[]; tone?: "indigo" | "slate" }) {
  return (
    <ul className="space-y-4">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-3">
          <CheckIcon tone={tone} />
          <span className="font-semibold text-[#33312e] leading-tight">{feature}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#fff7ed]">
      <Suspense fallback={null}>
        <PricingPageTracker />
      </Suspense>

      <header className="fixed top-0 w-full z-50 bg-[#fff7ed]/95 backdrop-blur-md border-b-[3px] border-[#33312e]">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
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

          <div className="flex gap-4 items-center">
            <Link href="/login" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">
              Sign In
            </Link>
            <Link href="/create" className="cbtn cbtn-sm">
              Create Card
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-24 px-4">
        <Suspense fallback={null}>
          <CheckoutReturnBanner />
        </Suspense>

        <section className="text-center mb-16">
          <div className="ckick mb-6 uppercase tracking-wide">
            Free: One Saved Card
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-[#33312e] mb-4 tracking-tight">
            Clear pricing for individual cards, group batches, and online play
          </h1>
          <p className="text-lg font-semibold text-[#6b6459] max-w-3xl mx-auto leading-relaxed">
            Create, customize, use templates, export individual printable cards, and save your first card for free. Premium unlocks unlimited saved cards plus printable batches, player links, and live bingo hosting.
          </p>
        </section>

        <section className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6 px-4">
          <div className="ccard !rounded-3xl ccard-hover relative flex flex-col">
            <div className="p-8 flex-grow">
              <h2 className="text-xl font-heading font-bold text-[#33312e] mb-2">Free</h2>
              <p className="text-sm font-semibold text-[#a39a88] mb-6">Starter access for making, printing, and saving your first bingo card.</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-heading font-bold text-[#33312e] tracking-tight">$0</span>
                <span className="font-semibold text-[#a39a88]">forever</span>
              </div>
              <PlanFeatureList features={FREE_FEATURES} tone="slate" />
            </div>
            <div className="p-8 pt-0 mt-auto">
              <Link href="/signup" className="cbtn cbtn-white cbtn-block">
                Start Creating
              </Link>
            </div>
          </div>

          <div className="ccard !rounded-3xl ccard-hover relative flex flex-col">
            <div className="p-8 flex-grow">
              <h2 className="text-xl font-heading font-bold text-[#33312e] mb-2">Premium</h2>
              <p className="text-sm font-semibold text-[#a39a88] mb-6">Best for people hosting live games or sharing cards with players online.</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-heading font-bold text-[#33312e] tracking-tight">$7.99</span>
                <span className="font-semibold text-[#a39a88]">/month</span>
              </div>
              <p className="-mt-5 mb-6 text-sm font-bold text-[#ff5d8f]">Billed monthly</p>
              <PlanFeatureList features={PREMIUM_FEATURES} />
            </div>
            <div className="p-8 pt-0 mt-auto">
              <PricingCheckoutButton
                purchaseType="monthly"
                className="cbtn cbtn-block"
              >
                Subscribe Monthly
              </PricingCheckoutButton>
            </div>
          </div>

          <div className="ccard !rounded-3xl relative flex flex-col !border-[#ff5d8f] !shadow-[0_6px_0_#33312e]">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#ffb800] text-[#33312e] border-2 border-[#33312e] px-4 py-1 rounded-full text-xs font-heading font-bold uppercase tracking-wider shadow-[0_2px_0_#33312e]">
              Pay Once
            </div>
            <div className="p-8 flex-grow">
              <h2 className="text-xl font-heading font-bold text-[#33312e] mb-2">Lifetime</h2>
              <p className="text-sm font-semibold text-[#a39a88] mb-6">Permanent batch, sharing, and hosting access with no renewal.</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-heading font-bold text-[#33312e] tracking-tight">$29.99</span>
                <span className="font-semibold text-[#a39a88]">once</span>
              </div>
              <PlanFeatureList features={[...PREMIUM_FEATURES, "Lifetime access, never pay again"]} />
            </div>
            <div className="p-8 pt-0 mt-auto">
              <PricingCheckoutButton
                purchaseType="lifetime"
                className="cbtn cbtn-block"
              >
                Get Lifetime Access
              </PricingCheckoutButton>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto mt-12 px-4">
          <div className="ccard !rounded-3xl p-8 md:p-10">
            <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8 items-start">
              <div>
                <p className="text-xs font-heading font-bold uppercase tracking-wide text-[#7c5cff] mb-3">Paid Batch Packs and Share Links</p>
                <h2 className="text-2xl font-heading font-bold text-[#33312e] mb-4">Need a larger printable set?</h2>
                <p className="font-semibold text-[#6b6459] leading-relaxed">
                  Buy a one-time printable batch pack for saved or printable PDF sets. Share links are separate when players need online cards, and Premium includes batches, direct sharing, and hosted rooms.
                </p>
              </div>
              <div className="grid sm:grid-cols-4 gap-3">
                {([30, 100, 250, 500] as const).map((count) => (
                  <div key={count} className="rounded-2xl border-2 border-[#33312e] bg-[#fff7ed] shadow-[0_3px_0_#33312e] p-5 flex flex-col">
                    <div className="text-xl font-heading font-bold text-[#33312e]">{count} cards</div>
                    <div className="text-sm font-semibold text-[#a39a88] mb-4">printable batch</div>
                    <div className="text-lg font-heading font-bold text-[#ff5d8f]">{BATCH_PACKS[count].label}</div>
                    <Link
                      href={`/create?batchMode=1&batchCount=${count}`}
                      className="cbtn cbtn-sm mt-4 !rounded-xl"
                    >
                      Create batch
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto mt-20">
          <h2 className="text-xl font-heading font-bold text-[#33312e] text-center mb-6">Compare Plans</h2>
          <div className="ccard !rounded-2xl overflow-hidden overflow-x-auto !p-0">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b-2 border-[#33312e]">
                  <th className="text-left p-4 text-sm font-heading font-bold text-[#33312e]">Feature</th>
                  <th className="text-center p-4 text-sm font-heading font-bold text-[#33312e]">Free</th>
                  <th className="text-center p-4 text-sm font-heading font-bold text-[#33312e]">Premium</th>
                  <th className="text-center p-4 text-sm font-heading font-bold text-[#ff5d8f]">Lifetime</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {PLAN_ROWS.map(([feature, free, monthly, lifetime], index) => (
                  <tr key={feature} className={index % 2 === 0 ? "bg-[#fff7ed]/70" : ""}>
                    <td className="p-4 font-semibold text-[#33312e]">{feature}</td>
                    <td className="p-4 text-center font-semibold text-[#6b6459]">{free}</td>
                    <td className="p-4 text-center font-semibold text-[#33312e]">{monthly}</td>
                    <td className="p-4 text-center font-bold text-[#ff5d8f]">{lifetime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ_ITEMS.map((item) => ({
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

        <section className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-heading font-bold text-[#33312e] text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid gap-6">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} className="ccard !rounded-2xl p-8">
                <h3 className="font-heading font-bold text-lg text-[#33312e] mb-3">{item.question}</h3>
                <p className="font-semibold text-[#6b6459] leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-5xl mx-auto mt-24">
          <div className="bg-[#7c5cff] border-[3px] border-[#33312e] shadow-[0_6px_0_#33312e] rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-white mb-4">
                Make your first card now.
              </h2>
              <p className="text-white/85 font-semibold text-base mb-6 max-w-2xl mx-auto">
                Start with one free saved card and individual PDF/PNG exports, then add paid batch packs, player share links, or hosted bingo events when needed.
              </p>
              <Link href="/create" className="cbtn cbtn-yellow !text-lg !px-8 !py-4">
                Create Your First Card
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t-[3px] border-[#33312e] pt-16 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#ff5d8f] border-2 border-[#33312e] rounded-lg flex items-center justify-center shadow-[0_2px_0_#33312e]">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-xl font-heading font-bold text-[#33312e]">MyBingoCard</span>
            </div>
            <div className="font-semibold text-[#6b6459] text-sm">&copy; 2026 MyBingoCard. All rights reserved.</div>
            <div className="flex gap-6 text-sm font-semibold text-[#6b6459]">
              <Link href="/privacy" className="hover:text-[#ff5d8f] transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-[#ff5d8f] transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-[#ff5d8f] transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
