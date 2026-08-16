import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Play Bingo",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      {children}
    </PlayfulShell>
  );
}
