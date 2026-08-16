import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function PreviewNot_foundPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail">
          <section class="card empty-state"><div class="empty-state-inner"><span class="empty-icon" aria-hidden="true">?</span><span class="eyebrow">404 · page not found</span><h1 tabindex="-1">That page does not exist</h1><p class="muted">Check the address or use the screen browser to return to a current MyBingoCard page.</p><div class="button-row"><button class="button button-primary" type="button" data-action="open-routes">Browse all screens</button><a href="/" data-route class="button">Return home</a></div><p class="caption">Local system-state preview · no redirect, cookie, record, or production request occurred.</p></div></section>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
