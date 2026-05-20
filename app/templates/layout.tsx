import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Bingo Card Templates - Printable Wedding, Baby Shower & Classroom Cards",
  description:
    "Browse free printable bingo card templates for weddings, baby showers, classrooms, holidays, parties, office events, and more. Customize and print instantly.",
  alternates: {
    canonical: "https://mybingocard.com/templates",
  },
  openGraph: {
    title: "Free Bingo Card Templates | MyBingoCard",
    description:
      "Customize printable bingo card templates for weddings, baby showers, classrooms, holidays, parties, and office events.",
    url: "https://mybingocard.com/templates",
    siteName: "MyBingoCard",
    type: "website",
  },
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
