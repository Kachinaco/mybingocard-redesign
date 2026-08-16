import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Terms of service",
};

export default function TermsPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail legal-body article-body">
          <span class="eyebrow">Trust and policies</span>
          <h1 tabindex="-1">Terms of service</h1>
          <p class="muted">The terms and conditions that govern use of MyBingoCard.</p>
          <p class="caption">Updated July 30, 2026</p>
          <h2>Plain-language summary</h2>
          <p>Use MyBingoCard to make, share, print, and play lawful bingo games. Do not use it for illegal gambling, harmful content, or access you do not have permission to grant.</p>
          <h2>Accounts and content</h2>
          <p>You are responsible for the card text and images you add. Keep account details accurate, protect sign-in access, and use sharing controls that match your intended audience.</p>
          <h2>Payments and plan changes</h2>
          <p>Paid options show their price and renewal structure before checkout. Cancellation, access duration, and one-time batch details should remain visible in account settings and receipts.</p>
          <h2>Questions</h2>
          <p><a href="/contact" data-route class="">Contact support</a> if you need help understanding these terms or how information is handled.</p>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
