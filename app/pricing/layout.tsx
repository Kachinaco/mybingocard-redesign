import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bingo Card Generator Pricing and Access",
  description:
    "Compare MyBingoCard access for saved cards, templates, AI ideas, image cells, PDF exports, printable batches, share links, and live games.",
  alternates: {
    canonical: "https://mybingocard.com/pricing",
  },
  openGraph: {
    title: "Bingo Card Generator Pricing | MyBingoCard",
    description:
      "See what is included for custom bingo card creation, printable batches, player share links, and live bingo hosting.",
    url: "https://mybingocard.com/pricing",
    siteName: "MyBingoCard",
    type: "website",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
