import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — MyBingoCard",
  description: "MyBingoCard pricing plans. Start free, then upgrade for AI generation, image bingo cards, premium templates, HD exports, and ad-free sharing.",
  alternates: {
    canonical: "https://mybingocard.com/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
