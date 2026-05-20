import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Online Bingo Game",
  description: "Join or host an online bingo game with MyBingoCard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
