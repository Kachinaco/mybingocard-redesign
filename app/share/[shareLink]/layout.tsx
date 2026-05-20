import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Bingo Card",
  description: "Shared bingo card view in MyBingoCard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
