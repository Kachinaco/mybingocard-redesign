import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "About — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">About</span>
  <h1>Built for the moments <span class="squiggle">between</span> the party games</h1>
  <p>MyBingoCard started with a simple observation: every great gathering has a game, and bingo is the one game literally everyone already knows how to play.</p>
</header>

<div class="section section-tight">
  <div class="split">
    <div>
      <h2 style="font-size:clamp(20px,3.5vw,26px);margin-bottom:12px;">Why bingo?</h2>
      <p style="color:var(--mut);font-weight:600;font-size:clamp(13.5px,2vw,15px);margin-bottom:14px;">Grandma can play. Your five-year-old can play. The coworker who "doesn't do games" can play. Bingo needs zero explanation — which makes it the perfect icebreaker for baby showers, classrooms, team events, and holiday parties.</p>
      <p style="color:var(--mut);font-weight:600;font-size:clamp(13.5px,2vw,15px);">What it did need was a way to make cards that match <em>your</em> event, without fighting a design tool or paying for a box of generic cards. So we built exactly that: type your words, shuffle, print or share. Done.</p>
    </div>
    <div class="card center" style="transform:rotate(1.5deg);">
      <div class="mini" style="max-width:280px;margin:0 auto 14px;">
        <i style="background:#ffd9e6"></i><i style="background:#fff0c7"></i><i style="background:#cdeee9"></i><i style="background:#e9e4ff"></i><i style="background:#ffe6d4"></i>
        <i style="background:#fff0c7"></i><i style="background:#cdeee9"></i><i style="background:#e9e4ff"></i><i style="background:#ffe6d4"></i><i style="background:#ffd9e6"></i>
        <i style="background:#cdeee9"></i><i style="background:#e9e4ff"></i><i class="free-cell"></i><i style="background:#ffd9e6"></i><i style="background:#fff0c7"></i>
        <i style="background:#e9e4ff"></i><i style="background:#ffe6d4"></i><i style="background:#ffd9e6"></i><i style="background:#fff0c7"></i><i style="background:#cdeee9"></i>
        <i style="background:#ffe6d4"></i><i style="background:#ffd9e6"></i><i style="background:#fff0c7"></i><i style="background:#cdeee9"></i><i style="background:#e9e4ff"></i>
      </div>
      <p style="font-size:13px;">The card that started it all — a baby shower board made in 2019.</p>
    </div>
  </div>

  <div class="stat-grid mt-24">
    <div class="stat center"><div class="big" style="color:var(--pink);">1.2M+</div><div class="lbl">cards created</div></div>
    <div class="stat center"><div class="big" style="color:var(--teal);">84k</div><div class="lbl">games hosted</div></div>
    <div class="stat center"><div class="big" style="color:var(--purple);">190+</div><div class="lbl">countries playing</div></div>
    <div class="stat center"><div class="big" style="color:var(--orange);">4.9★</div><div class="lbl">average rating</div></div>
  </div>

  <div class="mt-24">
    <div class="sec-head"><span class="k">Values</span><h2>What we optimize for</h2></div>
    <div class="grid-3">
      <div class="card"><h3>Fast over fancy</h3><p>You should go from idea to printed cards faster than it takes to preheat the oven for party snacks.</p></div>
      <div class="card"><h3>Everyone can play</h3><p>No accounts for guests, no app downloads, no instructions needed. If they can tap a square, they're in.</p></div>
      <div class="card"><h3>Free means free</h3><p>Making and printing cards costs nothing. Paid plans only unlock hosting bigger games and pro extras.</p></div>
    </div>
  </div>

  <div class="card mt-24 center" style="background:#cdeee9;">
    <h3>Made by people who throw too many parties</h3>
    <p style="max-width:520px;margin:0 auto;">We're a small team that has personally hosted more baby showers, classroom game days, and office holiday parties than we can count. Every feature exists because one of us needed it at a real event.</p>
    <a class="btn mt-16" href="/contact">Say hello</a>
  </div>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
