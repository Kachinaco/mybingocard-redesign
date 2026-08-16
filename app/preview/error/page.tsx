import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Something went wrong",
};

export default function PreviewErrorPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail">
          <section class="card empty-state"><div class="empty-state-inner"><span class="empty-icon" aria-hidden="true">!</span><span class="eyebrow">Recoverable application error</span><h1 tabindex="-1">Something went wrong</h1><p class="muted">Your local draft remains in this browser tab. Try rendering the screen again or return to the dashboard.</p><div class="button-row"><button class="button button-primary" type="button" data-action="copy">Try again</button><a href="/" data-route class="button">Return home</a></div><p class="caption">Local system-state preview · no redirect, cookie, record, or production request occurred.</p></div></section>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
