import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Features — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">Features</span>
  <h1>Everything a bingo night needs</h1>
  <p>From the first square to the winning shout — here's the full toolkit.</p>
</header>

<div class="section section-tight">

  <div class="feat-block">
    <div>
      <span class="pill pill-pink">Create</span>
      <h2 class="mt-8">Words, pictures, or both</h2>
      <p>Type your own squares, paste a list, or upload photos for picture bingo. Choose 3×3, 4×4, or the classic 5×5 grid and every player's card shuffles differently.</p>
      <ul class="check-list">
        <li>Custom word &amp; phrase squares</li>
        <li>Picture bingo with your uploads</li>
        <li>Automatic shuffling per player</li>
      </ul>
    </div>
    <div class="feat-visual">
      <div class="demo-board">
        <i class="dab">Cake</i><i>Gift</i><i>Bow</i><i class="dab">Song</i><i>Hug</i>
        <i>Dance</i><i class="dab">Toast</i><i>Photo</i><i>Game</i><i>Hat</i>
        <i>Card</i><i>Wish</i><i class="free">FREE</i><i>Snack</i><i class="dab">Prize</i>
        <i class="dab">Balloon</i><i>Decor</i><i class="dab">Cheer</i><i>Treat</i><i>Laugh</i>
        <i>Guest</i><i>Candle</i><i>Selfie</i><i class="dab">Music</i><i>Yay!</i>
      </div>
    </div>
  </div>

  <div class="feat-block flip">
    <div>
      <span class="pill pill-teal">Share</span>
      <h2 class="mt-8">One link, every phone</h2>
      <p>Send a single share link and each player instantly gets their own shuffled card in the browser — no downloads, no accounts, no "what do I click?"</p>
      <ul class="check-list">
        <li>Instant browser play on any phone</li>
        <li>QR code for in-person events</li>
        <li>Free PDF &amp; PNG printing too</li>
      </ul>
    </div>
    <div class="feat-visual">
      <div class="demo-link"><code>mybingo.cards/party/A7K2</code><span class="pill pill-teal">Copy</span></div>
      <div class="demo-link mt-8"><code>📷 QR code ready</code><span class="pill pill-purple">View</span></div>
      <p class="form-hint mt-8">28 players joined this link in the last hour</p>
    </div>
  </div>

  <div class="feat-block">
    <div>
      <span class="pill pill-purple">Host</span>
      <h2 class="mt-8">Call squares live</h2>
      <p>Run the game from your screen. Call squares one tap at a time and every player's card marks itself in real time — first bingo gets announced for you.</p>
      <ul class="check-list">
        <li>Real-time card updates for all players</li>
        <li>Automatic bingo detection</li>
        <li>Works on Wi-Fi at the venue</li>
      </ul>
    </div>
    <div class="feat-visual">
      <div class="demo-call"><span>Now calling</span><span class="ball">B-7</span></div>
      <div class="demo-call" style="background:var(--paper);color:var(--ink);"><span>Next up</span><span class="ball" style="background:var(--teal);border-color:var(--ink);">G-52</span></div>
      <p class="form-hint mt-8">42 players connected · 3 one away from bingo</p>
    </div>
  </div>

  <div class="feat-block flip">
    <div>
      <span class="pill pill-yellow">AI</span>
      <h2 class="mt-8">Never stare at a blank card</h2>
      <p>Describe your theme — "dinosaur 5th birthday" or "90s office party" — and get a full board of on-theme square ideas in seconds. Edit anything before you commit.</p>
      <ul class="check-list">
        <li>Theme-aware square suggestions</li>
        <li>One-click refill for weak squares</li>
        <li>You approve every word</li>
      </ul>
    </div>
    <div class="feat-visual">
      <div class="demo-link"><code>"baby shower, garden theme"</code><span class="pill pill-yellow">Go</span></div>
      <div class="mt-16" style="display:flex;gap:6px;flex-wrap:wrap;">
        <span class="pill pill-teal">Bloom</span><span class="pill pill-teal">Sprout</span><span class="pill pill-teal">Daisy</span>
        <span class="pill pill-teal">Seedling</span><span class="pill pill-teal">Picnic</span><span class="pill pill-teal">Butterfly</span>
        <span class="pill pill-teal">Watering can</span><span class="pill pill-teal">Tulip</span>
      </div>
    </div>
  </div>

  <div class="grid-3 mt-24">
    <div class="card center"><h3>🖨️ Print-ready</h3><p>Crisp PDFs sized for Letter and A4, plus PNGs for slides and social.</p></div>
    <div class="card center"><h3>📱 Phone-first</h3><p>Cards, hosting, and sharing all work one-handed on a phone.</p></div>
    <div class="card center"><h3>🔒 No player accounts</h3><p>Guests join with a link. Only hosts ever sign in.</p></div>
  </div>
</div>

<div class="cta-band">
  <h2>Try every feature free</h2>
  <p>The free plan covers creating, printing, and sharing. Upgrade only for live hosting.</p>
  <a class="btn btn-yellow" href="/create">Make a card now</a>
</div>



`,
      }} />
      <style dangerouslySetInnerHTML={{__html: `
  .feat-block { display:grid; grid-template-columns:1fr 1fr; gap:clamp(20px,4vw,44px); align-items:center; margin-bottom:clamp(28px,5vw,44px); }
  .feat-block.flip > .feat-visual { order:2; }
  .feat-block h2 { font-size:clamp(20px,3.5vw,26px); margin-bottom:10px; }
  .feat-block > div > p { color:var(--mut); font-weight:600; font-size:clamp(13.5px,2vw,15px); margin-bottom:14px; }
  .feat-visual { background:#fff; border:3px solid var(--ink); border-radius:18px; box-shadow:var(--shadow-lg); padding:clamp(14px,3vw,22px); transform:rotate(1deg); }
  .feat-block.flip .feat-visual { transform:rotate(-1deg); }
  .demo-board { display:grid; grid-template-columns:repeat(5,1fr); gap:4px; }
  .demo-board i { aspect-ratio:1; border:2px solid var(--ink); border-radius:7px; background:var(--paper); display:flex; align-items:center; justify-content:center; font-style:normal; font-size:clamp(7px,1.2vw,9px); font-weight:800; text-align:center; padding:2px; }
  .demo-board i.free { background:var(--yellow); }
  .demo-board i.dab { background:#cdeee9; position:relative; }
  .demo-board i.dab::after { content:""; position:absolute; width:58%; height:58%; border-radius:50%; background:rgba(255,93,143,.45); }
  .demo-link { display:flex; gap:8px; align-items:center; background:var(--paper); border:2px solid var(--ink); border-radius:12px; padding:10px 12px; font-size:12.5px; font-weight:800; color:var(--mut); }
  .demo-link code { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ink); }
  .demo-call { display:flex; align-items:center; justify-content:space-between; background:var(--ink); color:var(--paper); border-radius:12px; padding:12px 16px; font-family:'Fredoka'; font-weight:600; margin-bottom:10px; }
  .demo-call .ball { width:40px; height:40px; border-radius:50%; background:var(--pink); border:2.5px solid var(--paper); display:flex; align-items:center; justify-content:center; font-size:15px; }
  @media (max-width:760px){ .feat-block, .feat-block.flip { grid-template-columns:1fr; } .feat-block.flip > .feat-visual { order:0; } }
`}} />
    </PlayfulShell>
  );
}
