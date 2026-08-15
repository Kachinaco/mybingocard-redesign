import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Templates — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">Templates</span>
  <h1>Pick a board, make it yours</h1>
  <p>Every template is a starting point — swap words, change colors, resize the grid. Or use it exactly as-is and start playing in seconds.</p>
</header>

<div class="section section-tight">
  <div class="chip-row">
    <a class="chip on" href="#" data-filter="all">All</a>
    <a class="chip" href="#" data-filter="showers">🍼 Showers</a>
    <a class="chip" href="#" data-filter="parties">🎂 Parties</a>
    <a class="chip" href="#" data-filter="classroom">✏️ Classroom</a>
    <a class="chip" href="#" data-filter="holidays">🎄 Holidays</a>
    <a class="chip" href="#" data-filter="work">👋 Work</a>
    <a class="chip" href="#" data-filter="sports">🏈 Sports</a>
  </div>

  <div class="grid-4">
    <div class="card card-hover" data-cat="parties">
      <div class="mini mini-words" style="margin-bottom:12px;">
        <i>Cake</i><i>Gift</i><i>Bow</i><i>Song</i><i>Hug</i>
        <i>Dance</i><i>Toast</i><i>Photo</i><i>Game</i><i>Hat</i>
        <i>Card</i><i>Wish</i><i class="free-cell">FREE</i><i>Snack</i><i>Prize</i>
        <i>Balloon</i><i>Decor</i><i>Cheer</i><i>Treat</i><i>Laugh</i>
        <i>Guest</i><i>Candle</i><i>Selfie</i><i>Music</i><i>Yay!</i>
      </div>
      <h3>Birthday Party</h3>
      <p>5×5 · 25 squares · 12k uses</p>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=birthday">Use template</a>
    </div>

    <div class="card card-hover" data-cat="showers">
      <div class="mini" style="margin-bottom:12px;">
        <i style="background:#ffd9e6"></i><i style="background:#fff"></i><i style="background:#cdeee9"></i><i style="background:#fff"></i><i style="background:#fff0c7"></i>
        <i style="background:#fff"></i><i style="background:#e9e4ff"></i><i style="background:#fff"></i><i style="background:#ffd9e6"></i><i style="background:#fff"></i>
        <i style="background:#cdeee9"></i><i style="background:#fff"></i><i class="free-cell"></i><i style="background:#fff"></i><i style="background:#ffe6d4"></i>
        <i style="background:#fff"></i><i style="background:#fff0c7"></i><i style="background:#fff"></i><i style="background:#e9e4ff"></i><i style="background:#fff"></i>
        <i style="background:#ffd9e6"></i><i style="background:#fff"></i><i style="background:#cdeee9"></i><i style="background:#fff"></i><i style="background:#fff0c7"></i>
      </div>
      <h3>Baby Shower</h3>
      <p>5×5 · pastel theme · 9.4k uses</p>
      <a class="btn btn-sm btn-teal mt-16" href="/party-bingo">Use template</a>
    </div>

    <div class="card card-hover" data-cat="showers">
      <div class="mini mini-words" style="margin-bottom:12px;">
        <i>Ring</i><i>Vows</i><i>Cake</i><i>Dance</i><i>Toast</i>
        <i>Bride</i><i>Groom</i><i>Kiss</i><i>Dress</i><i>Photo</i>
        <i>Flowers</i><i>Music</i><i class="free-cell">FREE</i><i>Tears</i><i>Cheers</i>
        <i>Guest</i><i>Speech</i><i>Gift</i><i>Song</i><i>Bow</i>
        <i>Candle</i><i>Card</i><i>Selfie</i><i>Party</i><i>Love</i>
      </div>
      <h3>Bridal Shower</h3>
      <p>5×5 · 25 squares · 7.1k uses</p>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=bridal-shower">Use template</a>
    </div>

    <div class="card card-hover" data-cat="classroom">
      <div class="mini mini-words" style="margin-bottom:12px;">
        <i>Read</i><i>Math</i><i>Quiz</i><i>Art</i><i>Recess</i>
        <i>Spell</i><i>Write</i><i>Draw</i><i>Count</i><i>Share</i>
        <i>Listen</i><i>Learn</i><i class="free-cell">FREE</i><i>Help</i><i>Play</i>
        <i>Book</i><i>Star</i><i>Team</i><i>Ask</i><i>Win</i>
        <i>Sing</i><i>Build</i><i>Find</i><i>Name</i><i>Clap</i>
      </div>
      <h3>Classroom Review</h3>
      <p>5×5 · teacher favorite · 6.8k uses</p>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=classroom">Use template</a>
    </div>

    <div class="card card-hover" data-cat="holidays">
      <div class="mini" style="margin-bottom:12px;">
        <i style="background:#d9f5d9"></i><i style="background:#fff"></i><i style="background:#ffd9d9"></i><i style="background:#fff"></i><i style="background:#d9f5d9"></i>
        <i style="background:#fff"></i><i style="background:#fff0c7"></i><i style="background:#fff"></i><i style="background:#d9f5d9"></i><i style="background:#fff"></i>
        <i style="background:#ffd9d9"></i><i style="background:#fff"></i><i class="free-cell"></i><i style="background:#fff"></i><i style="background:#fff0c7"></i>
        <i style="background:#fff"></i><i style="background:#d9f5d9"></i><i style="background:#fff"></i><i style="background:#ffd9d9"></i><i style="background:#fff"></i>
        <i style="background:#fff0c7"></i><i style="background:#fff"></i><i style="background:#d9f5d9"></i><i style="background:#fff"></i><i style="background:#ffd9d9"></i>
      </div>
      <h3>Holiday Party</h3>
      <p>5×5 · festive palette · 5.9k uses</p>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=holiday">Use template</a>
    </div>

    <div class="card card-hover" data-cat="work">
      <div class="mini mini-words" style="margin-bottom:12px;">
        <i>Zoom</i><i>Email</i><i>Coffee</i><i>Memo</i><i>Call</i>
        <i>Team</i><i>Goal</i><i>Plan</i><i>Slide</i><i>Chat</i>
        <i>Boss</i><i>Lunch</i><i class="free-cell">FREE</i><i>Task</i><i>Win</i>
        <i>Meet</i><i>Doc</i><i>Idea</i><i>Desk</i><i>High5</i>
        <i>Deal</i><i>Vote</i><i>Game</i><i>Joke</i><i>Done</i>
      </div>
      <h3>Team Building</h3>
      <p>5×5 · office-safe · 4.2k uses</p>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=team-building">Use template</a>
    </div>

    <div class="card card-hover" data-cat="parties">
      <div class="mini mini-words" style="margin-bottom:12px;">
        <i>Cap</i><i>Gown</i><i>Diploma</i><i>Photo</i><i>Hug</i>
        <i>Speech</i><i>Toss</i><i>Cheer</i><i>Family</i><i>Tears</i>
        <i>Party</i><i>Cake</i><i class="free-cell">FREE</i><i>Music</i><i>Dance</i>
        <i>Gift</i><i>Card</i><i>Friends</i><i>Future</i><i>Proud</i>
        <i>Walk</i><i>Stage</i><i>Honor</i><i>Smile</i><i>Yay!</i>
      </div>
      <h3>Graduation</h3>
      <p>5×5 · 25 squares · 3.7k uses</p>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=graduation">Use template</a>
    </div>

    <div class="card card-hover" data-cat="sports">
      <div class="mini mini-words" style="margin-bottom:12px;">
        <i>TD</i><i>Field Goal</i><i>Fumble</i><i>Sack</i><i>Punt</i>
        <i>Ad</i><i>Snack</i><i>Ref</i><i>Coach</i><i>Fan</i>
        <i>Halftime</i><i>Replay</i><i class="free-cell">FREE</i><i>Flag</i><i>Score</i>
        <i>Cheer</i><i>Wing</i><i>Nacho</i><i>Pick</i><i>Rush</i>
        <i>Block</i><i>Kick</i><i>Pass</i><i>Win</i><i>OT</i>
      </div>
      <h3>Super Bowl</h3>
      <p>5×5 · commercials included · 3.1k uses</p>
      <a class="btn btn-sm btn-teal mt-16" href="05-playful-confetti-create.html?starter=super-bowl">Use template</a>
    </div>
  </div>

  <div class="card mt-24 center" style="background:#efeaff;">
    <h3>Can't find your occasion?</h3>
    <p>Start from scratch or let the AI brainstorm squares for any theme you can describe.</p>
    <a class="btn mt-16" href="/create">Start a blank card</a>
  </div>
</div>

<div class="cta-band">
  <h2>Found one you like?</h2>
  <p>Every template is free to customize, print, and share.</p>
  <a class="btn btn-yellow" href="/create">Make a card now</a>
</div>



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
