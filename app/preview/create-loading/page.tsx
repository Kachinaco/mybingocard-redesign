import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Loading the card creator",
};

export default function PreviewCreate_loadingPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
        
      <header class="app-page-head">
        <div class="app-page-head-copy">
          <span class="eyebrow">Workspace</span>
          <h1 tabindex="-1">Loading the card creator</h1>
          <p>A local preview of the creator&#039;s initial loading skeleton.</p>
        </div>
        
      </header>
    
        <div class="creator-workspace" aria-label="Loading creator preview">
          <section class="card editor-card skeleton-card"><span class="skeleton-line short"></span><span class="skeleton-line title"></span><span class="skeleton-block"></span><span class="skeleton-block"></span><span class="skeleton-block"></span><span class="skeleton-block"></span><span class="skeleton-block"></span></section>
          <aside class="card preview-card skeleton-card"><span class="skeleton-line short"></span><span class="skeleton-line title"></span><span class="skeleton-board"></span></aside>
        </div>
      `
      }} />
    </PlayfulShell>
  );
}
