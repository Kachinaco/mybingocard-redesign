import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — MyBingoCard",
  description: "MyBingoCard privacy policy. Learn how we collect, use, and protect your personal information.",
  alternates: {
    canonical: "https://mybingocard.com/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-black text-slate-900 mb-2">Privacy Policy</h1>
            <p className="text-sm text-slate-400">Last updated: March 9, 2026</p>

          <div className="mt-8 space-y-8">

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Information We Collect</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">Account information (name, email) when you sign up</li>
                  <li className="text-slate-600">Bingo card content you create</li>
                  <li className="text-slate-600">Usage data such as pages visited and features used</li>
                  <li className="text-slate-600">Payment information only if paid plans are re-enabled later, processed securely through Stripe (we never store card numbers)</li>
                  <li className="text-slate-600">Device and browser information for analytics</li>
                  <li className="text-slate-600">Session activity data including pages visited, scroll depth, features used, and last-seen timestamps to help us understand how you use the product and improve your experience</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">How We Use Your Information</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">To provide and improve our bingo card services</li>
                  <li className="text-slate-600">To manage account access and, if paid plans are re-enabled later, process payments or subscriptions</li>
                  <li className="text-slate-600">To send transactional emails (welcome, password reset, receipts)</li>
                  <li className="text-slate-600">To send product update emails (you can unsubscribe anytime)</li>
                  <li className="text-slate-600">To analyze usage patterns and improve the product</li>
                  <li className="text-slate-600">To track session activity (e.g., last active time) while you are logged in, using periodic background pings — this data is used only for product analytics and is never sold or shared</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Data Sharing</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">We do not sell your personal information to third parties</li>
                  <li className="text-slate-600">We share data with Stripe only if you manage an existing subscription or paid plans are re-enabled later</li>
                  <li className="text-slate-600">We use Google Analytics for anonymous usage tracking</li>
                  <li className="text-slate-600">We may share data if required by law</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Data Security</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">All data is transmitted over HTTPS encryption</li>
                  <li className="text-slate-600">Passwords are hashed using bcrypt</li>
                  <li className="text-slate-600">If paid plans are re-enabled later, payment processing is handled by Stripe (PCI compliant)</li>
                  <li className="text-slate-600">We regularly review our security practices</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Your Rights</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">Access, update, or delete your account data at any time from Settings</li>
                  <li className="text-slate-600">Unsubscribe from marketing emails via the link in any email</li>
                  <li className="text-slate-600">Request a full export or deletion of your data by emailing support@mybingocard.com</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Cookies</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">We use essential cookies for authentication and session management</li>
                  <li className="text-slate-600">We use Google Analytics cookies for anonymous usage tracking</li>
                  <li className="text-slate-600">You can disable cookies in your browser settings</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Contact</h2>
                <p className="text-slate-600 leading-relaxed">For privacy questions, email us at support@mybingocard.com</p>
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
