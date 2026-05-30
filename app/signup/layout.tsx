import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a free MyBingoCard account to save bingo cards, manage templates, and upgrade to Premium when you want more features.",
  alternates: {
    canonical: "https://mybingocard.com/signup",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
