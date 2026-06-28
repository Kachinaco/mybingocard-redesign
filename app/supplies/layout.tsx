import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bingo Supplies Checklist: Daubers, Cards, Markers and Prizes",
  description:
    "Plan a bingo night with daubers, markers, bingo chips, cages, balls, card holders, prizes, and printable bingo card tools.",
  alternates: {
    canonical: "https://mybingocard.com/supplies",
  },
};

export default function SuppliesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
