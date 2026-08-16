import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";
import WorkflowStatePicker from "@/components/WorkflowStatePicker";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PlayfulShell>
      <WorkflowStatePicker route="/admin/users/demo-user" />
      {children}
    </PlayfulShell>
  );
}
