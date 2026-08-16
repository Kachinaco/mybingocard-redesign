import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";
import WorkflowStatePicker from "@/components/WorkflowStatePicker";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your saved bingo cards, sharing tools, and account activity in MyBingoCard.",
  alternates: {
    canonical: "https://mybingocard.com/dashboard",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      <WorkflowStatePicker route="/dashboard" />
      {children}
    </PlayfulShell>
  );
}
