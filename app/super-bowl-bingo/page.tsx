import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Super Bowl Bingo — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">🏈 Watch party</span>
  <h1>Super Bowl Bingo</h1>
  <p>Commercials, plays, and halftime moments for the big game. Free for up to 30 cards, ready in about a minute.</p>
  <div class="mt-24">
    <a class="btn" href="05-playful-confetti-create.html?starter=super-bowl">Make super bowl cards</a>
    <a class="btn btn-white" href="05-playful-confetti-play.html?game=super-bowl" style="margin-left:8px;">Preview a card</a>
  </div>
</header>

<div class="section section-tight">
  <div class="split">
    <div class="card center">
      <div class="mini mini-words" style="max-width:280px; margin:0 auto;"><i>Kickoff</i><i>Face paint</i><i>Fantasy pick</i><i>Game ball</i><i>Victory lap</i><i>Two-minute warning</i><i>Instant replay</i><i>Sack</i><i>Lucky socks</i><i>Interception</i><i>Big screen</i><i>Trophy</i><i class="free-cell">FREE</i><i>Championship ring</i><i>Touchdown dance</i><i>Crowd chant</i><i>Penalty flag</i><i>Upset alert</i><i>Confetti</i><i>Field goal</i><i>Jersey swap</i><i>Sideline interview</i><i>Fumble</i><i>Post-game show</i><i>Coin toss</i></div>
      <p class="mt-16"><strong style="color:var(--ink);">Super Bowl Bingo</strong> · sunshine theme · 5×5</p>
    </div>
    <div>
      <h2 style="font-size:clamp(22px,4vw,28px); margin-bottom:12px;">How it plays</h2>
      <ul class="check-list">
        <li>Print one card per guest, or share a link to everyone’s phone</li>
        <li>Every card is a different shuffle of the same themed list</li>
        <li>Mark squares as moments happen — five in a row wins</li>
        <li>Small prize optional but recommended</li>
      </ul>
      <p class="mt-16" style="font-weight:600; color:var(--mut); font-size:14px;">The built-in list has 39 themed items baked in, so every card is unique.</p>
    </div>
  </div>
</div>

<div class="section section-tight">
  <div class="sec-head">
    <span class="k">Word ideas</span>
    <h2>A sample of the built-in list</h2>
    <p>Open the generator and the full list loads automatically — edit freely.</p>
  </div>
  <div class="chip-row">
    <span class="pill pill-pink">Touchdown dance</span>
    <span class="pill pill-teal">Instant replay</span>
    <span class="pill pill-yellow">Halftime show</span>
    <span class="pill pill-purple">Jersey swap</span>
    <span class="pill pill-pink">Mascot</span>
    <span class="pill pill-teal">Face paint</span>
    <span class="pill pill-yellow">Foam finger</span>
    <span class="pill pill-purple">Tailgate</span>
    <span class="pill pill-pink">Snack stadium</span>
    <span class="pill pill-teal">Coach challenge</span>
    <span class="pill pill-yellow">Fourth quarter</span>
    <span class="pill pill-purple">Overtime</span>
    <span class="pill pill-pink">Big screen</span>
    <span class="pill pill-teal">The wave</span>
    <span class="pill pill-yellow">Crowd chant</span>
    <span class="pill pill-purple">+ more</span>
  </div>
</div>

<div class="section section-tight">
  <div class="sec-head">
    <span class="k">Keep exploring</span>
    <h2>Related games</h2>
  </div>
  <div class="grid-3">
    <div class="card card-hover center">
      <div style="font-size:30px; margin-bottom:8px;">🏆</div>
      <h3>Award Show Bingo</h3>
      <p>Speeches, surprises, and red-carpet moments for Oscars night.</p>
      <a class="btn btn-sm btn-teal mt-16" href="/bingo-games">See Award Show</a>
    </div>
  </div>
</div>

<div class="cta-band">
  <h2>Game coming up?</h2>
  <p>Free for up to 30 cards — no account needed to print.</p>
  <a class="btn btn-yellow" href="05-playful-confetti-create.html?starter=super-bowl">Make super bowl cards</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
