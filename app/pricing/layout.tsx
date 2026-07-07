import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bingo Card Generator Pricing - Free Creator Tools & Paid Batches",
  description:
    "Compare MyBingoCard pricing: one saved card, templates, AI ideas, image cells, PDF and PNG exports, plus paid printable batch packs, share links, and live bingo hosting.",
  alternates: {
    canonical: "https://mybingocard.com/pricing",
  },
  openGraph: {
    title: "Bingo Card Generator Pricing | MyBingoCard",
    description:
      "Create, customize, save your first card, and export individual bingo cards for free. Pay when you need more saved cards, printable batches, player share links, or hosted live bingo.",
    url: "https://mybingocard.com/pricing",
    siteName: "MyBingoCard",
    type: "website",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
