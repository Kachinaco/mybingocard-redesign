import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail legal-body article-body">
          <span class="eyebrow">Trust and policies</span>
          <h1 tabindex="-1">Privacy policy</h1>
          <p class="muted">How MyBingoCard collects, uses, processes, and protects information.</p>
          <p class="caption">Design copy for review · updated July 30, 2026</p>
          <h2>Plain-language summary</h2>
          <p>MyBingoCard uses the information needed to operate accounts, save cards, provide requested exports and games, support customers, and understand product reliability. This prototype uses no real customer information.</p>
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
