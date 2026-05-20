import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bingo Card",
  description: "Private bingo card view in MyBingoCard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
