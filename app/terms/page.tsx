import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — MyBingoCard",
  description: "MyBingoCard terms of service. Read our terms and conditions for using the bingo card generator.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">MyBingoCard</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Sign In</Link>
            <Link href="/signup" className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <h1 className="text-3xl font-black text-slate-900 mb-2">Terms of Service</h1>
            <p className="text-sm text-slate-400">Last updated: March 8, 2026</p>

          <div className="mt-8 space-y-8">

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Acceptance of Terms</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">By using MyBingoCard, you agree to these terms of service</li>
                  <li className="text-slate-600">If you do not agree, please do not use our services</li>
                  <li className="text-slate-600">We may update these terms from time to time and will notify users of material changes</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Account Registration</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">You must provide accurate information when creating an account</li>
                  <li className="text-slate-600">You are responsible for maintaining the security of your account</li>
                  <li className="text-slate-600">You must be at least 13 years old to create an account</li>
                  <li className="text-slate-600">One account per person — do not share account credentials</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Free and Premium Plans</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">Free accounts can create 1 bingo card with limited features</li>
                  <li className="text-slate-600">Premium subscriptions are billed monthly at $4.99/month through Stripe</li>
                  <li className="text-slate-600">You can cancel your subscription anytime from your Settings page</li>
                  <li className="text-slate-600">Cancellations take effect at the end of the current billing period</li>
                  <li className="text-slate-600">No refunds for partial months</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Content Ownership</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">You retain ownership of the bingo card content you create</li>
                  <li className="text-slate-600">You grant MyBingoCard a license to store and display your content as part of the service</li>
                  <li className="text-slate-600">Public cards may be visible to other users via share links</li>
                  <li className="text-slate-600">We may remove content that violates these terms</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Acceptable Use</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">Do not use MyBingoCard for illegal activities</li>
                  <li className="text-slate-600">Do not create cards with hateful, abusive, or harmful content</li>
                  <li className="text-slate-600">Do not attempt to disrupt or overload our services</li>
                  <li className="text-slate-600">Do not scrape, crawl, or automated-access our platform without permission</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Limitation of Liability</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">MyBingoCard is provided "as is" without warranties</li>
                  <li className="text-slate-600">We are not liable for any damages resulting from the use of our service</li>
                  <li className="text-slate-600">Our total liability is limited to the amount you paid us in the past 12 months</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Contact</h2>
                <p className="text-slate-600 leading-relaxed">For questions about these terms, email support@mybingocard.com</p>
              </div>

          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-sm">
        <p>&copy; 2026 MyBingoCard. All rights reserved.</p>
      </footer>
    </div>
  );
}
