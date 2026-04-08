import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bingo Card Templates — Free Printable Templates for Any Occasion | MyBingoCard",
  description: "Browse 30+ free bingo card templates for weddings, baby showers, classrooms, holidays, and more. Customize and print instantly.",
  alternates: {
    canonical: "https://mybingocard.com/templates",
  },
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
