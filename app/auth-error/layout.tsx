import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";
import WorkflowStatePicker from "@/components/WorkflowStatePicker";

export const metadata: Metadata = {
  title: "Authentication Error",
  description: "Resolve sign-in and authentication issues for your MyBingoCard account.",
  alternates: {
    canonical: "https://mybingocard.com/auth-error",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      <WorkflowStatePicker route="/auth-error" />
      {children}
    </PlayfulShell>
  );
}
