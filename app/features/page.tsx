import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Features",
};

export default function FeaturesPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
        <section class="page-section">
          <div class="content-rail">
            
      <div class="page-heading">
        <span class="eyebrow">Product tour</span>
        <h1 tabindex="-1">Features</h1>
        <p>An overview of card creation, customization, printing, sharing, and hosted-game capabilities.</p>
        
      </div>
    
            <div class="feature-grid">
              
      <article class="card-soft feature-card">
        <span class="feature-icon" aria-hidden="true">🧩</span>
        <h3>Flexible card maker</h3>
        <p class="muted">Choose grids, themes, words, images, and a free center without losing your draft.</p>
      </article>
    
              
      <article class="card-soft feature-card">
        <span class="feature-icon" aria-hidden="true">💾</span>
        <h3>A clear card library</h3>
        <p class="muted">Return to drafts, recently played cards, and shared games from one dashboard.</p>
      </article>
    
              
      <article class="card-soft feature-card">
        <span class="feature-icon" aria-hidden="true">🖨️</span>
        <h3>PDF and PNG exports</h3>
        <p class="muted">Preview printable cards before choosing individual or paid batch downloads.</p>
      </article>
    
              
      <article class="card-soft feature-card">
        <span class="feature-icon" aria-hidden="true">🔗</span>
        <h3>Private sharing</h3>
        <p class="muted">Control whether a card is private, link-accessible, or claimed by a guest.</p>
      </article>
    
              
      <article class="card-soft feature-card">
        <span class="feature-icon" aria-hidden="true">📣</span>
        <h3>Live game hosting</h3>
        <p class="muted">Invite players, call squares, verify winners, and finish the room clearly.</p>
      </article>
    
              
      <article class="card-soft feature-card">
        <span class="feature-icon" aria-hidden="true">📱</span>
        <h3>Designed for phones</h3>
        <p class="muted">Edit, preview, join, and play without squeezing the board beside the controls.</p>
      </article>
    
            </div>
            <div class="card card-body surface-purple" style="margin-block-start:32px">
              <div class="page-heading" style="margin:0">
                <h2>Start with the card, not a setup checklist</h2>
                <p>You can begin as a guest. Account and payment decisions appear only when they add a useful capability.</p>
                <div class="button-row"><a href="/create" data-route class="button button-primary">Create a card</a><a href="/pricing" data-route class="button">Compare plans</a></div>
              </div>
            </div>
          </div>
        </section>
      `
      }} />
    </PlayfulShell>
  );
}
