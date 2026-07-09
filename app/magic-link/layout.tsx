import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Magic Link Sign In",
  description: "Complete a secure MyBingoCard magic-link sign-in.",
  alternates: {
    canonical: "https://mybingocard.com/magic-link",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function MagicLinkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
