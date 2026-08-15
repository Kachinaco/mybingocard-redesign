import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "MyBingoCard — Let's Play Bingo!",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="hero">
  <div class="confetti" style="width:13px;height:13px;background:var(--pink);top:6%;left:45%;"></div>
  <div class="confetti" style="width:9px;height:9px;background:var(--teal);top:20%;left:39%;animation-delay:.8s;"></div>
  <div class="confetti" style="width:11px;height:11px;background:var(--yellow);top:66%;left:1%;animation-delay:1.6s;"></div>
  <div class="confetti" style="width:8px;height:8px;background:var(--purple);top:86%;left:46%;animation-delay:2.2s;"></div>
  <div>
    <span class="sticker">★ Free to print, fun to play</span>
    <h1>Bingo cards as <span class="squiggle">fun</span> as your party</h1>
    <p class="lead">Make custom bingo cards with your own words or pictures — for baby showers, birthdays, classrooms, and any excuse to play.</p>
    <div class="cta-row">
      <a class="btn" href="/create">Create a free card</a>
      <a class="btn btn-teal" href="https://mybingocard.com/templates">Pick a template</a>
    </div>
    <p class="micro">✓ No account needed &nbsp; ✓ Free PDF &amp; PNG &nbsp; ✓ Play online too</p>
  </div>
  <div class="board-wrap">
    <span class="board-hint">psst — click the squares!</span>
    <div class="board">
      <div class="bhead"><span>B</span><span>I</span><span>N</span><span>G</span><span>O</span></div>
      <div class="bgrid" id="board">
        <div class="cell"><span>Cake</span></div><div class="cell"><span>Balloon</span></div><div class="cell"><span>Gift</span></div><div class="cell"><span>Dance</span></div><div class="cell"><span>Photo</span></div>
        <div class="cell"><span>Music</span></div><div class="cell"><span>Games</span></div><div class="cell"><span>Candles</span></div><div class="cell"><span>Toast</span></div><div class="cell"><span>Hat</span></div>
        <div class="cell"><span>Confetti</span></div><div class="cell"><span>Prize</span></div><div class="cell free"><span>FREE</span></div><div class="cell"><span>Snack</span></div><div class="cell"><span>Cheer</span></div>
        <div class="cell"><span>Selfie</span></div><div class="cell"><span>Decor</span></div><div class="cell"><span>Laugh</span></div><div class="cell"><span>Wish</span></div><div class="cell"><span>Card</span></div>
        <div class="cell"><span>Guest</span></div><div class="cell"><span>Song</span></div><div class="cell"><span>Treat</span></div><div class="cell"><span>Hug</span></div><div class="cell"><span>Yay!</span></div>
      </div>
      <div class="win-line" id="winLine"></div>
    </div>
  </div>
</header>

<div class="occ-strip"><div class="occ-track" id="occTrack">
  <span class="occ">🍼 Baby Shower</span><span class="occ">🎂 Birthday</span><span class="occ">💍 Bridal Shower</span><span class="occ">🎄 Holiday Party</span><span class="occ">✏️ Classroom</span><span class="occ">👋 Team Building</span><span class="occ">⛪ Church Social</span><span class="occ">🎓 Graduation</span><span class="occ">🎃 Halloween</span><span class="occ">🏈 Super Bowl</span>
</div></div>

<section id="how">
  <div class="sec-head"><span class="k">How it works</span><h2>Easy as 1-2-bingo</h2><p>From blank page to game time in about two minutes.</p></div>
  <div class="steps">
    <div class="step"><div class="n">1</div><h3>Add your words</h3><p>Type your own squares, upload pictures, or grab a template. AI can brainstorm ideas for your theme too.</p></div>
    <div class="step"><div class="n">2</div><h3>Shuffle it up</h3><p>Choose 3×3, 4×4, or the classic 5×5. Every card is shuffled so no two players get the same board.</p></div>
    <div class="step"><div class="n">3</div><h3>Play your way</h3><p>Print free PDFs and PNGs, share a link for phone play, or host the game live and call squares yourself.</p></div>
  </div>
</section>

