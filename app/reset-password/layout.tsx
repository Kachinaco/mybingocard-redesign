import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";
import WorkflowStatePicker from "@/components/WorkflowStatePicker";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Choose a new password for your MyBingoCard account.",
  alternates: {
    canonical: "https://mybingocard.com/reset-password",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      <WorkflowStatePicker route="/reset-password" />
      {children}
    </PlayfulShell>
  );
}
