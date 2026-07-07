import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bingo Supplies - Daubers, Cards, Markers & Accessories",
  description:
    "Shop bingo supplies for game nights and events, including daubers, markers, card holders, accessories, and printable bingo card tools.",
  alternates: {
    canonical: "https://mybingocard.com/supplies",
  },
};

export default function SuppliesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
