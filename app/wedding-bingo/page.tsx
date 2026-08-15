import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Award Show Bingo — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">🏆 Watch party</span>
  <h1>Award Show Bingo</h1>
  <p>Speeches, surprises, and red-carpet moments for Oscars night. Free for up to 30 cards, ready in about a minute.</p>
  <div class="mt-24">
    <a class="btn" href="05-playful-confetti-create.html?starter=award-show">Make award show cards</a>
    <a class="btn btn-white" href="05-playful-confetti-play.html?game=award-show" style="margin-left:8px;">Preview a card</a>
  </div>
</header>

<div class="section section-tight">
  <div class="split">
    <div class="card center">
      <div class="mini mini-words" style="max-width:280px; margin:0 auto;"><i>Presenter banter</i><i>Crying winner</i><i>Meme moment</i><i>Designer shout-out</i><i>Forgot a thank-you</i><i>Selfie</i><i>Speech cutoff</i><i>Speech notes</i><i>Champagne</i><i>Technical glitch</i><i>Wardrobe change</i><i>Long speech</i><i class="free-cell">FREE</i><i>Red carpet</i><i>Tears of joy</i><i>Sequel announced</i><i>Ballot</i><i>Tribute reel</i><i>Winner walk</i><i>Upset win</i><i>Best dressed</i><i>Winner absent</i><i>Backstage shot</i><i>Surprise win</i><i>Statuette</i></div>
      <p class="mt-16"><strong style="color:var(--ink);">Award Show Bingo</strong> · grape glow theme · 5×5</p>
    </div>
    <div>
      <h2 style="font-size:clamp(22px,4vw,28px); margin-bottom:12px;">How it plays</h2>
      <ul class="check-list">
        <li>Print one card per guest, or share a link to everyone’s phone</li>
        <li>Every card is a different shuffle of the same themed list</li>
        <li>Mark squares as moments happen — five in a row wins</li>
        <li>Small prize optional but recommended</li>
      </ul>
      <p class="mt-16" style="font-weight:600; color:var(--mut); font-size:14px;">The built-in list has 40 themed items baked in, so every card is unique.</p>
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
    <span class="pill pill-pink">Standing ovation</span>
    <span class="pill pill-teal">Speech cutoff</span>
    <span class="pill pill-yellow">Forgot a thank-you</span>
    <span class="pill pill-purple">Red carpet</span>
    <span class="pill pill-pink">Wardrobe change</span>
    <span class="pill pill-teal">Surprise win</span>
    <span class="pill pill-yellow">Crying winner</span>
    <span class="pill pill-purple">Host monologue</span>
    <span class="pill pill-pink">Musical number</span>
    <span class="pill pill-teal">Tribute reel</span>
    <span class="pill pill-yellow">Awkward interview</span>
    <span class="pill pill-purple">Envelope moment</span>
    <span class="pill pill-pink">Selfie</span>
    <span class="pill pill-teal">After party</span>
    <span class="pill pill-yellow">Designer shout-out</span>
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
      <div style="font-size:30px; margin-bottom:8px;">🏈</div>
      <h3>Super Bowl Bingo</h3>
      <p>Commercials, plays, and halftime moments for the big game.</p>
      <a class="btn btn-sm btn-teal mt-16" href="/super-bowl-bingo">See Super Bowl</a>
    </div>
  </div>
</div>

<div class="cta-band">
  <h2>Game coming up?</h2>
  <p>Free for up to 30 cards — no account needed to print.</p>
  <a class="btn btn-yellow" href="05-playful-confetti-create.html?starter=award-show">Make award show cards</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
