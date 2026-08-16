import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";
import WorkflowStatePicker from "@/components/WorkflowStatePicker";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address to finish setting up your MyBingoCard account.",
  alternates: {
    canonical: "https://mybingocard.com/verify-email",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      <WorkflowStatePicker route="/verify-email" />
      {children}
    </PlayfulShell>
  );
}
