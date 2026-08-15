import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Bingo Card",
  description: "Shared bingo card view in MyBingoCard.",
  robots: {
    index: false,
    follow: false,
  },
};


import PlayfulShell from "@/components/PlayfulShell";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return <PlayfulShell>{children}</PlayfulShell>;
}
