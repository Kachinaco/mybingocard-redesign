import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — MyBingoCard",
  description: "MyBingoCard terms of service. Read our terms and conditions for using the bingo card generator.",
  alternates: {
    canonical: "https://mybingocard.com/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fff7ed]">
      <header className="bg-white border-b border-[#a39a88]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#33312e]">MyBingoCard</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-[#33312e] hover:text-[#33312e] transition-colors">Sign In</Link>
            <Link href="/signup" className="text-sm font-semibold bg-[#7c5cff] text-white px-4 py-2 rounded-lg hover:bg-[#7c5cff] transition-colors">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-[#a39a88] p-8 md:p-12">
          <h1 className="text-3xl font-black text-[#33312e] mb-2">Terms of Service</h1>
            <p className="text-sm text-[#6b6459]">Last updated: July 9, 2026</p>

          <div className="mt-8 space-y-8">

              <div>
                <h2 className="text-xl font-bold text-[#33312e] mb-3">Acceptance of Terms</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-[#33312e]">By using MyBingoCard, you agree to these terms of service</li>
                  <li className="text-[#33312e]">If you do not agree, please do not use our services</li>
                  <li className="text-[#33312e]">We may update these terms from time to time and will notify users of material changes</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#33312e] mb-3">Account Registration</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-[#33312e]">You must provide accurate information when creating an account</li>
                  <li className="text-[#33312e]">You are responsible for maintaining the security of your account</li>
                  <li className="text-[#33312e]">You must be at least 13 years old to create an account</li>
                  <li className="text-[#33312e]">One account per person — do not share account credentials</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#33312e] mb-3">Free and Premium Plans</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-[#33312e]">The free plan includes one saved bingo card, all templates, AI ideas, image cells, and individual PDF and PNG exports</li>
                  <li className="text-[#33312e]">Additional saved cards, printable batch packs, player sharing, and hosted live games are paid tools</li>
                  <li className="text-[#33312e]">Premium subscriptions are billed monthly at $7.99/month through Stripe starting at checkout</li>
                  <li className="text-[#33312e]">Lifetime Premium is available as a one-time payment where offered on the site</li>
                  <li className="text-[#33312e]">You can cancel your subscription anytime from your Settings page</li>
                  <li className="text-[#33312e]">Cancellations take effect at the end of the current billing period</li>
                  <li className="text-[#33312e]">No refunds for partial months</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#33312e] mb-3">Content Ownership</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-[#33312e]">You retain ownership of the bingo card content you create</li>
                  <li className="text-[#33312e]">You grant MyBingoCard a license to store and display your content as part of the service</li>
                  <li className="text-[#33312e]">Public cards may be visible to other users via share links</li>
                  <li className="text-[#33312e]">We may remove content that violates these terms</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#33312e] mb-3">Acceptable Use</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-[#33312e]">Do not use MyBingoCard for illegal activities</li>
                  <li className="text-[#33312e]">Do not create cards with hateful, abusive, or harmful content</li>
                  <li className="text-[#33312e]">Do not attempt to disrupt or overload our services</li>
                  <li className="text-[#33312e]">Do not scrape, crawl, or automated-access our platform without permission</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#33312e] mb-3">Limitation of Liability</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-[#33312e]">MyBingoCard is provided "as is" without warranties</li>
                  <li className="text-[#33312e]">We are not liable for any damages resulting from the use of our service</li>
                  <li className="text-[#33312e]">Our total liability is limited to the amount you paid us in the past 12 months</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#33312e] mb-3">Contact</h2>
                <p className="text-[#33312e] leading-relaxed">For questions about these terms, email support@mybingocard.com</p>
              </div>

          </div>
        </div>
      </main>

      <footer className="border-t border-[#a39a88] py-8 text-center text-[#6b6459] text-sm">
        <p>&copy; 2026 MyBingoCard. All rights reserved.</p>
      </footer>
    </div>
  );
}
