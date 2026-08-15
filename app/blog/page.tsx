import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Blog — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">Blog</span>
  <h1>Party ideas &amp; bingo know-how</h1>
  <p>Game variations, square ideas, and hosting tricks from thousands of real events.</p>
</header>

<div class="section section-tight">
  <div class="chip-row">
    <a class="chip on" href="#" data-filter="all">All posts</a>
    <a class="chip" href="#" data-filter="party">Party ideas</a>
    <a class="chip" href="#" data-filter="classroom">Classroom</a>
    <a class="chip" href="#" data-filter="howto">How-to</a>
    <a class="chip" href="#" data-filter="product">Product news</a>
  </div>

  <div class="grid-3">
    <a class="card card-hover" data-cat="party" href="05-playful-confetti-post.html?post=baby-shower-games" style="text-decoration:none;color:inherit;">
      <div class="post-art" style="background:#ffd9e6;">
        <i style="width:34px;height:34px;background:var(--pink);top:12px;left:14px;"></i>
        <i style="width:20px;height:20px;background:var(--yellow);bottom:14px;right:18px;"></i>
        <i style="width:14px;height:14px;background:var(--teal);top:20px;right:40%;"></i>
      </div>
      <div class="post-meta"><span class="pill pill-pink">Party ideas</span><time>Jul 28, 2026</time></div>
      <h3>25 baby shower bingo squares that aren't "diaper"</h3>
      <p>Fresh ideas that get the whole table laughing instead of groaning.</p>
    </a>

    <a class="card card-hover" data-cat="classroom" href="05-playful-confetti-post.html?post=classroom-review" style="text-decoration:none;color:inherit;">
      <div class="post-art" style="background:#cdeee9;">
        <i style="width:28px;height:28px;background:var(--teal);top:16px;right:16px;"></i>
        <i style="width:18px;height:18px;background:var(--purple);bottom:16px;left:20px;"></i>
        <i style="width:12px;height:12px;background:var(--orange);top:50%;left:45%;"></i>
      </div>
      <div class="post-meta"><span class="pill pill-teal">Classroom</span><time>Jul 21, 2026</time></div>
      <h3>Review bingo: make test prep feel like a game show</h3>
      <p>How teachers turn any study guide into a 15-minute bingo round.</p>
    </a>

    <a class="card card-hover" data-cat="howto" href="05-playful-confetti-post.html?post=virtual-bingo" style="text-decoration:none;color:inherit;">
      <div class="post-art" style="background:#fff0c7;">
        <i style="width:30px;height:30px;background:var(--orange);top:14px;left:40%;"></i>
        <i style="width:16px;height:16px;background:var(--pink);bottom:14px;right:22px;"></i>
        <i style="width:12px;height:12px;background:var(--teal);top:18px;right:14%;"></i>
      </div>
      <div class="post-meta"><span class="pill pill-yellow">How-to</span><time>Jul 14, 2026</time></div>
      <h3>Hosting a 100-person bingo game without chaos</h3>
      <p>The live-hosting checklist we give to event venues.</p>
    </a>

    <a class="card card-hover" data-cat="party" href="05-playful-confetti-post.html?post=big-game-party" style="text-decoration:none;color:inherit;">
      <div class="post-art" style="background:#e9e4ff;">
        <i style="width:26px;height:26px;background:var(--purple);bottom:14px;left:16px;"></i>
        <i style="width:20px;height:20px;background:var(--yellow);top:14px;right:20px;"></i>
        <i style="width:14px;height:14px;background:var(--pink);top:40%;left:48%;"></i>
      </div>
      <div class="post-meta"><span class="pill pill-purple">Product news</span><time>Jul 7, 2026</time></div>
      <h3>New: QR join codes for every share link</h3>
      <p>Project the code, guests scan, everyone's playing in ten seconds.</p>
    </a>

    <a class="card card-hover" data-cat="classroom" href="05-playful-confetti-post.html?post=esl-bingo" style="text-decoration:none;color:inherit;">
      <div class="post-art" style="background:#ffe6d4;">
        <i style="width:32px;height:32px;background:var(--pink);top:16px;left:16px;"></i>
        <i style="width:16px;height:16px;background:var(--teal);bottom:16px;right:30%;"></i>
        <i style="width:12px;height:12px;background:var(--purple);top:16px;right:16px;"></i>
      </div>
      <div class="post-meta"><span class="pill pill-pink">Party ideas</span><time>Jun 30, 2026</time></div>
      <h3>Picture bingo: the trick for guests who don't read English</h3>
      <p>Why photo boards are the sleeper hit of multilingual family parties.</p>
    </a>

    <a class="card card-hover" data-cat="party" href="05-playful-confetti-post.html?post=wedding-shower-timeline" style="text-decoration:none;color:inherit;">
      <div class="post-art" style="background:#d9f5d9;">
        <i style="width:24px;height:24px;background:var(--teal);top:20px;right:30%;"></i>
        <i style="width:18px;height:18px;background:var(--yellow);bottom:16px;left:18px;"></i>
        <i style="width:12px;height:12px;background:var(--orange);top:14px;left:30%;"></i>
      </div>
      <div class="post-meta"><span class="pill pill-green">How-to</span><time>Jun 22, 2026</time></div>
      <h3>5 bingo variations beyond straight lines</h3>
      <p>Four corners, blackout, postage stamp, and two you've never tried.</p>
    </a>
  </div>

  <div class="card mt-24 center" style="background:#efeaff;">
    <h3>Get the good stuff monthly</h3>
    <p>One email a month: new templates, seasonal square ideas, and hosting tips. No spam, unsubscribe anytime.</p>
    <div class="mt-16" style="display:flex;gap:10px;max-width:420px;margin-left:auto;margin-right:auto;">
      <input class="input" type="email" placeholder="you@example.com" aria-label="Email for newsletter">
      <button class="btn" type="button" style="flex:none;">Join</button>
    </div>
  </div>
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
  // newsletter signup -> friendly confirmation instead of a dead submit
  var nl = document.querySelector('form');
  if (nl) nl.addEventListener('submit', function(e) {
    e.preventDefault();
    nl.innerHTML = '<p style="font-weight:800; color:var(--ink);">🎉 You\\'re on the list — new ideas land monthly.</p>';
  });
</script>
`,
      }} />
      <style dangerouslySetInnerHTML={{__html: `
  .post-art { height:110px; border:2px solid var(--ink); border-radius:12px; margin-bottom:14px; position:relative; overflow:hidden; }
  .post-art i { position:absolute; border-radius:50%; }
  .post-meta { display:flex; gap:8px; align-items:center; margin-bottom:8px; }
  .post-meta time { font-size:11.5px; font-weight:800; color:var(--faint); }
`}} />
    </PlayfulShell>
  );
}
