import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Online Bingo Game",
  description: "Join or host an online bingo game with MyBingoCard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      {children}
    </PlayfulShell>
  );
}
