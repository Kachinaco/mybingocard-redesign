import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";
import WorkflowStatePicker from "@/components/WorkflowStatePicker";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset access to your MyBingoCard account if you forgot your password.",
  alternates: {
    canonical: "https://mybingocard.com/forgot-password",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      <WorkflowStatePicker route="/forgot-password" />
      {children}
    </PlayfulShell>
  );
}
