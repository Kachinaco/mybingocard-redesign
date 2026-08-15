import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Team Building Bingo — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">👋 Work</span>
  <h1>Team Building Bingo</h1>
  <p>Human-bingo icebreakers that get coworkers actually talking. Free for up to 30 cards, ready in about a minute.</p>
  <div class="mt-24">
    <a class="btn" href="05-playful-confetti-create.html?starter=team-building">Make team building cards</a>
    <a class="btn btn-white" href="05-playful-confetti-play.html?game=team-building" style="margin-left:8px;">Preview a card</a>
  </div>
</header>

<div class="section section-tight">
  <div class="split">
    <div class="card center">
      <div class="mini mini-words" style="max-width:280px; margin:0 auto;"><i>Thank-you shout-out</i><i>Demo day</i><i>Town hall</i><i>Morning person</i><i>Icebreaker</i><i>Ping pong</i><i>Coffee run</i><i>Slack thread</i><i>Plays an instrument</i><i>Shared playlist</i><i>Night owl</i><i>Stand-up meeting</i><i class="free-cell">FREE</i><i>Bakes</i><i>Video call</i><i>Speaks two languages</i><i>Stretch break</i><i>Friday wins</i><i>Standing desk</i><i>Team lunch</i><i>Commutes by bike</i><i>Ran a marathon</i><i>Loves spreadsheets</i><i>Mentor chat</i><i>Office plant</i></div>
      <p class="mt-16"><strong style="color:var(--ink);">Team Building Bingo</strong> · mint party theme · 5×5</p>
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
    <span class="pill pill-pink">Coffee run</span>
    <span class="pill pill-teal">Video call</span>
    <span class="pill pill-yellow">Stand-up meeting</span>
    <span class="pill pill-purple">Team lunch</span>
    <span class="pill pill-pink">Whiteboard session</span>
    <span class="pill pill-teal">Deadline met</span>
    <span class="pill pill-yellow">New hire</span>
    <span class="pill pill-purple">Birthday card</span>
    <span class="pill pill-pink">Ping pong</span>
    <span class="pill pill-teal">Quarterly review</span>
    <span class="pill pill-yellow">Slack thread</span>
    <span class="pill pill-purple">Brainstorm</span>
    <span class="pill pill-pink">Office plant</span>
    <span class="pill pill-teal">Friday wins</span>
    <span class="pill pill-yellow">Stretch break</span>
    <span class="pill pill-purple">+ more</span>
  </div>
</div>



<div class="cta-band">
  <h2>Game coming up?</h2>
  <p>Free for up to 30 cards — no account needed to print.</p>
  <a class="btn btn-yellow" href="05-playful-confetti-create.html?starter=team-building">Make team building cards</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
