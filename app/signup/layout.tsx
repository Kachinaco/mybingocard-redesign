import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";
import WorkflowStatePicker from "@/components/WorkflowStatePicker";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a MyBingoCard account, save your first card, and upgrade when you need unlimited cards, exports, sharing, and Premium tools.",
  alternates: {
    canonical: "https://mybingocard.com/signup",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      <WorkflowStatePicker route="/signup" />
      {children}
    </PlayfulShell>
  );
}
