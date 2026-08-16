import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

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

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      {children}
    </PlayfulShell>
  );
}
