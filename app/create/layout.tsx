import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Bingo Cards Online | Free Bingo Card Maker",
  description: "Create printable and online-ready bingo cards in minutes. Save, customize, use templates, add images, generate ideas, and export PDFs or PNGs for free.",
  other: {
    google: "notranslate",
  },
  alternates: {
    canonical: "https://mybingocard.com/create",
  },
  openGraph: {
    title: "Create Bingo Cards Online | MyBingoCard",
    description: "Build printable bingo cards for free, then add free share links or live hosting when players need online access.",
    url: "https://mybingocard.com/create",
    siteName: "MyBingoCard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Bingo Cards Online | MyBingoCard",
    description: "Build printable bingo cards for free, then add free share links or live hosting when players need online access.",
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
