import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "About MyBingoCard",
};

export default function AboutPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail">
          <div class="article-layout">
            <article class="article-body">
              <span class="eyebrow">About the product</span>
              <h1>About MyBingoCard</h1>
              <p class="muted">The product mission, publishing practices, and ways to report a question or correction.</p>
              <h2>Built around the moment people actually share</h2>
              <p>MyBingoCard starts with a simple idea: making a card should feel almost as easy as playing one. The redesign keeps the playful character, then brings the account, sharing, export, and live-game tools into the same visual system.</p>
              <h2>Friendly does not mean vague</h2>
              <p>Every important action says what happens next. Private and public states are visible, and paid choices are explained before checkout.</p>
              <h2>Questions and corrections are welcome</h2>
              <p>The support and trust pages use the same plain language as the product. If something is unclear, the Contact screen offers a direct route forward.</p>
              <div class="button-row"><a href="/contact" data-route class="button button-primary">Contact MyBingoCard</a><a href="/features" data-route class="button">Explore features</a></div>
            </article>
            <aside class="card-soft article-aside">
              <span class="eyebrow">One shared system</span>
              <p>Public pages, authentication, the card workspace, sharing, live games, billing states, and administration use one shared system.</p>
            </aside>
          </div>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
