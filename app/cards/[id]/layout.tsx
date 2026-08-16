import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Bingo Card",
  description: "Private bingo card view in MyBingoCard.",
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
