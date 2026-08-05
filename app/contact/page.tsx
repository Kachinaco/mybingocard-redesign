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
  robots: {
    index: false,
    follow: true,
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#fff7ed]">
      <ContactTracker />
      <header className="bg-[#fff7ed]/95 backdrop-blur-md border-b-[3px] border-[#33312e]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#ff5d8f] border-2 border-[#33312e] rounded-lg flex items-center justify-center shadow-[0_2px_0_#33312e]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-heading font-bold text-[#ff5d8f]">MyBingoCard</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">Sign In</Link>
            <Link href="/signup" className="cbtn cbtn-sm">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="ccard !rounded-2xl p-8 md:p-12">
          <h1 className="text-3xl font-black text-[#33312e] mb-2">Contact Us</h1>

          <div className="mt-8 space-y-8">

              <div>
                <h2 className="text-xl font-bold text-[#33312e] mb-3">Get in Touch</h2>
                <p className="text-[#33312e] leading-relaxed">We'd love to hear from you! Whether you have a question, feedback, or need help with your bingo cards, we're here for you.</p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#33312e] mb-3">Email Support</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-[#33312e]">Send us an email at support@mybingocard.com</li>
                  <li className="text-[#33312e]">We read every message and typically respond within 24 hours</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#33312e] mb-3">Common Questions</h2>
                <ul className="space-y-2 list-disc list-inside">
                  <li className="text-[#33312e]">How do I upgrade to Premium? — Visit your Settings page or the Pricing page</li>
                  <li className="text-[#33312e]">How do I cancel my subscription? — Go to Settings and click Manage Subscription</li>
                  <li className="text-[#33312e]">Can I get a refund? — Email us and we'll work something out</li>
                  <li className="text-[#33312e]">How do I export my cards? — Open any card and click the Export tab</li>
                  <li className="text-[#33312e]">How do I host a live game? — Open a card and click "Host Live Game" in the Play tab</li>
                </ul>
              </div>

          </div>
        </div>
      </main>

      <footer className="border-t border-[#a39a88] py-8 text-center text-[#6b6459] text-sm">
        <p>&copy; 2026 MyBingoCard. All rights reserved.</p>
      </footer>      <SeoSupportBlock slug="contact" />

    </div>
  );
}
