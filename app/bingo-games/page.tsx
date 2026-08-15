import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Bingo Games & Generators — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">Bingo games</span>
  <h1>A generator for every occasion</h1>
  <p>Purpose-built card makers with themed word lists baked in. Pick your game, tweak it, and you're playing in about a minute.</p>
</header>

<div class="section section-tight">
  <div class="chip-row">
    <a class="chip on" href="#" data-filter="all">All games</a>
    <a class="chip" href="#" data-filter="party">🎉 Party</a>
    <a class="chip" href="#" data-filter="classroom">✏️ Classroom</a>
    <a class="chip" href="#" data-filter="watch">📺 Watch party</a>
    <a class="chip" href="#" data-filter="work">🏢 Work</a>
    <a class="chip" href="#" data-filter="classic">🎲 Classic</a>
  </div>

  <div class="grid-3">
    <div class="card card-hover" data-cat="party">
      <div style="font-size:34px; margin-bottom:10px;">🍼</div>
      <h3>Baby Shower Bingo</h3>
      <p>Gift-opening classic. Guests mark off presents as they're unwrapped.</p>
      <div class="mt-16"><span class="pill pill-pink">Party</span> <span class="pill pill-teal">25 words included</span></div>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=baby-shower">Open generator</a>
    </div>
    <div class="card card-hover" data-cat="party">
      <div style="font-size:34px; margin-bottom:10px;">💍</div>
      <h3>Bridal Shower Bingo</h3>
      <p>Vows, toasts, and happy tears — a shower staple that runs itself.</p>
      <div class="mt-16"><span class="pill pill-pink">Party</span> <span class="pill pill-teal">25 words included</span></div>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=bridal-shower">Open generator</a>
    </div>
    <div class="card card-hover" data-cat="party">
      <div style="font-size:34px; margin-bottom:10px;">🎂</div>
      <h3>Birthday Party Bingo</h3>
      <p>Cake, candles, and party moments for kids and grown-ups alike.</p>
      <div class="mt-16"><span class="pill pill-pink">Party</span> <span class="pill pill-teal">25 words included</span></div>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=birthday">Open generator</a>
    </div>
    <div class="card card-hover" data-cat="party">
      <div style="font-size:34px; margin-bottom:10px;">🎄</div>
      <h3>Holiday Bingo</h3>
      <p>Christmas, Halloween, Easter, and more — seasonal word sets ready to go.</p>
      <div class="mt-16"><span class="pill pill-pink">Party</span> <span class="pill pill-purple">8 themes</span></div>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=holiday">Open generator</a>
    </div>
    <div class="card card-hover" data-cat="classroom">
      <div style="font-size:34px; margin-bottom:10px;">📚</div>
      <h3>Vocabulary Bingo</h3>
      <p>Paste your word list — perfect for review games and reading practice.</p>
      <div class="mt-16"><span class="pill pill-yellow">Classroom</span> <span class="pill pill-teal">Your words</span></div>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=vocabulary">Open generator</a>
    </div>
    <div class="card card-hover" data-cat="classic">
      <div style="font-size:34px; margin-bottom:10px;">🔢</div>
      <h3>Number Bingo 1–75</h3>
      <p>The classic B-I-N-G-O column format with a built-in caller.</p>
      <div class="mt-16"><span class="pill pill-green">Classic</span> <span class="pill pill-teal">Caller included</span></div>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=numbers">Open generator</a>
    </div>
    <div class="card card-hover" data-cat="watch">
      <div style="font-size:34px; margin-bottom:10px;">🏈</div>
      <h3>Super Bowl Bingo</h3>
      <p>Commercials, plays, and halftime moments for the big game.</p>
      <div class="mt-16"><span class="pill pill-purple">Watch party</span> <span class="pill pill-teal">25 words included</span></div>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=super-bowl">Open generator</a>
    </div>
    <div class="card card-hover" data-cat="watch">
      <div style="font-size:34px; margin-bottom:10px;">🏆</div>
      <h3>Award Show Bingo</h3>
      <p>Speeches, surprises, and red-carpet moments for Oscars night.</p>
      <div class="mt-16"><span class="pill pill-purple">Watch party</span> <span class="pill pill-teal">25 words included</span></div>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=award-show">Open generator</a>
    </div>
    <div class="card card-hover" data-cat="work">
      <div style="font-size:34px; margin-bottom:10px;">👋</div>
      <h3>Team Building Bingo</h3>
      <p>Human-bingo icebreakers that get coworkers actually talking.</p>
      <div class="mt-16"><span class="pill pill-yellow">Work</span> <span class="pill pill-teal">25 words included</span></div>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=team-building">Open generator</a>
    </div>
  </div>
</div>

<div class="band band-purple"><div class="band-in">
  <div class="split">
    <div>
      <h2 style="font-size:clamp(23px,4vw,30px); margin-bottom:12px;">Can't find your game?</h2>
      <p style="font-weight:600; margin-bottom:18px;">Start blank and build exactly what you need — your own words, colors, grid size, and title. Anything from 3×3 to 7×7.</p>
      <a class="btn btn-yellow" href="/create">Start a blank card</a>
    </div>
    <div class="card center" style="background:#fff;">
      <div class="mini" style="max-width:240px; margin:0 auto;">
        <i style="background:#ffd9e6"></i><i style="background:#fff"></i><i style="background:#cdeee9"></i><i style="background:#fff"></i><i style="background:#fff0c7"></i>
        <i style="background:#fff"></i><i style="background:#e9e4ff"></i><i style="background:#fff"></i><i style="background:#ffd9e6"></i><i style="background:#fff"></i>
        <i style="background:#cdeee9"></i><i style="background:#fff"></i><i class="free-cell"></i><i style="background:#fff"></i><i style="background:#ffe6d4"></i>
        <i style="background:#fff"></i><i style="background:#fff0c7"></i><i style="background:#fff"></i><i style="background:#e9e4ff"></i><i style="background:#fff"></i>
        <i style="background:#ffd9e6"></i><i style="background:#fff"></i><i style="background:#cdeee9"></i><i style="background:#fff"></i><i style="background:#fff0c7"></i>
      </div>
      <p class="mt-16">Your words. Your colors. Your game.</p>
    </div>
  </div>
</div></div>



<script>
  document.querySelectorAll('.chip[data-filter]').forEach(function(chip) {
    chip.addEventListener('click', function(e) {
      e.preventDefault();
      var f = chip.dataset.filter;
      document.querySelectorAll('.chip[data-filter]').forEach(function(c) { c.classList.toggle('on', c === chip); });
      document.querySelectorAll('[data-cat]').forEach(function(card) {
        card.style.display = (f === 'all' || card.dataset.cat === f) ? '' : 'none';
      });
    });
  });
</script>
`,
      }} />
    </PlayfulShell>
  );
}
