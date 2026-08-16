import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your saved bingo cards, sharing tools, and account activity in MyBingoCard.",
  alternates: {
    canonical: "https://mybingocard.com/dashboard",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
