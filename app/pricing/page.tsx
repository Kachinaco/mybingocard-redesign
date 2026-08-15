import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Pricing — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">Pricing</span>
  <h1>Free for fun. Paid for <span class="squiggle">big games</span>.</h1>
  <p>Make and print cards without paying a cent. Upgrade when you're hosting a crowd or want the fancy extras.</p>
</header>

<div class="section section-tight">
  <div class="grid-3" style="align-items:stretch;">
    <div class="card price-card">
      <span class="pill pill-teal">Free</span>
      <div class="price">$0<small> forever</small></div>
      <p>For casual games and quick prints.</p>
      <ul class="check-list">
        <li>Unlimited card creation</li>
        <li>3×3, 4×4, and 5×5 grids</li>
        <li>Free PDF &amp; PNG export</li>
        <li>Share links for up to 30 players</li>
        <li>All starter templates</li>
      </ul>
      <a class="btn btn-white" href="/create">Start free</a>
    </div>

    <div class="card price-card featured">
      <span class="pill pill-pink plan-tag">Most popular</span>
      <span class="pill pill-yellow">Party</span>
      <div class="price">$6<small> /month</small></div>
      <p>For hosts who run games regularly.</p>
      <ul class="check-list">
        <li>Everything in Free</li>
        <li>Host live games, up to 100 players</li>
        <li>Picture bingo uploads</li>
        <li>Custom colors &amp; fonts</li>
        <li>AI square brainstormer</li>
        <li>No watermark on exports</li>
      </ul>
      <a class="btn" href="/signup">Start Party</a>
    </div>

    <div class="card price-card">
      <span class="pill pill-purple">Pro</span>
      <div class="price">$15<small> /month</small></div>
      <p>For teachers, venues, and event pros.</p>
      <ul class="check-list">
        <li>Everything in Party</li>
        <li>Host games up to 500 players</li>
        <li>Bulk card generation</li>
        <li>Saved card library &amp; folders</li>
        <li>Classroom &amp; team workspaces</li>
        <li>Priority support</li>
      </ul>
      <a class="btn btn-white" href="/signup">Start Pro</a>
    </div>
  </div>

  <div class="mt-24">
    <div class="sec-head"><span class="k">Compare</span><h2>What's in each plan</h2></div>
    <div class="tbl-wrap">
      <table class="tbl">
        <tr><th>Feature</th><th>Free</th><th>Party</th><th>Pro</th></tr>
        <tr><td><strong>Card creation</strong></td><td>Unlimited</td><td>Unlimited</td><td>Unlimited</td></tr>
        <tr><td><strong>PDF / PNG export</strong></td><td>✓</td><td>✓ no watermark</td><td>✓ no watermark</td></tr>
        <tr><td><strong>Share-link players</strong></td><td>30</td><td>100</td><td>500</td></tr>
        <tr><td><strong>Live hosted games</strong></td><td>—</td><td>✓</td><td>✓</td></tr>
        <tr><td><strong>Picture bingo</strong></td><td>—</td><td>✓</td><td>✓</td></tr>
        <tr><td><strong>Custom colors &amp; fonts</strong></td><td>—</td><td>✓</td><td>✓</td></tr>
        <tr><td><strong>Saved library &amp; folders</strong></td><td>—</td><td>10 cards</td><td>Unlimited</td></tr>
        <tr><td><strong>Bulk generation</strong></td><td>—</td><td>—</td><td>✓</td></tr>
        <tr><td><strong>Workspaces</strong></td><td>—</td><td>—</td><td>✓</td></tr>
      </table>
    </div>
  </div>

  <div class="mt-24 faq">
    <div class="sec-head"><span class="k">Questions</span><h2>Pricing FAQ</h2></div>
    <details>
      <summary>Is the free plan really free?</summary>
      <p>Yes — create cards, export PDFs and PNGs, and share with up to 30 players without a credit card, forever.</p>
    </details>
    <details>
      <summary>Can I cancel anytime?</summary>
      <p>Yep. Plans are month-to-month and you can cancel from your dashboard in two clicks. You keep paid features until the end of the billing period.</p>
    </details>
    <details>
      <summary>Do players need accounts?</summary>
      <p>No. Anyone with your share link gets a shuffled card on their phone instantly — no sign-up, no app required.</p>
    </details>
    <details>
      <summary>Is there a discount for teachers?</summary>
      <p>Teachers and registered nonprofits get Pro at half price. Reach out from your school or org email and we'll set it up.</p>
    </details>
  </div>
</div>

<div class="cta-band">
  <h2>Start with free. Upgrade when the party grows.</h2>
  <p>No credit card needed to make your first card.</p>
  <a class="btn btn-yellow" href="/create">Create a free card</a>
</div>



`,
      }} />
      <style dangerouslySetInnerHTML={{__html: `
  .price-card { position:relative; display:flex; flex-direction:column; }
  .price-card.featured { border-color:var(--ink); box-shadow:0 8px 0 var(--ink); transform:rotate(-.5deg); }
  .price-card .plan-tag { position:absolute; top:-14px; left:50%; transform:translateX(-50%) rotate(-2deg); }
  .price { font-family:'Fredoka'; font-weight:700; font-size:clamp(34px,5vw,44px); margin:6px 0 2px; }
  .price small { font-size:14px; font-weight:600; color:var(--mut); }
  .price-card .btn { margin-top:auto; }
  .price-card ul { margin:18px 0 22px; }
`}} />
    </PlayfulShell>
  );
}
