import type { Metadata } from "next";
import Link from "next/link";
import ContactTracker from "./ContactTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Contact Us — MyBingoCard",
  description: "Get in touch with the MyBingoCard team. We're here to help with questions, feedback, or support.",
  alternates: {
    canonical: "https://mybingocard.com/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <ContactTracker />
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
          <h1 className="text-3xl font-black text-slate-900 mb-2">Contact Us</h1>

          <div className="mt-8 space-y-8">

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Get in Touch</h2>
                <p className="text-slate-600 leading-relaxed">We'd love to hear from you! Whether you have a question, feedback, or need help with your bingo cards, we're here for you.</p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Email Support</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">Send us an email at support@mybingocard.com</li>
                  <li className="text-slate-600">We read every message and typically respond within 24 hours</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Common Questions</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-slate-600">How do I upgrade to Premium? — Visit your Settings page or the Pricing page</li>
                  <li className="text-slate-600">How do I cancel my subscription? — Go to Settings and click Manage Subscription</li>
                  <li className="text-slate-600">Can I get a refund? — Email us and we'll work something out</li>
                  <li className="text-slate-600">How do I export my cards? — Open any card and click the Export tab</li>
                  <li className="text-slate-600">How do I host a live game? — Open a card and click "Host Live Game" in the Play tab</li>
                </ul>
              </div>

          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-sm">
        <p>&copy; 2026 MyBingoCard. All rights reserved.</p>
      </footer>      <SeoSupportBlock slug="contact" />

    </div>
  );
}
