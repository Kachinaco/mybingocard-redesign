import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email Preferences",
  description: "Update your MyBingoCard email preferences and unsubscribe settings.",
  alternates: {
    canonical: "https://mybingocard.com/unsubscribe",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
