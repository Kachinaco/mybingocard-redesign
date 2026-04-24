import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication Error",
  description: "Resolve sign-in and authentication issues for your MyBingoCard account.",
  alternates: {
    canonical: "https://mybingocard.com/auth-error",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
