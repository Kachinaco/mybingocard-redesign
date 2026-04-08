import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bingo Supplies — Daubers, Cards & Accessories | MyBingoCard",
  description: "Shop the best bingo supplies — daubers, markers, card holders, and accessories for your next bingo game night.",
  alternates: {
    canonical: "https://mybingocard.com/supplies",
  },
};

export default function SuppliesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
