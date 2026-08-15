import type { Metadata } from "next";

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

import PlayfulShell from "@/components/PlayfulShell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PlayfulShell>{children}</PlayfulShell>;
}
