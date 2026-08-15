import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Graduation Bingo — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">🎓 Party</span>
  <h1>Graduation Bingo</h1>
  <p>Caps, gowns, and proud-parent moments for the big day. Free for up to 30 cards, ready in about a minute.</p>
  <div class="mt-24">
    <a class="btn" href="05-playful-confetti-create.html?starter=graduation">Make graduation cards</a>
    <a class="btn btn-white" href="05-playful-confetti-play.html?game=graduation" style="margin-left:8px;">Preview a card</a>
  </div>
</header>

<div class="section section-tight">
  <div class="split">
    <div class="card center">
      <div class="mini mini-words" style="max-width:280px; margin:0 auto;"><i>Study group</i><i>Proud parents</i><i>Champagne toast</i><i>Handshake</i><i>Memory wall</i><i>Valedictorian</i><i>Confetti</i><i>Selfie</i><i>College plans</i><i>Balloon arch</i><i>Honor cord</i><i>Gown</i><i class="free-cell">FREE</i><i>Alma mater</i><i>Group hug</i><i>Tears</i><i>Road trip</i><i>Cap toss</i><i>Mascot</i><i>Tassel</i><i>Dorm room</i><i>New chapter</i><i>Diploma</i><i>Advice cards</i><i>Speech</i></div>
      <p class="mt-16"><strong style="color:var(--ink);">Graduation Bingo</strong> · grape glow theme · 5×5</p>
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
    <span class="pill pill-pink">Cap toss</span>
    <span class="pill pill-teal">Gown</span>
    <span class="pill pill-yellow">Diploma</span>
    <span class="pill pill-purple">Tassel</span>
    <span class="pill pill-pink">Valedictorian</span>
    <span class="pill pill-teal">Speech</span>
    <span class="pill pill-yellow">Yearbook</span>
    <span class="pill pill-purple">Photo booth</span>
    <span class="pill pill-pink">Proud parents</span>
    <span class="pill pill-teal">Class song</span>
    <span class="pill pill-yellow">Honor cord</span>
    <span class="pill pill-purple">Tears</span>
    <span class="pill pill-pink">Applause</span>
    <span class="pill pill-teal">Processional</span>
    <span class="pill pill-yellow">Alma mater</span>
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
      <div style="font-size:30px; margin-bottom:8px;">🎂</div>
      <h3>Birthday Party Bingo</h3>
      <p>Cake, candles, and party moments for kids and grown-ups alike.</p>
      <a class="btn btn-sm btn-teal mt-16" href="/birthday-bingo">See Birthday Party</a>
    </div>
  </div>
</div>

<div class="cta-band">
  <h2>Game coming up?</h2>
  <p>Free for up to 30 cards — no account needed to print.</p>
  <a class="btn btn-yellow" href="05-playful-confetti-create.html?starter=graduation">Make graduation cards</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
