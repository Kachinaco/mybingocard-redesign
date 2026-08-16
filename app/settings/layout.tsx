import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";
import WorkflowStatePicker from "@/components/WorkflowStatePicker";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your MyBingoCard account details, subscription, and preferences.",
  alternates: {
    canonical: "https://mybingocard.com/settings",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      <WorkflowStatePicker route="/settings" />
      {children}
    </PlayfulShell>
  );
}
