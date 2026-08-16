import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Bingo card templates",
};

export default function TemplatesPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail stack">
          
      <div class="page-heading">
        <span class="eyebrow">Ready-to-edit starting points</span>
        <h1 tabindex="-1">Bingo card templates</h1>
        <p>A searchable and filterable gallery of ready-to-edit bingo card starting points.</p>
        
      </div>
    
          <div class="toolbar">
            <label class="search-field">
              <span class="sr-only">Search templates</span>
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
              <input class="text-input" type="search" data-catalog-search placeholder="Birthday, classroom, holiday…">
            </label>
            <div class="segmented" aria-label="Catalog filter">
              <button type="button" aria-pressed="true">All</button>
              <button type="button" aria-pressed="false">Events</button>
              <button type="button" aria-pressed="false">Education</button>
            </div>
          </div>
          <div class="template-grid" data-catalog-grid>
            
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
    
      <a class="card-soft template-card" href="/create?templateId=meeting" data-route>
        <div class="template-preview">
          <span class="template-emoji" aria-hidden="true">💻</span>
        </div>
        <div class="stack-tight">
          <h3>Meeting bingo</h3>
          <p class="muted">Friendly workplace icebreakers and familiar phrases.</p>
          <span class="eyebrow">Use this template →</span>
        </div>
      </a>
    
      <a class="card-soft template-card" href="/create?templateId=wedding" data-route>
        <div class="template-preview">
          <span class="template-emoji" aria-hidden="true">💍</span>
        </div>
        <div class="stack-tight">
          <h3>Wedding reception bingo</h3>
          <p class="muted">Speeches, dancing, photos, and reception moments.</p>
          <span class="eyebrow">Use this template →</span>
        </div>
      </a>
    
      <a class="card-soft template-card" href="/create?templateId=holiday" data-route>
        <div class="template-preview">
          <span class="template-emoji" aria-hidden="true">🎁</span>
        </div>
        <div class="stack-tight">
          <h3>Holiday bingo</h3>
          <p class="muted">Seasonal traditions, treats, songs, and surprises.</p>
          <span class="eyebrow">Use this template →</span>
        </div>
      </a>
    
          </div>
          <p class="caption" data-catalog-status role="status">6 starting points shown</p>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
