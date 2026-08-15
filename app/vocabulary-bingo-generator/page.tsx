import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Vocabulary Bingo — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">📚 Classroom</span>
  <h1>Vocabulary Bingo</h1>
  <p>Paste your word list — perfect for review games and ESL practice. Free for up to 30 cards, ready in about a minute.</p>
  <div class="mt-24">
    <a class="btn" href="05-playful-confetti-create.html?starter=vocabulary">Make vocabulary cards</a>
    <a class="btn btn-white" href="05-playful-confetti-play.html?game=vocabulary" style="margin-left:8px;">Preview a card</a>
  </div>
</header>

<div class="section section-tight">
  <div class="split">
    <div class="card center">
      <div class="mini mini-words" style="max-width:280px; margin:0 auto;"><i>Nucleus</i><i>Mineral</i><i>Atom</i><i>Alloy</i><i>Prefix</i><i>Magnet</i><i>Habitat</i><i>Cylinder</i><i>Vapor</i><i>Prism</i><i>Orbit</i><i>Larva</i><i class="free-cell">FREE</i><i>Ecosystem</i><i>Metaphor</i><i>Vertex</i><i>Photosynthesis</i><i>Democracy</i><i>Fraction</i><i>Verb</i><i>Gravity</i><i>Compound</i><i>Formula</i><i>Cell</i><i>Density</i></div>
      <p class="mt-16"><strong style="color:var(--ink);">Vocabulary Bingo</strong> · grape glow theme · 5×5</p>
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
    <span class="pill pill-pink">Habitat</span>
    <span class="pill pill-teal">Ecosystem</span>
    <span class="pill pill-yellow">Photosynthesis</span>
    <span class="pill pill-purple">Molecule</span>
    <span class="pill pill-pink">Fraction</span>
    <span class="pill pill-teal">Metaphor</span>
    <span class="pill pill-yellow">Gravity</span>
    <span class="pill pill-purple">Equator</span>
    <span class="pill pill-pink">Democracy</span>
    <span class="pill pill-teal">Cylinder</span>
    <span class="pill pill-yellow">Verb</span>
    <span class="pill pill-purple">Compound</span>
    <span class="pill pill-pink">Summit</span>
    <span class="pill pill-teal">Tide</span>
    <span class="pill pill-yellow">Novel</span>
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
      <div style="font-size:30px; margin-bottom:8px;">✏️</div>
      <h3>Classroom Bingo</h3>
      <p>Review games and reading practice that feel like recess.</p>
      <a class="btn btn-sm btn-teal mt-16" href="/classroom-bingo">See Classroom</a>
    </div>
  </div>
</div>

<div class="cta-band">
  <h2>Game coming up?</h2>
  <p>Free for up to 30 cards — no account needed to print.</p>
  <a class="btn btn-yellow" href="05-playful-confetti-create.html?starter=vocabulary">Make vocabulary cards</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
