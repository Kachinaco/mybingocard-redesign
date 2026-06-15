import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a MyBingoCard account, save your first card, and use unlimited cards, exports, sharing, and free tools.",
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
