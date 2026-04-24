import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your MyBingoCard account details, subscription, and preferences.",
  alternates: {
    canonical: "https://mybingocard.com/settings",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
