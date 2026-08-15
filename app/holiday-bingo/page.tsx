import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Holiday Bingo — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">🎄 Holiday</span>
  <h1>Holiday Bingo</h1>
  <p>Christmas, Halloween, Easter, and more — seasonal word sets ready to go. Free for up to 30 cards, ready in about a minute.</p>
  <div class="mt-24">
    <a class="btn" href="05-playful-confetti-create.html?starter=holiday">Make holiday cards</a>
    <a class="btn btn-white" href="05-playful-confetti-play.html?game=holiday" style="margin-left:8px;">Preview a card</a>
  </div>
</header>

<div class="section section-tight">
  <div class="split">
    <div class="card center">
      <div class="mini mini-words" style="max-width:280px; margin:0 auto;"><i>Gift exchange</i><i>Valentine card</i><i>Holiday card</i><i>Candy cane</i><i>Fireplace</i><i>Stocking stuffer</i><i>Movie marathon</i><i>Winter walk</i><i>Holiday lights</i><i>Countdown</i><i>Caroling</i><i>Costume</i><i class="free-cell">FREE</i><i>Ornament</i><i>Easter egg</i><i>Pumpkin pie</i><i>Snowman</i><i>Charity drive</i><i>Snowball fight</i><i>New year toast</i><i>Fireworks</i><i>Festive playlist</i><i>Sledding</i><i>Eggnog</i><i>Mistletoe</i></div>
      <p class="mt-16"><strong style="color:var(--ink);">Holiday Bingo</strong> · sunshine theme · 5×5</p>
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
    <span class="pill pill-pink">Ugly sweater</span>
    <span class="pill pill-teal">Hot cocoa</span>
    <span class="pill pill-yellow">Gift exchange</span>
    <span class="pill pill-purple">Caroling</span>
    <span class="pill pill-pink">Stocking stuffer</span>
    <span class="pill pill-teal">Mistletoe</span>
    <span class="pill pill-yellow">Cookie swap</span>
    <span class="pill pill-purple">Snowball fight</span>
    <span class="pill pill-pink">Tree trimming</span>
    <span class="pill pill-teal">Holiday lights</span>
    <span class="pill pill-yellow">Secret Santa</span>
    <span class="pill pill-purple">Eggnog</span>
    <span class="pill pill-pink">Candy cane</span>
    <span class="pill pill-teal">Gingerbread house</span>
    <span class="pill pill-yellow">Winter walk</span>
    <span class="pill pill-purple">+ more</span>
  </div>
</div>



<div class="cta-band">
  <h2>Game coming up?</h2>
  <p>Free for up to 30 cards — no account needed to print.</p>
  <a class="btn btn-yellow" href="05-playful-confetti-create.html?starter=holiday">Make holiday cards</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
