import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — MyBingoCard",
  description: "MyBingoCard pricing plans. Free bingo card maker with premium options for unlimited cards, AI generation, HD exports, and more.",
  alternates: {
    canonical: "https://mybingocard.com/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
