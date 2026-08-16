import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";
import WorkflowStatePicker from "@/components/WorkflowStatePicker";

export const metadata: Metadata = {
  title: "Play Bingo",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      <WorkflowStatePicker route="/play/demo-link" />
      {children}
    </PlayfulShell>
  );
}
