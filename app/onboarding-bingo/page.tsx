import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Onboarding bingo",
};

export default function Onboarding_bingoPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="hero">
        <div class="content-rail hero-grid">
          <div class="hero-copy">
            <nav class="breadcrumbs" aria-label="Breadcrumbs"><a href="/" data-route class="">Home</a><span aria-hidden="true">/</span><a href="/bingo-games" data-route class="">Bingo games</a><span aria-hidden="true">/</span><span>Onboarding bingo</span></nav>
            <span class="pill pill-local">Teams and work</span>
            <h1>Onboarding bingo</h1>
            <p>Interactive onboarding prompts for tools, people, policies, and first-week milestones.</p>
            <div class="button-row">
              <a href="/create?templateId=onboarding-bingo" data-route class="button button-primary">Make this card <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M14 7l5 5-5 5"/></svg></a>
              <a href="/templates" data-route class="button">Browse templates</a>
            </div>
          </div>
          <div class="card hero-card surface-yellow">
      <div class="bingo-card" data-bingo-preview>
        <div class="bingo-card-title">
          <strong data-preview-title>Onboarding bingo</strong>
          <span class="pill">Let’s play!</span>
        </div>
        <div class="bingo-head" style="grid-template-columns:repeat(5,minmax(0,1fr))">
          <span class="bingo-letter">B</span><span class="bingo-letter">I</span><span class="bingo-letter">N</span><span class="bingo-letter">G</span><span class="bingo-letter">O</span>
        </div>
        <div class="bingo-grid" style="grid-template-columns:repeat(5,minmax(0,1fr))" data-preview-grid>
          <span class="bingo-cell">Cake</span><span class="bingo-cell">Balloon</span><span class="bingo-cell">Gift</span><span class="bingo-cell">Dance</span><span class="bingo-cell">Photo</span><span class="bingo-cell">Music</span><span class="bingo-cell">Games</span><span class="bingo-cell">Candles</span><span class="bingo-cell">Toast</span><span class="bingo-cell">Party hat</span><span class="bingo-cell">Confetti</span><span class="bingo-cell">Prize</span><span class="bingo-cell is-free">FREE</span><span class="bingo-cell">Snack</span><span class="bingo-cell">Cheer</span><span class="bingo-cell">Selfie</span><span class="bingo-cell">Decor</span><span class="bingo-cell">Laugh</span><span class="bingo-cell">Make a wish</span><span class="bingo-cell">Birthday card</span><span class="bingo-cell">Guest</span><span class="bingo-cell">Favorite song</span><span class="bingo-cell">Sweet treat</span><span class="bingo-cell">Big hug</span><span class="bingo-cell">Surprise</span>
        </div>
        <p class="caption" style="text-align:center">Mark 5 in a row to win · local prototype</p>
      </div>
    </div>
        </div>
      </section>
      <section class="page-section">
        <div class="content-rail">
          <div class="feature-grid">
            
      <article class="card-soft feature-card">
        <span class="feature-icon" aria-hidden="true">1</span>
        <h3>Choose a useful starting point</h3>
        <p class="muted">Begin with prompts shaped for onboarding bingo, then replace anything that does not fit your group.</p>
      </article>
    
            
      <article class="card-soft feature-card">
        <span class="feature-icon" aria-hidden="true">2</span>
        <h3>Make every square yours</h3>
        <p class="muted">Add names, images, inside jokes, vocabulary, predictions, or moments people can actually notice.</p>
      </article>
    
            
      <article class="card-soft feature-card">
        <span class="feature-icon" aria-hidden="true">3</span>
        <h3>Print, share, or host</h3>
        <p class="muted">Preview the finished card before choosing paper copies, player links, or a live room.</p>
      </article>
    
          </div>
        </div>
      </section>
      <section class="page-section surface-purple">
        <div class="content-rail article-layout">
          <article class="article-body">
            <span class="eyebrow">Make it work for your group</span>
            <h2>What belongs on a onboarding bingo card?</h2>
            <p>Use a mix of easy wins and delightful surprises. Familiar squares help everyone begin; a few specific prompts make the card feel designed for this exact gathering.</p>
            <h2>Keep the instructions short</h2>
            <p>Tell players what to notice, how many squares make a win, and whether a free center counts. Put any event-specific rule near the card instead of hiding it in an email.</p>
            <h2>Preview on the device people will use</h2>
            <p>Paper cards need comfortable cell sizes. Phone players need short labels and generous touch targets. The redesigned creator keeps editing and preview modes separate on narrow screens.</p>
          </article>
          <aside class="card-soft article-aside">
            <h3>Quick setup</h3>
            <ul class="check-list"><li>Pick a grid size</li><li>Add your square ideas</li><li>Choose a readable theme</li><li>Preview before sharing</li></ul>
            <a href="/create" data-route class="button button-primary button-small">Start this card</a>
          </aside>
        </div>
      </section>
      <section class="page-section">
        <div class="content-rail">
          <div class="page-heading"><span class="eyebrow">Keep exploring</span><h2>Related bingo ideas</h2></div>
          <div class="template-grid">
            <a class="card-soft template-card" href="/conference-bingo" data-route><span class="template-emoji" aria-hidden="true">✨</span><h3>Conference bingo</h3><p class="muted">Attendee bingo for sessions, booths, networking, and keynote moments.</p></a>
          
            <a class="card-soft template-card" href="/office-meeting-bingo" data-route><span class="template-emoji" aria-hidden="true">✨</span><h3>Office meeting bingo</h3><p class="muted">Light meeting bingo for recurring phrases, remote calls, and team rituals.</p></a>
          
            <a class="card-soft template-card" href="/office-party-bingo" data-route><span class="template-emoji" aria-hidden="true">✨</span><h3>Office party bingo</h3><p class="muted">Party bingo for holiday lunches, team events, and workplace celebrations.</p></a>
          </div>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
