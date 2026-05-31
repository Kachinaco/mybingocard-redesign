"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { trackClientActivity } from "@/lib/activity-client";
import { FACEBOOK_PAGE_URL } from "@/lib/social-links";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  return (
    <header className="fixed top-0 left-0 right-0 w-full max-w-full z-50 overflow-x-clip bg-white/80 backdrop-blur-md border-b border-slate-200/50">
      <div className="container mx-auto max-w-full px-4 lg:px-8 h-20 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="min-w-0 flex items-center gap-2 group">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <span className="truncate text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
            MyBingoCard
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/templates" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
            Templates
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
            Pricing
          </Link>
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClientActivity("facebook_page_clicked", { source: "desktop_nav" })}
            className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            Facebook
          </a>
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-300 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-indigo-50"
              >
                My Dashboard
              </Link>
              <Link
                href="/create"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Create Card
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/create"
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Create Card
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Start Free
              </Link>
            </>
          )}
        </nav>

        {/* Mobile: Sign In/Dashboard + hamburger */}
        <div className="md:hidden flex shrink-0 items-center gap-2">
          <Link
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="text-sm font-semibold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            {isLoggedIn ? "Dashboard" : "Sign In"}
          </Link>
          <button
            onClick={() => {
              const nextOpen = !open;
              setOpen(nextOpen);
              trackClientActivity("mobile_menu_toggled", { opened: nextOpen });
            }}
            className="p-2 text-slate-600 hover:text-slate-900 transition-colors"
            aria-label="Menu"
          >
            {open ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
            <div className="flex gap-3 mb-3">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center py-3 font-bold text-indigo-600 border-2 border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  My Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center py-3 font-bold text-indigo-600 border-2 border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center py-3 font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:shadow-lg transition-all"
                  >
                    Start Free
                  </Link>
                </>
              )}
            </div>
            <div className="h-px bg-slate-100 my-1" />
            <Link href="/create" onClick={() => setOpen(false)} className="py-3 px-2 text-slate-700 font-medium hover:text-indigo-600 transition-colors">
              Create Card
            </Link>
            <Link href="/templates" onClick={() => setOpen(false)} className="py-3 px-2 text-slate-700 font-medium hover:text-indigo-600 transition-colors">
              Templates
            </Link>
            <Link href="/pricing" onClick={() => setOpen(false)} className="py-3 px-2 text-slate-700 font-medium hover:text-indigo-600 transition-colors">
              Pricing
            </Link>
            <Link href="/features" onClick={() => setOpen(false)} className="py-3 px-2 text-slate-700 font-medium hover:text-indigo-600 transition-colors">
              Features
            </Link>
            <a
              href={FACEBOOK_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setOpen(false);
                trackClientActivity("facebook_page_clicked", { source: "mobile_menu" });
              }}
              className="py-3 px-2 text-slate-700 font-medium hover:text-indigo-600 transition-colors"
            >
              Facebook
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
