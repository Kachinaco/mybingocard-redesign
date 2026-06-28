import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join an Online Bingo Game | MyBingoCard",
  description: "Enter a MyBingoCard room code to join a hosted online bingo game from your phone, tablet, or computer.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
