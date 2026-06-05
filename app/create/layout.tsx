import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Bingo Cards Online | Free Bingo Draft Editor",
  description: "Draft printable and online bingo cards in minutes. Build a free draft, customize every square, then start checkout when you are ready to save, share, or export.",
  other: {
    google: "notranslate",
  },
  alternates: {
    canonical: "https://mybingocard.com/create",
  },
  openGraph: {
    title: "Create Bingo Cards Online | MyBingoCard",
    description: "Build a printable or online bingo draft, then start checkout when you are ready to save, share, or export.",
    url: "https://mybingocard.com/create",
    siteName: "MyBingoCard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Bingo Cards Online | MyBingoCard",
    description: "Build a printable or online bingo draft, then start checkout when you are ready to save, share, or export.",
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
