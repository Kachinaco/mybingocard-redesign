import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Online Bingo Game",
  description: "Join or host an online bingo game with MyBingoCard.",
  robots: {
    index: false,
    follow: false,
  },
};


import PlayfulShell from "@/components/PlayfulShell";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return <PlayfulShell>{children}</PlayfulShell>;
}
