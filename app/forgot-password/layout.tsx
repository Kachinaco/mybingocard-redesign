import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset access to your MyBingoCard account if you forgot your password.",
  alternates: {
    canonical: "https://mybingocard.com/forgot-password",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
