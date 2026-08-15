import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Birthday Party Bingo — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">🎂 Party</span>
  <h1>Birthday Party Bingo</h1>
  <p>Cake, candles, and party moments for kids and grown-ups alike. Free for up to 30 cards, ready in about a minute.</p>
  <div class="mt-24">
    <a class="btn" href="05-playful-confetti-create.html?starter=birthday">Make birthday party cards</a>
    <a class="btn btn-white" href="05-playful-confetti-play.html?game=birthday" style="margin-left:8px;">Preview a card</a>
  </div>
</header>

<div class="section section-tight">
  <div class="split">
    <div class="card center">
      <div class="mini mini-words" style="max-width:280px; margin:0 auto;"><i>Streamers</i><i>Birthday card</i><i>Karaoke</i><i>Decor</i><i>Pinata</i><i>Toast</i><i>Goodie bag</i><i>Laugh</i><i>Guest</i><i>Balloon</i><i>Games</i><i>Party hat</i><i class="free-cell">FREE</i><i>Memory lane</i><i>Make a wish</i><i>Prize</i><i>Dance</i><i>Sweet treat</i><i>Music</i><i>Favorite song</i><i>Candles</i><i>Selfie</i><i>Birthday song</i><i>Three cheers</i><i>Gift</i></div>
      <p class="mt-16"><strong style="color:var(--ink);">Birthday Party Bingo</strong> · confetti pop theme · 5×5</p>
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
    <span class="pill pill-pink">Cake</span>
    <span class="pill pill-teal">Balloon</span>
    <span class="pill pill-yellow">Gift</span>
    <span class="pill pill-purple">Dance</span>
    <span class="pill pill-pink">Photo</span>
    <span class="pill pill-teal">Music</span>
    <span class="pill pill-yellow">Games</span>
    <span class="pill pill-purple">Candles</span>
    <span class="pill pill-pink">Toast</span>
    <span class="pill pill-teal">Party hat</span>
    <span class="pill pill-yellow">Confetti</span>
    <span class="pill pill-purple">Prize</span>
    <span class="pill pill-pink">Snack</span>
    <span class="pill pill-teal">Cheer</span>
    <span class="pill pill-yellow">Selfie</span>
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
      <div style="font-size:30px; margin-bottom:8px;">🎓</div>
      <h3>Graduation Bingo</h3>
      <p>Caps, gowns, and proud-parent moments for the big day.</p>
      <a class="btn btn-sm btn-teal mt-16" href="/graduation-bingo">See Graduation</a>
    </div>
  </div>
</div>

<div class="cta-band">
  <h2>Game coming up?</h2>
  <p>Free for up to 30 cards — no account needed to print.</p>
  <a class="btn btn-yellow" href="05-playful-confetti-create.html?starter=birthday">Make birthday party cards</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
