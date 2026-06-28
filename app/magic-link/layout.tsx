import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Magic Link Sign In",
  description: "Use a secure MyBingoCard magic link to sign in to your account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
