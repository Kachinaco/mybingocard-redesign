import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Baby Shower Bingo — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">🍼 Occasion</span>
  <h1>Baby Shower Bingo</h1>
  <p>The gift-opening game that keeps every guest watching. Free for up to 30 cards, ready in about a minute.</p>
  <div class="mt-24">
    <a class="btn" href="/create">Make baby shower cards</a>
    <a class="btn btn-white" href="05-playful-confetti-play.html?game=baby-shower" style="margin-left:8px;">Preview a card</a>
  </div>
</header>

<div class="section section-tight">
  <div class="split">
    <div class="card center">
      <div class="mini mini-words" style="max-width:280px; margin:0 auto;">
        <i>Diapers</i><i>Onesie</i><i>Bottle</i><i>Blanket</i><i>Pacifier</i>
        <i>Stroller</i><i>Bib</i><i>Rattle</i><i>Booties</i><i>Monitor</i>
        <i>Books</i><i>Lotion</i><i class="free-cell">FREE</i><i>Mobile</i><i>Wipes</i>
        <i>Bath set</i><i>Teether</i><i>Socks</i><i>Carrier</i><i>Swing</i>
        <i>High chair</i><i>Bunting</i><i>Toys</i><i>Sleep sack</i><i>Crib sheet</i>
      </div>
      <p class="mt-16"><strong style="color:var(--ink);">Baby Shower Bingo</strong> · pastel theme · 5×5</p>
    </div>
    <div>
      <h2 style="font-size:clamp(22px,4vw,28px); margin-bottom:12px;">How it works at the shower</h2>
      <ul class="check-list">
        <li>Print one card per guest, or share a link to everyone's phone</li>
        <li>Guests fill squares with gifts they think the parents-to-be will open</li>
        <li>As each gift is unwrapped, players mark matching squares</li>
        <li>First to five in a row wins — small prize optional but recommended</li>
      </ul>
      <p class="mt-16" style="font-weight:600; color:var(--mut); font-size:14px;">Our word list has 40+ shower-ready items baked in, so every card is unique and no two guests mark the same board.</p>
    </div>
  </div>
</div>

<div class="band band-teal"><div class="band-in">
  <div class="sec-head" style="margin-bottom:clamp(18px,3vw,26px);">
    <h2 style="color:#fff;">Make it yours in three steps</h2>
  </div>
  <div class="grid-3">
    <div class="card">
      <span class="num num-pink">1</span>
      <h3 class="mt-16">Pick the theme</h3>
      <p>Pastel pink, blue, sage, or neutral — or set custom colors to match the shower decor.</p>
    </div>
    <div class="card">
      <span class="num num-yellow">2</span>
      <h3 class="mt-16">Edit the words</h3>
      <p>Keep our list, swap in the registry items, or add inside jokes and the baby's name.</p>
    </div>
    <div class="card">
      <span class="num num-purple">3</span>
      <h3 class="mt-16">Print or share</h3>
      <p>Download a print-ready PDF, or text one link so guests play on their phones.</p>
    </div>
  </div>
</div></div>

<div class="section">
  <div class="sec-head">
    <span class="k">Word ideas</span>
    <h2>A sample of the built-in list</h2>
    <p>Tap any generator and the full list loads automatically — edit freely.</p>
  </div>
  <div class="chip-row">
    <span class="pill pill-pink">Diapers</span>
    <span class="pill pill-teal">Onesie</span>
    <span class="pill pill-yellow">Bottle</span>
    <span class="pill pill-purple">Blanket</span>
    <span class="pill pill-pink">Pacifier</span>
    <span class="pill pill-teal">Stroller</span>
    <span class="pill pill-yellow">Bib</span>
    <span class="pill pill-purple">Rattle</span>
    <span class="pill pill-pink">Booties</span>
    <span class="pill pill-teal">Monitor</span>
    <span class="pill pill-yellow">Books</span>
    <span class="pill pill-purple">Wipes</span>
    <span class="pill pill-pink">Teether</span>
    <span class="pill pill-teal">High chair</span>
    <span class="pill pill-yellow">Sleep sack</span>
    <span class="pill pill-purple">+ 25 more</span>
  </div>
</div>

<div class="section section-tight">
  <div class="sec-head">
    <span class="k">More showers & parties</span>
    <h2>Related games</h2>
  </div>
  <div class="grid-3">
    <div class="card card-hover center">
      <div style="font-size:30px; margin-bottom:8px;">💍</div>
      <h3>Bridal Shower Bingo</h3>
      <p>The wedding-version classic.</p>
      <a class="btn btn-sm btn-teal mt-16" href="/bridal-shower-bingo">See bridal shower</a>
    </div>
    <div class="card card-hover center">
      <div style="font-size:30px; margin-bottom:8px;">🎂</div>
      <h3>Birthday Party Bingo</h3>
      <p>Cake, candles, and chaos.</p>
      <a class="btn btn-sm btn-teal mt-16" href="/birthday-bingo">See birthday</a>
    </div>
    <div class="card card-hover center">
      <div style="font-size:30px; margin-bottom:8px;">👶</div>
      <h3>Gender Reveal Bingo</h3>
      <p>Team pink vs. team blue.</p>
      <a class="btn btn-sm btn-teal mt-16" href="/baby-prediction-bingo">See gender reveal</a>
    </div>
  </div>
</div>

<div class="cta-band">
  <h2>Shower coming up?</h2>
  <p>Free for up to 30 cards — no account needed to print.</p>
  <a class="btn btn-yellow" href="/create">Make baby shower cards</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
