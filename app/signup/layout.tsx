import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a MyBingoCard Account",
  description: "Create a MyBingoCard account to save bingo cards, manage exports, share player links, and return to hosted bingo games.",
  alternates: {
    canonical: "https://mybingocard.com/signup",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
