"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { trackClientActivity } from "@/lib/activity-client";
import { FACEBOOK_PAGE_URL, REDDIT_COMMUNITY_URL } from "@/lib/social-links";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  return (
    <header className="fixed top-0 left-0 right-0 w-full max-w-full z-50 overflow-x-clip bg-[#fff7ed]/95 backdrop-blur-md border-b-[3px] border-[#33312e]">
      <div className="container mx-auto max-w-full px-4 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="min-w-0 flex items-center gap-2 group">
          <div className="w-8 h-8 bg-[#ff5d8f] border-2 border-[#33312e] rounded-xl flex items-center justify-center shadow-[0_2px_0_#33312e] group-hover:-rotate-6 transition-all duration-300">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <span className="hidden min-[390px]:inline truncate text-base sm:text-lg font-heading font-bold text-[#ff5d8f]">
            MyBingoCard
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/templates" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">
            Templates
          </Link>
          <Link href="/bingo-games" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">
            Bingo Games
          </Link>
          <Link href="/pricing" className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors">
            Pricing
          </Link>
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClientActivity("facebook_page_clicked", { source: "desktop_nav" })}
            className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors"
          >
            Facebook
          </a>
          <a
            href={REDDIT_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClientActivity("reddit_community_clicked", { source: "desktop_nav" })}
            className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors"
          >
            Reddit
          </a>
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="cbtn cbtn-white cbtn-sm"
              >
                My Dashboard
              </Link>
              <Link
                href="/create"
                className="cbtn cbtn-sm"
              >
                Create Card
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/create"
                className="text-sm font-bold text-[#33312e] hover:text-[#ff5d8f] transition-colors"
              >
                Create Card
              </Link>
              <Link
                href="/signup"
                className="cbtn cbtn-sm"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile: primary create action + hamburger */}
        <div className="md:hidden flex shrink-0 items-center gap-2">
          <Link
            href="/create"
            aria-label="Create a bingo card"
            className="cbtn cbtn-sm shrink-0"
          >
            {isLoggedIn ? "New Card" : "Make Card"}
          </Link>
          <button
            onClick={() => {
              const nextOpen = !open;
              setOpen(nextOpen);
              trackClientActivity("mobile_menu_toggled", { opened: nextOpen });
            }}
            className="p-2 text-[#33312e] hover:text-[#ff5d8f] transition-colors"
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
        <div className="md:hidden bg-[#fff7ed] border-t-[3px] border-[#33312e]">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
            <div className="flex gap-3 mb-3">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="cbtn cbtn-white flex-1"
                >
                  My Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="cbtn cbtn-white flex-1"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="cbtn flex-1"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
            <div className="h-[2px] bg-[#33312e]/10 my-1" />
            <Link href="/create" onClick={() => setOpen(false)} className="py-3 px-2 text-[#33312e] font-bold hover:text-[#ff5d8f] transition-colors">
              Create Card
            </Link>
            <Link href="/templates" onClick={() => setOpen(false)} className="py-3 px-2 text-[#33312e] font-bold hover:text-[#ff5d8f] transition-colors">
              Templates
            </Link>
            <Link href="/bingo-games" onClick={() => setOpen(false)} className="py-3 px-2 text-[#33312e] font-bold hover:text-[#ff5d8f] transition-colors">
              Bingo Games
            </Link>
            <Link href="/pricing" onClick={() => setOpen(false)} className="py-3 px-2 text-[#33312e] font-bold hover:text-[#ff5d8f] transition-colors">
              Pricing
            </Link>
            <Link href="/features" onClick={() => setOpen(false)} className="py-3 px-2 text-[#33312e] font-bold hover:text-[#ff5d8f] transition-colors">
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
              className="py-3 px-2 text-[#33312e] font-bold hover:text-[#ff5d8f] transition-colors"
            >
              Facebook
            </a>
            <a
              href={REDDIT_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setOpen(false);
                trackClientActivity("reddit_community_clicked", { source: "mobile_menu" });
              }}
              className="py-3 px-2 text-[#33312e] font-bold hover:text-[#ff5d8f] transition-colors"
            >
              Reddit
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
