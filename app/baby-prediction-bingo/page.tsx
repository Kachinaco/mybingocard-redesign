import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Gender Reveal Bingo — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">👶 Shower</span>
  <h1>Gender Reveal Bingo</h1>
  <p>Team pink vs. team blue — the big reveal, square by square. Free for up to 30 cards, ready in about a minute.</p>
  <div class="mt-24">
    <a class="btn" href="05-playful-confetti-create.html?starter=gender-reveal">Make gender reveal cards</a>
    <a class="btn btn-white" href="05-playful-confetti-play.html?game=gender-reveal" style="margin-left:8px;">Preview a card</a>
  </div>
</header>

<div class="section section-tight">
  <div class="split">
    <div class="card center">
      <div class="mini mini-words" style="max-width:280px; margin:0 auto;"><i>The reveal</i><i>Due date</i><i>Sonogram</i><i>Confetti pop</i><i>Rattle</i><i>Tiny shoes</i><i>Nursery paint</i><i>First outfit</i><i>Happy tears</i><i>Ultrasound photo</i><i>Car seat</i><i>Old wives tale</i><i class="free-cell">FREE</i><i>Baby book</i><i>Smoke cannon</i><i>Balloon box</i><i>Cake reveal</i><i>Cravings</i><i>Keepsake</i><i>Surprise face</i><i>Vote board</i><i>Big sibling</i><i>Group photo</i><i>Team pink</i><i>Countdown</i></div>
      <p class="mt-16"><strong style="color:var(--ink);">Gender Reveal Bingo</strong> · mint party theme · 5×5</p>
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
    <span class="pill pill-pink">Team pink</span>
    <span class="pill pill-teal">Team blue</span>
    <span class="pill pill-yellow">Balloon box</span>
    <span class="pill pill-purple">Confetti pop</span>
    <span class="pill pill-pink">Cake reveal</span>
    <span class="pill pill-teal">Ultrasound photo</span>
    <span class="pill pill-yellow">Old wives tale</span>
    <span class="pill pill-purple">Name guess</span>
    <span class="pill pill-pink">Due date</span>
    <span class="pill pill-teal">Cravings</span>
    <span class="pill pill-yellow">Belly bump</span>
    <span class="pill pill-purple">Big sibling</span>
    <span class="pill pill-pink">Grandma</span>
    <span class="pill pill-teal">Grandpa</span>
    <span class="pill pill-yellow">Smoke cannon</span>
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
      <div style="font-size:30px; margin-bottom:8px;">🍼</div>
      <h3>Baby Shower Bingo</h3>
      <p>The gift-opening game that keeps every guest watching.</p>
      <a class="btn btn-sm btn-teal mt-16" href="/occasion-baby-shower">See Baby Shower</a>
    </div>
    <div class="card card-hover center">
      <div style="font-size:30px; margin-bottom:8px;">💍</div>
      <h3>Bridal Shower Bingo</h3>
      <p>Vows, toasts, and happy tears — a shower staple that runs itself.</p>
      <a class="btn btn-sm btn-teal mt-16" href="/bridal-shower-bingo">See Bridal Shower</a>
    </div>
  </div>
</div>

<div class="cta-band">
  <h2>Game coming up?</h2>
  <p>Free for up to 30 cards — no account needed to print.</p>
  <a class="btn btn-yellow" href="05-playful-confetti-create.html?starter=gender-reveal">Make gender reveal cards</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
