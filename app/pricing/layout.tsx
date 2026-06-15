import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bingo Card Generator Pricing - Free Creator Tools & Free Batches",
  description:
    "Compare MyBingoCard pricing: free saved cards, templates, AI ideas, and image cells, plus free PDF exports, PNG exports, printable batch packs, share links, and live bingo hosting.",
  alternates: {
    canonical: "https://mybingocard.com/pricing",
  },
  openGraph: {
    title: "Bingo Card Generator Free Access | MyBingoCard",
    description:
      "Create, save, customize, export, batch, share, and host live bingo games for free right now.",
    url: "https://mybingocard.com/pricing",
    siteName: "MyBingoCard",
    type: "website",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
