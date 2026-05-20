import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bingo Card Generator Pricing - Free, Premium & Bulk Cards",
  description:
    "Compare MyBingoCard pricing for free text and image bingo cards, Premium AI generation, HD exports, ad-free sharing, and one-time bulk card packs.",
  alternates: {
    canonical: "https://mybingocard.com/pricing",
  },
  openGraph: {
    title: "Bingo Card Generator Pricing | MyBingoCard",
    description:
      "Start free with text and image bingo cards, then upgrade when you need AI generation, HD exports, ad-free sharing, or bulk card packs.",
    url: "https://mybingocard.com/pricing",
    siteName: "MyBingoCard",
    type: "website",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