<section id="templates">
  <div class="sec-head"><span class="k">Templates</span><h2>Start from a favorite</h2><p>Ready-made boards for the occasions people actually plan.</p></div>
  <div class="tpl-grid">
    <div class="tpl"><div class="mini">
      <i style="background:#ffd9e6"></i><i></i><i style="background:#ffd9e6"></i><i></i><i style="background:#ffd9e6"></i><i></i><i style="background:#ffd9e6"></i><i></i><i style="background:#ffd9e6"></i><i></i><i style="background:#ffd9e6"></i><i></i><i style="background:#ffb800"></i><i></i><i style="background:#ffd9e6"></i><i></i><i style="background:#ffd9e6"></i><i></i><i style="background:#ffd9e6"></i><i></i><i style="background:#ffd9e6"></i><i></i><i style="background:#ffd9e6"></i><i></i><i style="background:#ffd9e6"></i>
    </div><h3>Baby Shower</h3><p>Pink &amp; gold classics</p></div>
    <div class="tpl"><div class="mini">
      <i style="background:#cdeee9"></i><i style="background:#cdeee9"></i><i></i><i style="background:#cdeee9"></i><i></i><i style="background:#cdeee9"></i><i></i><i style="background:#cdeee9"></i><i></i><i style="background:#cdeee9"></i><i></i><i style="background:#cdeee9"></i><i style="background:#2ec4b6"></i><i style="background:#cdeee9"></i><i></i><i style="background:#cdeee9"></i><i></i><i style="background:#cdeee9"></i><i></i><i style="background:#cdeee9"></i><i></i><i style="background:#cdeee9"></i><i></i><i style="background:#cdeee9"></i><i></i>
    </div><h3>Classroom</h3><p>Vocabulary &amp; math</p></div>
    <div class="tpl"><div class="mini">
      <i></i><i style="background:#e9e4ff"></i><i></i><i style="background:#e9e4ff"></i><i></i><i style="background:#e9e4ff"></i><i></i><i style="background:#e9e4ff"></i><i></i><i style="background:#e9e4ff"></i><i></i><i style="background:#e9e4ff"></i><i style="background:#7c5cff"></i><i style="background:#e9e4ff"></i><i></i><i style="background:#e9e4ff"></i><i></i><i style="background:#e9e4ff"></i><i></i><i style="background:#e9e4ff"></i><i></i><i style="background:#e9e4ff"></i><i></i><i style="background:#e9e4ff"></i><i></i>
    </div><h3>Bridal Shower</h3><p>Gift-opening games</p></div>
    <div class="tpl"><div class="mini">
      <i style="background:#ffe6d4"></i><i></i><i style="background:#ffe6d4"></i><i></i><i style="background:#ffe6d4"></i><i></i><i style="background:#ffe6d4"></i><i></i><i style="background:#ffe6d4"></i><i></i><i style="background:#ffe6d4"></i><i></i><i style="background:#ff8a3d"></i><i></i><i style="background:#ffe6d4"></i><i></i><i style="background:#ffe6d4"></i><i></i><i style="background:#ffe6d4"></i><i></i><i style="background:#ffe6d4"></i><i></i><i style="background:#ffe6d4"></i><i></i><i style="background:#ffe6d4"></i>
    </div><h3>Holiday Party</h3><p>Seasonal crowds</p></div>
  </div>
</section>

<section id="features">
  <div class="sec-head"><span class="k">Features</span><h2>Small tool, big party energy</h2></div>
  <div class="feat-grid">
    <div class="feat"><div class="emoji" style="background:#ffd9e6;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5d8f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></div><h3>Words or images</h3><p>Type a list or upload pictures for picture bingo — your content, your rules.</p></div>
    <div class="feat"><div class="emoji" style="background:#fff0c7;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e69c00" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></div><h3>Any grid size</h3><p>3×3 for quick rounds, 5×5 for the full game, 4×4 when you can't decide.</p></div>
    <div class="feat"><div class="emoji" style="background:#cdeee9;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2ec4b6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div><h3>Free export</h3><p>Individual cards download as print-ready PDF or PNG. Totally free.</p></div>
    <div class="feat"><div class="emoji" style="background:#e9e4ff;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c5cff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg></div><h3>Share links</h3><p>One link gives every player their own shuffled card on their phone.</p></div>
    <div class="feat"><div class="emoji" style="background:#ffe6d4;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff8a3d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg></div><h3>Host it live</h3><p>Call squares from your screen while everyone's card updates in real time.</p></div>
    <div class="feat"><div class="emoji" style="background:#d9f5d9;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3aa856" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 0 1 4 12.7V17a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2.3A7 7 0 0 1 12 2z"/><line x1="9" y1="22" x2="15" y2="22"/></svg></div><h3>AI ideas</h3><p>Stuck on a square? Get theme-aware suggestions for any occasion.</p></div>
  </div>
