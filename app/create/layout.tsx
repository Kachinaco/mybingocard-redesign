import type { Metadata } from "next";
import "./create.css";

export const metadata: Metadata = {
  title: "Create a Bingo Card Online | MyBingoCard",
  description: "Create printable and online-ready bingo cards in minutes. Save one card, customize it with templates, images, and AI ideas, then export an individual PDF or PNG for free.",
  other: {
    google: "notranslate",
  },
  alternates: {
    canonical: "https://mybingocard.com/create",
  },
  openGraph: {
    title: "Create Bingo Cards Online | MyBingoCard",
    description: "Build one printable bingo card and export an individual PDF or PNG for free, then add paid batch packs, share links, or live hosting when a group needs more.",
    url: "https://mybingocard.com/create",
    siteName: "MyBingoCard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Bingo Cards Online | MyBingoCard",
    description: "Build one printable bingo card and export an individual PDF or PNG for free, then add paid batch packs, share links, or live hosting when a group needs more.",
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
