"use client";

import Link from "next/link";
import PremiumCheckoutButton from "@/components/PremiumCheckoutButton";
import SignOutButton from "@/components/SignOutButton";

export default function AccountPendingCheckoutGate({ email }: { email: string }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-indigo-200">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="truncate text-xl font-black text-slate-950">MyBingoCard</span>
          </Link>
          <SignOutButton />
        </header>

        <main className="flex flex-1 items-center justify-center py-12">
          <section className="w-full rounded-2xl border border-indigo-100 bg-white p-6 text-center shadow-xl shadow-indigo-100/70 sm:p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
              <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Checkout disabled</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Your account has free access
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
              You are signed in{email ? ` as ${email}` : ""}. Printable batches, share links, email sharing, and hosted live games are free right now.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <PremiumCheckoutButton
                source="account_pending_checkout_gate"
                successPath="/dashboard"
                label="Continue Free"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:shadow-indigo-300"
              />
              <Link
                href="/create"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
              >
                Back to card builder
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              No trial, card, or payment is needed while checkout is disabled.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
