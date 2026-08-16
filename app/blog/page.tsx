import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Bingo ideas, tips & guides",
};

export default function BlogPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
        <section class="page-section">
          <div class="content-rail">
            
      <div class="page-heading">
        <span class="eyebrow">Ideas that help the game work</span>
        <h1 tabindex="-1">Bingo ideas, tips &amp; guides</h1>
        <p>The long-form article library for making, printing, and hosting bingo games.</p>
        
      </div>
    
            <div class="template-grid">
              
                <a class="card-soft template-card" href="/blog/best-bingo-card-generator" data-route>
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🧠</span></div>
                  <span class="pill">Planning</span>
                  <h2 style="font-size:1.25rem">How to choose the best bingo card generator</h2>
                  <p class="muted">A first-party comparison guide covering print, online play, customization, and pricing.</p>
                  <span class="eyebrow">Read article →</span>
                </a>
              
                <a class="card-soft template-card" href="/blog/best-bingo-games-baby-showers" data-route>
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🍼</span></div>
                  <span class="pill">Guide</span>
                  <h2 style="font-size:1.25rem">The 7 best bingo games for baby showers</h2>
                  <p class="muted">Creative gift, prediction, and guest bingo variations for baby showers.</p>
                  <span class="eyebrow">Read article →</span>
                </a>
              
                <a class="card-soft template-card" href="/blog/fun-classroom-bingo-ideas" data-route>
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">📚</span></div>
                  <span class="pill">Planning</span>
                  <h2 style="font-size:1.25rem">15 fun classroom bingo ideas</h2>
                  <p class="muted">Classroom bingo ideas for vocabulary, math, science, and student participation.</p>
                  <span class="eyebrow">Read article →</span>
                </a>
              
                <a class="card-soft template-card" href="/blog/holiday-bingo-ideas" data-route>
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🎄</span></div>
                  <span class="pill">Guide</span>
                  <h2 style="font-size:1.25rem">20+ holiday bingo ideas</h2>
                  <p class="muted">Seasonal bingo ideas for Christmas, Hanukkah, New Year, and winter celebrations.</p>
                  <span class="eyebrow">Read article →</span>
                </a>
              
                <a class="card-soft template-card" href="/blog/how-to-make-custom-bingo-cards" data-route>
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">✏️</span></div>
                  <span class="pill">Planning</span>
                  <h2 style="font-size:1.25rem">How to make custom bingo cards</h2>
                  <p class="muted">A step-by-step guide to planning, designing, and preparing personalized cards.</p>
                  <span class="eyebrow">Read article →</span>
                </a>
              
                <a class="card-soft template-card" href="/blog/party-bingo-tips" data-route>
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">🎉</span></div>
                  <span class="pill">Guide</span>
                  <h2 style="font-size:1.25rem">How to run the perfect party bingo game</h2>
                  <p class="muted">Hosting advice for setup, calling, prizes, pacing, and keeping guests involved.</p>
                  <span class="eyebrow">Read article →</span>
                </a>
              
                <a class="card-soft template-card" href="/blog/wedding-bingo-guide" data-route>
                  <div class="template-preview"><span class="template-emoji" aria-hidden="true">💍</span></div>
                  <span class="pill">Planning</span>
                  <h2 style="font-size:1.25rem">The ultimate wedding bingo guide</h2>
                  <p class="muted">Planning guidance, square ideas, printing tips, and reception-play advice.</p>
                  <span class="eyebrow">Read article →</span>
                </a>
              
            </div>
          </div>
        </section>
      `
      }} />
    </PlayfulShell>
  );
}
