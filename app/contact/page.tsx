import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Contact support",
};

export default function ContactPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail">
          <div class="article-layout">
            <div>
              <div class="page-heading">
                <span class="eyebrow">Support</span>
                <h1 tabindex="-1">Contact support</h1>
                <p>Ways to contact MyBingoCard with product, account, billing, or content questions.</p>
              </div>
              <div class="card card-body">
                <h2>Email support</h2>
                <p>Send product, account, billing, or content questions to our support team.</p>
                <a href="mailto:support@mybingocard.com" class="button button-primary">Email support</a>
                <p class="caption">Include the page URL and what you expected to happen.</p>
              </div>
            </div>
            <aside class="card-soft article-aside">
              <h2>Quick help</h2>
              <a href="/how-to-play-bingo" data-route class="">Read how to play</a>
              <a href="/features" data-route class="">Explore product features</a>
              <a href="/settings" data-route class="">Open account settings</a>
              <p class="caption">Support email: <a href="mailto:support@mybingocard.com">support@mybingocard.com</a></p>
            </aside>
          </div>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
