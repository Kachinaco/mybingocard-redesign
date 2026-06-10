import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bingo Card Generator Pricing - Free Creator Tools & Paid Batches",
  description:
    "Compare MyBingoCard pricing: free saved cards, templates, AI ideas, image cells, PDF and PNG exports, plus paid printable batch packs, share links, and live bingo hosting.",
  alternates: {
    canonical: "https://mybingocard.com/pricing",
  },
  openGraph: {
    title: "Bingo Card Generator Pricing | MyBingoCard",
    description:
      "Create, save, customize, and export individual bingo cards for free. Pay only when you need printable batches, player share links, or hosted live bingo.",
    url: "https://mybingocard.com/pricing",
    siteName: "MyBingoCard",
    type: "website",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
