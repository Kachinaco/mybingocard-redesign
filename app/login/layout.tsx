import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your MyBingoCard account to manage cards, templates, exports, and sharing settings.",
  alternates: {
    canonical: "https://mybingocard.com/login",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
