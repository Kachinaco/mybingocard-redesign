import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Bridal Shower Bingo — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">💍 Shower</span>
  <h1>Bridal Shower Bingo</h1>
  <p>Vows, toasts, and happy tears — a shower staple that runs itself. Free for up to 30 cards, ready in about a minute.</p>
  <div class="mt-24">
    <a class="btn" href="05-playful-confetti-create.html?starter=bridal-shower">Make bridal shower cards</a>
    <a class="btn btn-white" href="05-playful-confetti-play.html?game=bridal-shower" style="margin-left:8px;">Preview a card</a>
  </div>
</header>

<div class="section section-tight">
  <div class="split">
    <div class="card center">
      <div class="mini mini-words" style="max-width:280px; margin:0 auto;"><i>Sparkler exit</i><i>Signature drink</i><i>Save the date</i><i>Song</i><i>Vows</i><i>Gift</i><i>Something blue</i><i>Love</i><i>Ring</i><i>Music</i><i>Flowers</i><i>Speech</i><i class="free-cell">FREE</i><i>Selfie</i><i>Centerpiece</i><i>Cake</i><i>Kiss</i><i>Photo</i><i>Bow</i><i>Groom</i><i>Cheers</i><i>Bridal party</i><i>Veil</i><i>Party</i><i>Dress</i></div>
      <p class="mt-16"><strong style="color:var(--ink);">Bridal Shower Bingo</strong> · confetti pop theme · 5×5</p>
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
    <span class="pill pill-pink">Ring</span>
    <span class="pill pill-teal">Vows</span>
    <span class="pill pill-yellow">Cake</span>
    <span class="pill pill-purple">Dance</span>
    <span class="pill pill-pink">Toast</span>
    <span class="pill pill-teal">Bride</span>
    <span class="pill pill-yellow">Groom</span>
    <span class="pill pill-purple">Kiss</span>
    <span class="pill pill-pink">Dress</span>
    <span class="pill pill-teal">Photo</span>
    <span class="pill pill-yellow">Flowers</span>
    <span class="pill pill-purple">Music</span>
    <span class="pill pill-pink">Happy tears</span>
    <span class="pill pill-teal">Cheers</span>
    <span class="pill pill-yellow">Guest book</span>
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
      <div style="font-size:30px; margin-bottom:8px;">👶</div>
      <h3>Gender Reveal Bingo</h3>
      <p>Team pink vs. team blue — the big reveal, square by square.</p>
      <a class="btn btn-sm btn-teal mt-16" href="/baby-prediction-bingo">See Gender Reveal</a>
    </div>
  </div>
</div>

<div class="cta-band">
  <h2>Game coming up?</h2>
  <p>Free for up to 30 cards — no account needed to print.</p>
  <a class="btn btn-yellow" href="05-playful-confetti-create.html?starter=bridal-shower">Make bridal shower cards</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