</section>

<div class="quote-band"><div class="quote-in">
  <div class="stars">★★★★★</div>
  <p>"Made baby shower bingo in five minutes and everyone asked where I got the cards. Nobody believed I made them myself."</p>
  <cite>— A very smug party host</cite>
</div></div>

<div class="final">
  <h2>Ready, set, BINGO!</h2>
  <p>Your first card is free — make it in about two minutes.</p>
  <a class="btn btn-yellow" href="/create">Create a free card</a>
</div>



<script>
  // Duplicate the occasions track for a seamless marquee loop
  var track = document.getElementById('occTrack');
  track.innerHTML += track.innerHTML;

  // Interactive dabbing on the hero board
  var cells = Array.prototype.slice.call(document.querySelectorAll('#board .cell:not(.free)'));
  var winLine = document.getElementById('winLine');
  cells.forEach(function(cell) {
    cell.addEventListener('click', function() {
      cell.classList.toggle('dab');
      checkWin();
    });
  });
  function checkWin() {
    var all = Array.prototype.slice.call(document.querySelectorAll('#board .cell'));
    var dabbed = all.map(function(c){ return c.classList.contains('dab') || c.classList.contains('free'); });
    var lines = [];
    for (var r = 0; r < 5; r++) lines.push([0,1,2,3,4].map(function(c){ return r*5+c; }));
    for (var c = 0; c < 5; c++) lines.push([0,1,2,3,4].map(function(r){ return r*5+c; }));
    lines.push([0,6,12,18,24]); lines.push([4,8,12,16,20]);
    var won = lines.some(function(line){ return line.every(function(i){ return dabbed[i]; }); });
    winLine.textContent = won ? '🎉 BINGO! Now imagine this at your party.' : '';
  }
