import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Bingo supplies",
};

export default function SuppliesPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail article-layout">
          <article class="article-body">
            <nav class="breadcrumbs" aria-label="Breadcrumbs"><a href="/" data-route class="">Home</a><span aria-hidden="true">/</span><span>Bingo supplies</span></nav>
            <span class="eyebrow">Printable game resources</span>
            <h1 tabindex="-1">Bingo supplies</h1>
            <p class="muted">A practical checklist for cards, markers, calling tools, accessibility, prizes, and cleanup.</p>
            <h2>What to have ready</h2>
            <p>Choose cards, markers, a visible calling list, and a simple way to verify the winning pattern. Keep materials close to the people who will use them.</p>
            <h2>Print for real use</h2>
            <p>Use comfortable cell sizes and check the longest square before generating a batch. A sample print catches clipping earlier than the event.</p>
            <h2>Keep the rules visible</h2>
            <p>Put the winning pattern and any special rules beside the cards. Players should not need to search an invitation for basic game instructions.</p>
            <div class="button-row"><a href="/create" data-route class="button button-primary">Make a card</a><a href="/game" data-route class="button">Explore online play</a></div>
          </article>
          <aside class="card-soft article-aside"><span class="template-emoji" aria-hidden="true">🖨️</span><h2>Supply checklist</h2><ul class="check-list"><li>One card per player</li><li>Easy-to-use markers</li><li>Visible instructions</li><li>A way to verify a win</li></ul></aside>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
