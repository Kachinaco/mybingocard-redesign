"use client";

import Link from "next/link";
import PremiumCheckoutButton from "@/components/PremiumCheckoutButton";
import SignOutButton from "@/components/SignOutButton";

export default function AccountPendingCheckoutGate({ email }: { email: string }) {
  return (
    <div className="min-h-screen bg-[#fff7ed] px-4 py-8 selection:bg-[#7c5cff]/15 selection:text-[#7c5cff]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] shadow-lg shadow-[#7c5cff]">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="truncate text-xl font-black text-[#33312e]">MyBingoCard</span>
          </Link>
          <SignOutButton />
        </header>

        <main className="flex flex-1 items-center justify-center py-12">
          <section className="w-full rounded-2xl border border-[#7c5cff]/15 bg-white p-6 text-center shadow-xl shadow-[#7c5cff]/15 sm:p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7c5cff]/10">
              <svg className="h-8 w-8 text-[#7c5cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#7c5cff]">Account pending checkout</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#33312e] sm:text-4xl">
              Paid checkout is only for batches, sharing, and hosting
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#33312e]">
              You are signed in{email ? ` as ${email}` : ""}. The free plan includes one saved card and individual PDF/PNG exports; paid checkout adds printable batches, share links, or hosted live games.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <PremiumCheckoutButton
                source="account_pending_checkout_gate"
                successPath="/dashboard"
                label="Subscribe for $7.99/mo"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#7c5cff] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#7c5cff] transition hover:shadow-[#7c5cff]"
              />
              <Link
                href="/create"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#a39a88] bg-white px-6 py-3 text-sm font-bold text-[#33312e] transition hover:bg-[#fff7ed]"
              >
                Back to card builder
              </Link>
            </div>
            <p className="mt-4 text-xs text-[#6b6459]">
              $7.99/month. Cancel anytime. Lifetime access is available on the pricing page.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
