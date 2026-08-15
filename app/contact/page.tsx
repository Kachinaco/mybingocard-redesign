import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Contact — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">Contact</span>
  <h1>We actually answer</h1>
  <p>Questions, template requests, teacher discounts, or just a great bingo story — all welcome.</p>
</header>

<div class="section section-tight">
  <div class="split" style="align-items:start;">
    <div class="auth-card" style="max-width:none;">
      <div class="field">
        <label for="name">Your name</label>
        <input class="input" id="name" type="text" placeholder="Sam Party-Host">
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input class="input" id="email" type="email" placeholder="you@example.com">
        <p class="form-hint">We reply within one business day, usually faster.</p>
      </div>
      <div class="field">
        <label for="topic">What's this about?</label>
        <select class="input" id="topic">
          <option>General question</option>
          <option>Help with a card or game</option>
          <option>Teacher / nonprofit discount</option>
          <option>Billing question</option>
          <option>Template request</option>
          <option>Something else</option>
        </select>
      </div>
      <div class="field">
        <label for="msg">Message</label>
        <textarea class="textarea" id="msg" placeholder="Tell us what's up..."></textarea>
      </div>
      <button class="btn btn-block" type="button">Send message</button>
    </div>

    <div>
      <div class="card">
        <h3>⚡ Fastest answers</h3>
        <p>Most questions are covered in the <a href="/how-to-play-bingo">how to play guide</a> and the <a href="/pricing">pricing FAQ</a>.</p>
      </div>
      <div class="card mt-16">
        <h3>🏫 Teachers &amp; nonprofits</h3>
        <p>Email from your school or organization address and mention your plan — we'll apply the 50% discount within a day.</p>
      </div>
      <div class="card mt-16">
        <h3>💳 Billing</h3>
        <p>Signed-in users can manage plans, invoices, and cancellations straight from the <a href="/dashboard">dashboard</a> — no email needed.</p>
      </div>
      <div class="card mt-16" style="background:#efeaff;">
        <h3>🎉 Share your game</h3>
        <p>Tag us with photos of your bingo night. Our favorite cards get added to the template gallery (with permission, of course).</p>
      </div>
    </div>
  </div>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
