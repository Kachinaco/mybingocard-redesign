import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Classroom Bingo — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">✏️ Classroom</span>
  <h1>Classroom Bingo</h1>
  <p>Review games and reading practice that feel like recess. Free for up to 30 cards, ready in about a minute.</p>
  <div class="mt-24">
    <a class="btn" href="05-playful-confetti-create.html?starter=classroom">Make classroom cards</a>
    <a class="btn btn-white" href="05-playful-confetti-play.html?game=classroom" style="margin-left:8px;">Preview a card</a>
  </div>
</header>

<div class="section section-tight">
  <div class="split">
    <div class="card center">
      <div class="mini mini-words" style="max-width:280px; margin:0 auto;"><i>Science fair</i><i>Show and tell</i><i>Group project</i><i>Star student</i><i>Take turns</i><i>Homework pass</i><i>Be curious</i><i>Class pet</i><i>Ask a question</i><i>Try again</i><i>Clean up</i><i>Raise your hand</i><i class="free-cell">FREE</i><i>Help a friend</i><i>Great idea</i><i>Recess bell</i><i>Count it</i><i>New word</i><i>Show your work</i><i>Book time</i><i>Spell it</i><i>Quiet voice</i><i>Solve it</i><i>Story corner</i><i>Library card</i></div>
      <p class="mt-16"><strong style="color:var(--ink);">Classroom Bingo</strong> · grape glow theme · 5×5</p>
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
    <span class="pill pill-pink">Raise your hand</span>
    <span class="pill pill-teal">Read aloud</span>
    <span class="pill pill-yellow">New word</span>
    <span class="pill pill-purple">Ask a question</span>
    <span class="pill pill-pink">Help a friend</span>
    <span class="pill pill-teal">Pencil ready</span>
    <span class="pill pill-yellow">Solve it</span>
    <span class="pill pill-purple">Great idea</span>
    <span class="pill pill-pink">Take turns</span>
    <span class="pill pill-teal">Listen closely</span>
    <span class="pill pill-yellow">Share an answer</span>
    <span class="pill pill-purple">Try again</span>
    <span class="pill pill-pink">Teamwork</span>
    <span class="pill pill-teal">Book time</span>
    <span class="pill pill-yellow">Quiet voice</span>
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
      <div style="font-size:30px; margin-bottom:8px;">📚</div>
      <h3>Vocabulary Bingo</h3>
      <p>Paste your word list — perfect for review games and ESL practice.</p>
      <a class="btn btn-sm btn-teal mt-16" href="/vocabulary-bingo-generator">See Vocabulary</a>
    </div>
  </div>
</div>

<div class="cta-band">
  <h2>Game coming up?</h2>
  <p>Free for up to 30 cards — no account needed to print.</p>
  <a class="btn btn-yellow" href="05-playful-confetti-create.html?starter=classroom">Make classroom cards</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
