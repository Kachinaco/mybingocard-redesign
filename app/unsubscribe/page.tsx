import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Email preferences",
};

export default function UnsubscribePage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
        <section class="page-section">
          <div class="content-rail">
            <div class="auth-card card card-body">
              
      <label class="workflow-state-picker">
        <span>Preview workflow state</span>
        <select class="select-input" data-state-route="/unsubscribe" aria-label="Preview workflow state">
          <option value="form" selected>Email preferences</option><option value="success">Preferences saved</option><option value="error">Could not update</option>
        </select>
        <small>The unsubscribe and email-preference form.</small>
      </label>
    
              <span class="empty-icon" aria-hidden="true">✉️</span>
              
      <div class="page-heading">
        <span class="eyebrow">Email preferences</span>
        <h1 tabindex="-1">Choose which messages you receive</h1>
        <p>A confirmation and control surface for opting out of eligible email.</p>
        
      </div>
    <div class="settings-list"><label class="settings-row"><span class="settings-copy"><strong>Account and security</strong><span class="caption">Required messages about sign-in and account safety.</span></span><input type="checkbox" checked aria-label="Account and security"></label><label class="settings-row"><span class="settings-copy"><strong>Card reminders</strong><span class="caption">Helpful reminders about unfinished cards.</span></span><input type="checkbox"  aria-label="Card reminders"></label><label class="settings-row"><span class="settings-copy"><strong>Ideas and product news</strong><span class="caption">Occasional bingo ideas and new features.</span></span><input type="checkbox"  aria-label="Ideas and product news"></label></div><a href="/unsubscribe?state=success" data-route class="button button-primary">Save preferences</a><p class="caption"><a href="/unsubscribe?state=error" data-route class="">Preview an invalid or expired link</a></p>
            </div>
          </div>
        </section>
      `
      }} />
    </PlayfulShell>
  );
}
