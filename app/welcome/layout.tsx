import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      {children}
    </PlayfulShell>
  );
}
