import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Browser not supported",
};

export default function Unsupported_browserPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail">
          <section class="card empty-state"><div class="empty-state-inner"><span class="empty-icon" aria-hidden="true">⌁</span><span class="eyebrow">Browser compatibility</span><h1 tabindex="-1">This browser needs an update</h1><p class="muted">MyBingoCard requires current JavaScript, secure storage, and modern layout support. Update the browser or open the site in a current Safari, Chrome, Firefox, or Edge release.</p><div class="button-row"><a href="/" data-route class="button button-primary">Review the homepage</a><a href="/" data-route class="button">Return home</a></div><p class="caption">Local system-state preview · no redirect, cookie, record, or production request occurred.</p></div></section>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
