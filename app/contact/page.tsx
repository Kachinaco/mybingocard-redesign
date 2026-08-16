import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Contact support",
};

export default function ContactPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail">
          <div class="article-layout">
            <div>
              
      <div class="page-heading">
        <span class="eyebrow">Support</span>
        <h1 tabindex="-1">Contact support</h1>
        <p>Ways to contact MyBingoCard with product, account, billing, or content questions.</p>
        
      </div>
    
              <form class="form card card-body" data-demo-form="message" novalidate>
                <div class="field-row"><div class="field"><label for="contact-name">Name</label><input class="text-input" id="contact-name" autocomplete="name" required></div><div class="field"><label for="contact-email">Email address</label><input class="text-input" id="contact-email" name="email" type="email" autocomplete="email" spellcheck="false" required placeholder="name@example.com"></div></div>
                <div class="field"><label for="contact-topic">Topic</label><select class="select-input" id="contact-topic"><option>Making a card</option><option>Sharing or playing</option><option>Account or billing</option><option>Report a problem</option></select></div>
                <div class="field"><label for="contact-message">How can we help?</label><textarea class="textarea-input" id="contact-message" required placeholder="Include the page and what you expected to happen."></textarea></div>
                <button class="button button-primary" type="submit">Preview support request</button>
                <p class="notice notice-success" data-form-status hidden></p>
              </form>
            </div>
            <aside class="card-soft article-aside"><h2>Quick help</h2><a href="/how-to-play-bingo" data-route class="">Read how to play</a><a href="/features" data-route class="">Explore product features</a><a href="/settings" data-route class="">Open account settings</a><p class="caption">This local form does not send a message.</p></aside>
          </div>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
