import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Bingo card maker",
};

export default function HomePage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="hero">
        <div class="content-rail hero-grid">
          <div class="hero-copy">
            <span class="pill pill-local">★ Free to make · ready for every occasion</span>
            <h1>Bingo cards as <span class="hero-highlight">fun</span> as your people</h1>
            <p>Create custom bingo cards with your own words or pictures. Print them, share a link, or host a live game from one friendly workspace.</p>
            <div class="button-row">
              <a href="/create" data-route class="button button-primary">Create a free card <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M14 7l5 5-5 5"/></svg></a>
              <a href="/templates" data-route class="button"><span class="label-wide">Browse templates</span><span class="label-compact">Templates</span></a>
            </div>
            <div class="trust-row" aria-label="Product highlights">
              <span>✓ No account to start</span>
              <span>✓ Print or play online</span>
              <span>✓ Phone-friendly</span>
            </div>
          </div>
          <div class="card hero-card surface-purple" aria-label="Interactive bingo card example">
            
      <div class="bingo-card" data-bingo-preview>
        <div class="bingo-card-title">
          <strong data-preview-title>Birthday party bingo</strong>
          <span class="pill">Let’s play!</span>
        </div>
        <div class="bingo-head" style="grid-template-columns:repeat(5,minmax(0,1fr))">
          <span class="bingo-letter">B</span><span class="bingo-letter">I</span><span class="bingo-letter">N</span><span class="bingo-letter">G</span><span class="bingo-letter">O</span>
        </div>
        <div class="bingo-grid" style="grid-template-columns:repeat(5,minmax(0,1fr))" data-preview-grid>
          <button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="0" aria-pressed="false">Cake</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="1" aria-pressed="false">Balloon</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="2" aria-pressed="false">Gift</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="3" aria-pressed="false">Dance</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="4" aria-pressed="false">Photo</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="5" aria-pressed="false">Music</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="6" aria-pressed="false">Games</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="7" aria-pressed="false">Candles</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="8" aria-pressed="false">Toast</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="9" aria-pressed="false">Party hat</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="10" aria-pressed="false">Confetti</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="11" aria-pressed="false">Prize</button><button class="bingo-cell is-free" type="button" data-action="mark-cell" data-cell-index="12" aria-pressed="true">FREE</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="13" aria-pressed="false">Snack</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="14" aria-pressed="false">Cheer</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="15" aria-pressed="false">Selfie</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="16" aria-pressed="false">Decor</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="17" aria-pressed="false">Laugh</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="18" aria-pressed="false">Make a wish</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="19" aria-pressed="false">Birthday card</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="20" aria-pressed="false">Guest</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="21" aria-pressed="false">Favorite song</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="22" aria-pressed="false">Sweet treat</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="23" aria-pressed="false">Big hug</button><button class="bingo-cell" type="button" data-action="mark-cell" data-cell-index="24" aria-pressed="false">Surprise</button>
        </div>
        <p class="caption" style="text-align:center">Mark 5 in a row to win · local prototype</p>
      </div>
    
          </div>
        </div>
      </section>
      <section class="page-section surface-yellow">
        <div class="content-rail">
          <div class="page-heading">
            <span class="eyebrow">One idea, three ways to play</span>
            <h2>Make it once. Use it your way.</h2>
            <p>Start quickly, then decide whether your group needs paper cards, a shared link, or a hosted live room.</p>
          </div>
          <div class="feature-grid">
            
      <article class="card-soft feature-card">
        <span class="feature-icon" aria-hidden="true">✏️</span>
        <h3>Make it yours</h3>
        <p class="muted">Use words, images, free spaces, and 3×3, 4×4, or 5×5 layouts.</p>
      </article>
    
            
      <article class="card-soft feature-card">
        <span class="feature-icon" aria-hidden="true">🖨️</span>
        <h3>Print beautifully</h3>
        <p class="muted">Preview cards clearly before generating PDF or PNG copies.</p>
      </article>
    
            
      <article class="card-soft feature-card">
        <span class="feature-icon" aria-hidden="true">🎉</span>
        <h3>Play together</h3>
        <p class="muted">Share one card, send unique player links, or host a live calling room.</p>
      </article>
    
          </div>
        </div>
      </section>
      <section class="page-section">
        <div class="content-rail">
          <div class="page-heading">
            <span class="eyebrow">Popular starting points</span>
            <h2>Pick a theme and make it personal</h2>
          </div>
          <div class="template-grid">
            
      <a class="card-soft template-card" href="/create?templateId=birthday" data-route>
        <div class="template-preview">
          <span class="template-emoji" aria-hidden="true">🎂</span>
        </div>
        <div class="stack-tight">
          <h3>Birthday party bingo</h3>
          <p class="muted">Cake, candles, music, guests, and party moments.</p>
          <span class="eyebrow">Use this template →</span>
        </div>
      </a>
    
      <a class="card-soft template-card" href="/create?templateId=baby" data-route>
        <div class="template-preview">
          <span class="template-emoji" aria-hidden="true">🍼</span>
        </div>
        <div class="stack-tight">
          <h3>Baby shower bingo</h3>
          <p class="muted">Gifts, predictions, advice, and shower traditions.</p>
          <span class="eyebrow">Use this template →</span>
        </div>
      </a>
    
      <a class="card-soft template-card" href="/create?templateId=classroom" data-route>
        <div class="template-preview">
          <span class="template-emoji" aria-hidden="true">✏️</span>
        </div>
        <div class="stack-tight">
          <h3>Classroom bingo</h3>
          <p class="muted">Vocabulary, review prompts, routines, and rewards.</p>
          <span class="eyebrow">Use this template →</span>
        </div>
      </a>
    
          </div>
          <div class="button-row" style="margin-block-start:24px">
            <a href="/templates" data-route class="button">Explore all templates</a>
          </div>
        </div>
      </section>
      <section class="page-section surface-teal">
        <div class="content-rail card card-body">
          <div class="page-heading" style="margin:0">
            <span class="eyebrow">Ready when you are</span>
            <h2>Turn your next gathering into a game</h2>
            <p>Make the first card now. You can choose how to save, share, or play after the preview looks right.</p>
            <div class="button-row">
              <a href="/create" data-route class="button button-primary">Make a card now</a>
              <a href="/pricing" data-route class="button">Compare ways to play</a>
            </div>
          </div>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
