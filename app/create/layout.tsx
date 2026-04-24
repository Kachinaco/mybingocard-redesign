import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Bingo Cards Online | Free Bingo Card Generator",
  description: "Create printable and online bingo cards in minutes. Build a card for free, customize every square, and share or print it from MyBingoCard.",
  alternates: {
    canonical: "https://mybingocard.com/create",
  },
  openGraph: {
    title: "Create Bingo Cards Online | MyBingoCard",
    description: "Build printable and online bingo cards for free, then customize, print, or share them in minutes.",
    url: "https://mybingocard.com/create",
    siteName: "MyBingoCard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Bingo Cards Online | MyBingoCard",
    description: "Build printable and online bingo cards for free, then customize, print, or share them in minutes.",
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
