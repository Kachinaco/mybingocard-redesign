import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a MyBingoCard account, save your first card, and upgrade when you need unlimited cards, exports, sharing, and Premium tools.",
  alternates: {
    canonical: "https://mybingocard.com/signup",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