</script>
`,
      }} />
      <style dangerouslySetInnerHTML={{__html: `
  * { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --ink:#33312e; --paper:#fff7ed; --pink:#ff5d8f; --teal:#2ec4b6; --yellow:#ffb800;
    --purple:#7c5cff; --orange:#ff8a3d; --mut:#6b6459; --faint:#a39a88;
  }
  html { font-size:16px; }
  body { font-family:'Nunito',sans-serif; background:var(--paper); color:var(--ink); line-height:1.6; }
  h1,h2,h3 { font-family:'Fredoka',sans-serif; font-weight:600; }
  ::selection { background:var(--yellow); }

  /* ---------- nav ---------- */
  nav { position:sticky; top:0; z-index:20; background:rgba(255,247,237,.92); backdrop-filter:blur(8px); border-bottom:2px solid var(--ink); }
  .nav-in { max-width:1024px; margin:0 auto; padding:12px clamp(16px,4vw,24px); display:flex; justify-content:space-between; align-items:center; gap:12px; }
  .logo { font-family:'Fredoka'; font-weight:700; font-size:clamp(16px,2.5vw,19px); color:var(--pink); text-decoration:none; white-space:nowrap; }
  .logo span { color:var(--teal); }
  .nav-links { display:flex; gap:clamp(12px,3vw,22px); align-items:center; }
  .nav-links a { color:var(--ink); text-decoration:none; font-size:clamp(12px,1.8vw,13.5px); font-weight:700; white-space:nowrap; }
  .nav-links a:hover { color:var(--pink); }

  /* ---------- buttons ---------- */
  .btn { display:inline-block; background:var(--pink); color:#fff; padding:clamp(9px,1.5vw,11px) clamp(18px,3vw,24px); border-radius:999px; text-decoration:none; font-family:'Fredoka'; font-weight:600; font-size:clamp(13px,1.8vw,14px); border:2.5px solid var(--ink); box-shadow:0 3px 0 var(--ink); transition:transform .12s, box-shadow .12s; text-align:center; }
  .btn:hover { transform:translateY(2px); box-shadow:0 1px 0 var(--ink); }
  .btn:focus-visible { outline:3px solid var(--purple); outline-offset:2px; }
  .btn-teal { background:var(--teal); }
  .btn-yellow { background:var(--yellow); color:var(--ink); }
  .btn-sm { padding:7px 16px; font-size:13px; }

  /* ---------- hero ---------- */
  .hero { max-width:1024px; margin:0 auto; padding:clamp(32px,6vw,52px) clamp(16px,4vw,24px) clamp(40px,7vw,60px); display:grid; grid-template-columns:1.05fr .95fr; gap:clamp(24px,4vw,40px); align-items:center; position:relative; }
  .confetti { position:absolute; border-radius:50%; pointer-events:none; animation:bob 5s ease-in-out infinite; }
  @keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
  .sticker { display:inline-block; background:#fff; border:2px solid var(--ink); border-radius:999px; padding:5px 14px; font-family:'Fredoka'; font-weight:600; font-size:clamp(11px,1.6vw,12px); transform:rotate(-2deg); box-shadow:0 2px 0 var(--ink); margin-bottom:18px; }
  .hero h1 { font-size:clamp(32px,5vw,46px); line-height:1.08; font-weight:700; margin-bottom:16px; }
  .squiggle { text-decoration:underline wavy var(--yellow); text-decoration-thickness:4px; text-underline-offset:7px; }
  .hero p.lead { font-size:clamp(15px,1.8vw,17px); font-weight:600; color:var(--mut); max-width:460px; margin-bottom:24px; }
  .cta-row { display:flex; gap:12px; flex-wrap:wrap; }
  .micro { margin-top:14px; font-size:clamp(11.5px,1.6vw,12.5px); font-weight:700; color:var(--faint); }

  /* ---------- interactive board ---------- */
  .board-wrap { position:relative; width:100%; display:flex; justify-content:center; }
  .board-hint { position:absolute; top:-14px; right:clamp(4px,2vw,14px); background:var(--yellow); border:2px solid var(--ink); border-radius:999px; padding:3px 12px; font-family:'Fredoka'; font-weight:600; font-size:clamp(10px,1.4vw,11px); transform:rotate(3deg); box-shadow:0 2px 0 var(--ink); z-index:2; white-space:nowrap; }
  .board { background:#fff; border:3px solid var(--ink); border-radius:clamp(14px,2.5vw,20px); padding:clamp(9px,1.8vw,14px); box-shadow:0 6px 0 var(--ink); transform:rotate(1.5deg); width:min(340px,100%); }
  .bhead { display:grid; grid-template-columns:repeat(5,1fr); gap:clamp(3px,.8vw,6px); margin-bottom:clamp(3px,.8vw,6px); }
  .bhead span { text-align:center; font-family:'Fredoka'; font-weight:700; font-size:clamp(11px,2vw,15px); color:#fff; border-radius:clamp(6px,1.2vw,9px); padding:4px 0; border:2px solid var(--ink); }
  .bhead span:nth-child(1){background:var(--pink);} .bhead span:nth-child(2){background:var(--yellow);} .bhead span:nth-child(3){background:var(--teal);} .bhead span:nth-child(4){background:var(--purple);} .bhead span:nth-child(5){background:var(--orange);}
  .bgrid { display:grid; grid-template-columns:repeat(5,1fr); gap:clamp(3px,.8vw,6px); }
  .cell { position:relative; aspect-ratio:1; border:2px solid var(--ink); border-radius:clamp(6px,1.2vw,9px); background:var(--paper); display:flex; align-items:center; justify-content:center; font-size:clamp(7px,1.3vw,9px); font-weight:800; text-align:center; padding:2px; cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent; transition:background .1s, transform .1s; }
  .cell:hover { transform:scale(1.06); }
  .cell.free { background:var(--yellow); cursor:default; }
  .cell.dab { background:#cdeee9; }
  .cell.dab::after { content:""; position:absolute; width:58%; height:58%; border-radius:50%; background:rgba(255,93,143,.45); }
  .cell span { position:relative; z-index:1; }
  .win-line { margin-top:10px; text-align:center; font-family:'Fredoka'; font-weight:600; font-size:clamp(12px,1.8vw,13px); color:var(--pink); min-height:20px; }

  /* ---------- occasions ---------- */
  .occ-strip { border-top:2px solid var(--ink); border-bottom:2px solid var(--ink); background:#fff; overflow:hidden; padding:14px 0; white-space:nowrap; }
  .occ-track { display:inline-block; animation:scroll 30s linear infinite; }
  .occ-track:hover { animation-play-state:paused; }
  @keyframes scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  .occ { display:inline-block; background:var(--paper); border:2px solid var(--ink); border-radius:999px; padding:7px 18px; font-family:'Fredoka'; font-weight:600; font-size:clamp(12px,1.7vw,13px); margin:0 6px; }
  @media (prefers-reduced-motion:reduce){ .occ-track,.confetti{animation:none;} }

  /* ---------- sections ---------- */
  section { max-width:1024px; margin:0 auto; padding:clamp(36px,7vw,56px) clamp(16px,4vw,24px); }
  .sec-head { text-align:center; margin-bottom:clamp(26px,5vw,38px); }
  .sec-head .k { display:inline-block; font-family:'Fredoka'; font-weight:600; font-size:clamp(11px,1.6vw,12px); color:var(--purple); background:#efeaff; border:2px solid var(--ink); border-radius:999px; padding:3px 12px; margin-bottom:12px; box-shadow:0 2px 0 var(--ink); }
  .sec-head h2 { font-size:clamp(24px,4.5vw,30px); font-weight:700; margin-bottom:10px; }
  .sec-head p { color:var(--mut); font-weight:600; max-width:480px; margin:0 auto; font-size:clamp(13.5px,2vw,15px); }

  /* ---------- fluid card grids ---------- */
  .steps { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr)); gap:16px; }
  .step { background:#fff; border:2.5px solid var(--ink); border-radius:16px; padding:clamp(16px,3vw,22px); box-shadow:0 4px 0 var(--ink); }
  .step .n { width:34px; height:34px; border-radius:50%; border:2.5px solid var(--ink); display:flex; align-items:center; justify-content:center; font-family:'Fredoka'; font-weight:700; font-size:15px; margin-bottom:14px; color:#fff; }
  .step:nth-child(1) .n { background:var(--pink); } .step:nth-child(2) .n { background:var(--teal); } .step:nth-child(3) .n { background:var(--purple); }
  .step h3 { font-size:clamp(15px,2.2vw,17px); margin-bottom:6px; }
  .step p { font-size:clamp(12.5px,1.8vw,13px); font-weight:600; color:var(--mut); }

  .tpl-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr)); gap:16px; }
  .tpl { background:#fff; border:2.5px solid var(--ink); border-radius:16px; padding:14px; box-shadow:0 4px 0 var(--ink); transition:transform .15s; }
  .tpl:hover { transform:translateY(-4px) rotate(-1deg); }
  .tpl .mini { display:grid; grid-template-columns:repeat(5,1fr); gap:3px; margin-bottom:12px; }
  .tpl .mini i { aspect-ratio:1; border-radius:4px; border:1.5px solid var(--ink); }
  .tpl h3 { font-size:clamp(13px,1.9vw,14px); margin-bottom:2px; }
  .tpl p { font-size:clamp(11px,1.6vw,11.5px); font-weight:700; color:var(--faint); }

  .feat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr)); gap:16px; }
  .feat { background:#fff; border:2.5px solid var(--ink); border-radius:16px; padding:clamp(15px,3vw,20px); box-shadow:0 4px 0 var(--ink); }
  .feat .emoji { width:40px; height:40px; border-radius:11px; border:2px solid var(--ink); display:flex; align-items:center; justify-content:center; margin-bottom:12px; }
  .feat h3 { font-size:clamp(14.5px,2.1vw,16px); margin-bottom:5px; }
  .feat p { font-size:clamp(12.5px,1.8vw,13px); font-weight:600; color:var(--mut); }

  /* ---------- quote ---------- */
  .quote-band { background:var(--purple); border-top:3px solid var(--ink); border-bottom:3px solid var(--ink); }
  .quote-in { max-width:720px; margin:0 auto; padding:clamp(32px,6vw,48px) clamp(16px,4vw,24px); text-align:center; }
  .quote-in p { font-family:'Fredoka'; font-weight:500; font-size:clamp(16px,3vw,21px); color:#fff; line-height:1.45; margin-bottom:14px; }
  .quote-in .stars { color:var(--yellow); font-size:15px; letter-spacing:4px; margin-bottom:12px; }
  .quote-in cite { font-style:normal; font-size:clamp(11px,1.6vw,12px); font-weight:800; color:#d9d0ff; letter-spacing:.12em; text-transform:uppercase; }

  /* ---------- final ---------- */
  .final { background:var(--teal); border-bottom:3px solid var(--ink); text-align:center; padding:clamp(40px,8vw,60px) clamp(16px,4vw,24px); position:relative; overflow:hidden; }
  .final h2 { font-size:clamp(25px,5vw,32px); font-weight:700; color:#fff; margin-bottom:10px; text-shadow:2px 2px 0 var(--ink); }
  .final p { color:#eafffb; font-weight:700; margin-bottom:24px; font-size:clamp(13.5px,2vw,15px); }
  footer { padding:22px clamp(16px,4vw,24px); text-align:center; font-size:clamp(11px,1.6vw,12px); font-weight:700; color:var(--faint); }

  /* ---------- layout breakpoints ---------- */
  @media (min-width:1100px){
    /* scale from the tighter of usable width and height; short windows stay compact */
    .nav-in, section { max-width:clamp(1024px,88vw,1340px); }
    .hero {
      max-width:clamp(1024px,min(88vw,170vh),1340px);
      padding-top:clamp(34px,5vh,52px);
      padding-bottom:clamp(38px,6vh,60px);
      gap:clamp(40px,min(4vw,7vh),64px);
    }
    .logo { font-size:clamp(19px,min(1.5vw,2.8vh),22px); }
    .nav-links a { font-size:clamp(13.5px,min(1.05vw,2vh),15px); }
    .hero h1 { font-size:clamp(46px,min(4vw,8vh),62px); }
    .hero p.lead { max-width:580px; font-size:clamp(17px,min(1.45vw,3vh),20px); }
    .sticker { padding:6px 16px; font-size:clamp(12px,min(1vw,2vh),14px); }
    .btn { padding:11px 25px; font-size:clamp(14px,min(1.15vw,2.2vh),16px); }
    .btn-sm { padding:8px 18px; font-size:14px; }
    .micro { font-size:clamp(12.5px,min(1vw,2vh),14px); }
    .board { width:min(clamp(340px,min(29vw,56vh),440px),100%); }
    .board-hint { padding:4px 14px; font-size:clamp(11px,min(.9vw,1.8vh),13px); }
    .bhead span { font-size:clamp(15px,min(1.2vw,2.4vh),17px); }
    .cell { font-size:clamp(9px,min(.75vw,1.6vh),11px); }
    .win-line { font-size:clamp(13px,min(1.05vw,2vh),15px); }
    .sec-head h2 { font-size:clamp(30px,min(2.4vw,4.5vh),36px); }
    .sec-head p { max-width:560px; font-size:clamp(15px,min(1.2vw,2.4vh),17px); }
    .step h3, .feat h3 { font-size:clamp(17px,min(1.2vw,2.2vh),19px); }
    .step p, .feat p { font-size:clamp(13px,min(1vw,1.8vh),15px); }
    .tpl h3 { font-size:clamp(14px,min(1.1vw,2vh),16px); }
    .tpl p { font-size:clamp(11.5px,min(.9vw,1.7vh),13px); }
    .feat-grid { grid-template-columns:repeat(3,1fr); }
    .quote-in { max-width:clamp(720px,55vw,820px); }
    .quote-in p { font-size:clamp(21px,min(1.6vw,3.2vh),24px); }
    .final h2 { font-size:clamp(32px,min(2.4vw,4.5vh),38px); }
    .final p { font-size:clamp(15px,min(1.2vw,2.4vh),17px); }
    footer { font-size:clamp(12px,min(.9vw,1.8vh),13px); }
  }
  @media (max-width:880px){
    .hero { grid-template-columns:1fr; }
    .hero p.lead { max-width:100%; }
    .board-wrap { justify-content:center; }
    .board { margin:0 auto; }
    .nav-links a:not(.btn) { display:none; }
  }
  @media (min-width:700px) and (max-width:880px) and (max-height:900px){
    /* preserve the compact two-column opening on short laptop/tablet viewports */
    .hero { grid-template-columns:1.05fr .95fr; }
    .hero p.lead { max-width:460px; }
  }
  @media (max-width:420px){
    .board-hint { display:none; }
    .occ { padding:6px 14px; }
    /* tighten the opening stack so the board + win-line fit in the first viewport */
    .hero { padding-top:20px; gap:16px; }
    .sticker { margin-bottom:10px; }
    .hero h1 { margin-bottom:10px; }
    .hero p.lead { margin-bottom:16px; }
    .micro { margin-top:8px; }
  }
  @media (max-width:321px){
    /* stack only once the two intrinsic CTA widths no longer fit comfortably */
    .cta-row { flex-direction:column; }
    .cta-row .btn { width:100%; }
  }
`}} />
    </PlayfulShell>
  );
}
