import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "How to Play Bingo — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">How to play</span>
  <h1>Bingo rules in two minutes flat</h1>
  <p>New to calling a game, or hosting for the first time? Here's everything you need — no rulebook required.</p>
</header>

<div class="section section-tight">
  <div class="sec-head">
    <span class="k">The basics</span>
    <h2>How a round works</h2>
  </div>
  <div class="grid-3">
    <div class="card">
      <span class="num num-pink">1</span>
      <h3 class="mt-16">Hand out the cards</h3>
      <p>Every player gets a unique card — a 5×5 grid of words, pictures, or numbers. The center square is a free space that counts as already marked.</p>
    </div>
    <div class="card">
      <span class="num num-teal">2</span>
      <h3 class="mt-16">Call the items</h3>
      <p>The caller announces items one at a time — drawn at random or read from a list. Players mark any matching square on their card.</p>
    </div>
    <div class="card">
      <span class="num num-purple">3</span>
      <h3 class="mt-16">Shout "Bingo!"</h3>
      <p>First player to mark five in a row — across, down, or diagonal — wins the round. Check their card, celebrate, then deal fresh cards and go again.</p>
    </div>
  </div>
</div>

<div class="band band-yellow"><div class="band-in">
  <div class="split">
    <div>
      <h2 style="font-size:clamp(23px,4vw,30px); margin-bottom:12px;">Winning patterns to mix it up</h2>
      <p style="font-weight:700; color:#5c4a00; margin-bottom:18px;">A straight line is the classic, but switching the target pattern keeps a long game night interesting.</p>
      <ul class="check-list">
        <li style="color:#5c4a00;"><strong style="color:var(--ink);">Line</strong> — five across, down, or diagonal</li>
        <li style="color:#5c4a00;"><strong style="color:var(--ink);">Four corners</strong> — just the corner squares</li>
        <li style="color:#5c4a00;"><strong style="color:var(--ink);">Blackout</strong> — cover the whole card (long game)</li>
        <li style="color:#5c4a00;"><strong style="color:var(--ink);">Shapes</strong> — letters like X, T, or L for themed rounds</li>
      </ul>
    </div>
    <div class="card center">
      <div class="mini mini-words" style="max-width:260px; margin:0 auto;">
        <i style="background:var(--pink); color:#fff;">B</i><i>4</i><i>12</i><i>8</i><i style="background:var(--pink); color:#fff;">B</i>
        <i>7</i><i style="background:var(--pink); color:#fff;">✓</i><i>3</i><i style="background:var(--pink); color:#fff;">✓</i><i>9</i>
        <i>15</i><i>2</i><i class="free-cell">FREE</i><i>6</i><i>11</i>
        <i>1</i><i style="background:var(--pink); color:#fff;">✓</i><i>10</i><i style="background:var(--pink); color:#fff;">✓</i><i>5</i>
        <i style="background:var(--pink); color:#fff;">B</i><i>14</i><i>13</i><i>9</i><i style="background:var(--pink); color:#fff;">B</i>
      </div>
      <p class="mt-16"><strong style="color:var(--ink);">Four corners</strong> + two diagonals forming an X</p>
    </div>
  </div>
</div></div>

<div class="section">
  <div class="sec-head">
    <span class="k">Hosting tips</span>
    <h2>Run a game people remember</h2>
  </div>
  <div class="grid-2">
    <div class="card">
      <h3>🎉 For parties & showers</h3>
      <ul class="check-list mt-16">
        <li>Use words from the event — gifts, guests, inside jokes</li>
        <li>Small prizes per round keep energy high</li>
        <li>Print extras; someone always brings a plus-one</li>
      </ul>
    </div>
    <div class="card">
      <h3>✏️ For classrooms</h3>
      <ul class="check-list mt-16">
        <li>Vocabulary, math facts, or sight words work great</li>
        <li>Play blackout for a full-lesson review game</li>
        <li>Let winners call the next round — instant engagement</li>
      </ul>
    </div>
    <div class="card">
      <h3>💻 For virtual games</h3>
      <ul class="check-list mt-16">
        <li>Share one link — players open their own card on any phone</li>
        <li>No printing, no passing papers around</li>
        <li>Works over any video call or livestream chat</li>
      </ul>
    </div>
    <div class="card">
      <h3>🏢 For team events</h3>
      <ul class="check-list mt-16">
        <li>Icebreaker squares like "has a pet" or "worked abroad"</li>
        <li>30 cards is free — plenty for most teams</li>
        <li>Human bingo gets people talking, not just marking</li>
      </ul>
    </div>
  </div>
</div>

<div class="section section-tight">
  <div class="sec-head">
    <span class="k">Common questions</span>
    <h2>Quick answers</h2>
  </div>
  <div class="faq" style="max-width:720px; margin:0 auto;">
    <details>
      <summary>How many people can play at once?</summary>
      <p>As many as you have cards for. The free tier covers 30 unique cards per batch — enough for a classroom or party. Paid plans go to 500+ for big events.</p>
    </details>
    <details>
      <summary>Can I play with words instead of numbers?</summary>
      <p>Yes — that's our specialty. Type or paste your own words, pick from a themed template, or mix both. Every card gets a shuffled, unique layout.</p>
    </details>
    <details>
      <summary>Do players need an account?</summary>
      <p>No. Only the host needs an account to create and share a game. Players just open the link and play.</p>
    </details>
    <details>
      <summary>What do I need to call a game?</summary>
      <p>Anything random works: our built-in caller, slips of paper in a hat, or a random number app. The caller page tracks what's been called so players can catch up.</p>
    </details>
  </div>
</div>

<div class="cta-band">
  <h2>Ready to call your first round?</h2>
  <p>Make a custom card in under a minute — free for up to 30 cards.</p>
  <a class="btn btn-yellow" href="/create">Make a card now</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
