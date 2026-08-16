import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Bingo games",
};

export default function Bingo_gamesPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail stack">
          
      <div class="page-heading">
        <span class="eyebrow">Ideas for every group</span>
        <h1 tabindex="-1">Bingo games</h1>
        <p>A browsable collection of bingo formats for classrooms, parties, showers, work, and events.</p>
        
      </div>
    
          <div class="toolbar">
            <label class="search-field">
              <span class="sr-only">Search bingo games</span>
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
              <input class="text-input" type="search" data-catalog-search placeholder="Classroom, wedding, team…">
            </label>
            <div class="segmented" aria-label="Catalog filter">
              <button type="button" aria-pressed="true">All</button>
              <button type="button" aria-pressed="false">Events</button>
              <button type="button" aria-pressed="false">Education</button>
            </div>
          </div>
          <div class="template-grid" data-catalog-grid>
            
                <a class="card-soft template-card" href="/ai-bingo-card-generator" data-route data-catalog-item="ai bingo card generator">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🎉</span></div>
                  <div class="stack-tight"><h3>AI bingo card generator</h3><p class="muted">Generate bingo-card ideas with AI, then customize the resulting squares and design.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/baby-prediction-bingo" data-route data-catalog-item="baby prediction bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">📚</span></div>
                  <div class="stack-tight"><h3>Baby prediction bingo</h3><p class="muted">Prediction-card ideas for due dates, baby traits, names, and first milestones.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/baby-shower-bingo" data-route data-catalog-item="baby shower bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">💍</span></div>
                  <div class="stack-tight"><h3>Baby shower bingo</h3><p class="muted">Printable and online bingo cards for baby-shower guests and activities.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/baby-shower-gift-bingo" data-route data-catalog-item="baby shower gift bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🎄</span></div>
                  <div class="stack-tight"><h3>Baby shower gift bingo</h3><p class="muted">Gift-opening bingo built around common baby items and registry surprises.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/back-to-school-bingo" data-route data-catalog-item="back-to-school bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">💻</span></div>
                  <div class="stack-tight"><h3>Back-to-school bingo</h3><p class="muted">First-week classroom bingo for names, routines, supplies, and student icebreakers.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/bingo-board-generator" data-route data-catalog-item="bingo board generator">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🎵</span></div>
                  <div class="stack-tight"><h3>Bingo board generator</h3><p class="muted">Create printable or online bingo boards with custom words, images, and grid sizes.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/birthday-bingo" data-route data-catalog-item="birthday bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🎉</span></div>
                  <div class="stack-tight"><h3>Birthday bingo</h3><p class="muted">Custom birthday bingo cards for children, adults, milestones, and family celebrations.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/bridal-shower-bingo" data-route data-catalog-item="bridal shower bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">📚</span></div>
                  <div class="stack-tight"><h3>Bridal shower bingo</h3><p class="muted">Celebration bingo for bridal showers, brunches, gifts, and wedding parties.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/bridal-shower-gift-bingo" data-route data-catalog-item="bridal shower gift bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">💍</span></div>
                  <div class="stack-tight"><h3>Bridal shower gift bingo</h3><p class="muted">Gift-opening bingo prompts for bridal showers and wedding celebrations.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/christmas-party-bingo" data-route data-catalog-item="christmas party bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🎄</span></div>
                  <div class="stack-tight"><h3>Christmas party bingo</h3><p class="muted">Festive bingo for Christmas parties, family gatherings, and seasonal events.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/church-bingo" data-route data-catalog-item="church bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">💻</span></div>
                  <div class="stack-tight"><h3>Church bingo</h3><p class="muted">Custom bingo-card ideas for church groups, ministries, and community events.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/classroom-bingo" data-route data-catalog-item="classroom bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🎵</span></div>
                  <div class="stack-tight"><h3>Classroom bingo</h3><p class="muted">Flexible classroom bingo for lessons, review activities, and student participation.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/conference-bingo" data-route data-catalog-item="conference bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🎉</span></div>
                  <div class="stack-tight"><h3>Conference bingo</h3><p class="muted">Attendee bingo for sessions, booths, networking, and keynote moments.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/custom-bingo-card-maker" data-route data-catalog-item="custom bingo card maker">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">📚</span></div>
                  <div class="stack-tight"><h3>Custom bingo card maker</h3><p class="muted">Design personalized bingo cards with custom squares, grid sizes, colors, and themes.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/end-of-year-bingo" data-route data-catalog-item="end-of-year bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">💍</span></div>
                  <div class="stack-tight"><h3>End-of-year bingo</h3><p class="muted">A classroom wrap-up activity for memories, milestones, review, and celebration.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/esl-bingo-generator" data-route data-catalog-item="esl bingo generator">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🎄</span></div>
                  <div class="stack-tight"><h3>ESL bingo generator</h3><p class="muted">Language-practice bingo for ESL vocabulary, listening, speaking, and conversation.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/family-reunion-bingo" data-route data-catalog-item="family reunion bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">💻</span></div>
                  <div class="stack-tight"><h3>Family reunion bingo</h3><p class="muted">Conversation-starting bingo cards for reunions, picnics, and family weekends.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
                <a class="card-soft template-card" href="/fundraiser-bingo" data-route data-catalog-item="fundraiser bingo">
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🎵</span></div>
                  <div class="stack-tight"><h3>Fundraiser bingo</h3><p class="muted">Printable and hosted bingo for auctions, raffles, schools, and benefit events.</p><span class="eyebrow">Explore this game →</span></div>
                </a>
              
          </div>
          <p class="caption" data-catalog-status role="status">18 starting points shown</p>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
