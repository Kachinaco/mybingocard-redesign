import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "How to play bingo",
};

export default function How_to_play_bingoPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail article-layout">
          <article class="article-body">
            <nav class="breadcrumbs" aria-label="Breadcrumbs"><a href="/" data-route class="">Home</a><span aria-hidden="true">/</span><span>How to play bingo</span></nav>
            <span class="eyebrow">A quick guide for every player</span>
            <h1 tabindex="-1">How to play bingo</h1>
            <p class="muted">Core bingo rules, setup, calling, marking, and winner-verification guidance.</p>
            <h2>Before the game</h2>
            <p>Give each player a card and explain the winning pattern. Decide whether the center is free and whether more than one person can win.</p>
            <h2>During the game</h2>
            <p>Mark a square when the host calls it or when the event prompt happens. Keep marks visible and use Undo if a square was selected by mistake.</p>
            <h2>When someone has BINGO</h2>
            <p>Pause the game, check the marked line, and celebrate. In a hosted room, the host can verify the claimed card before ending or continuing.</p>
            <div class="button-row"><a href="/create" data-route class="button button-primary">Make a card</a><a href="/game" data-route class="button">Explore online play</a></div>
          </article>
          <aside class="card-soft article-aside"><span class="template-emoji" aria-hidden="true">🎉</span><h2>Winning pattern</h2><ul class="check-list"><li>One card per player</li><li>Easy-to-use markers</li><li>Visible instructions</li><li>A way to verify a win</li></ul></aside>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
