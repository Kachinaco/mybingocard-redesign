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


import PlayfulShell from "@/components/PlayfulShell";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return <PlayfulShell>{children}</PlayfulShell>;
}
