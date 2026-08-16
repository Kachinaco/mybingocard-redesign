import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <section class="page-section">
        <div class="content-rail">
          
      <label class="workflow-state-picker">
        <span>Preview workflow state</span>
        <select class="select-input" data-state-route="/pricing" aria-label="Preview workflow state">
          <option value="compare" selected>Plan comparison</option><option value="current-free">Current free plan</option><option value="success">Checkout success</option><option value="canceled">Checkout canceled</option>
        </select>
        <small>Free, Premium, Lifetime, and one-time batch choices.</small>
      </label>
    
          
          
      <div class="page-heading">
        <span class="eyebrow">Simple choices</span>
        <h1 tabindex="-1">Start free. Upgrade when sharing gets bigger.</h1>
        <p>Make individual cards at no cost, then choose account or batch options only when they fit the event.</p>
        
      </div>
    
          <div class="pricing-grid">
            
      <article class="card pricing-card">
        
        <h3>Free</h3>
        <p class="price">\$0</p>
        <p class="muted">For complete individual card creation</p>
        <ul class="check-list"><li>All templates, images, and AI ideas</li><li>One saved card</li><li>Individual PDF and PNG exports</li></ul>
        <button class="button " type="button" data-action="show-checkout">Preview Free</button>
      </article>
    
            
      <article class="card pricing-card is-featured">
        <span class="pill pill-purple">Most flexible</span>
        <h3>Premium</h3>
        <p class="price">\$7.99<small> / month</small></p>
        <p class="muted">For regular group organizers</p>
        <ul class="check-list"><li>Unlimited saved cards</li><li>Printable batches up to 500 cards</li><li>Player links and hosted live rooms</li></ul>
        <button class="button button-primary" type="button" data-action="show-checkout">Preview Premium</button>
      </article>
    
            
      <article class="card pricing-card">
        
        <h3>Lifetime</h3>
        <p class="price">\$29.99</p>
        <p class="muted">Permanent access to paid group tools</p>
        <ul class="check-list"><li>Everything in Premium</li><li>One-time purchase</li><li>No monthly renewal</li></ul>
        <button class="button " type="button" data-action="show-checkout">Preview Lifetime</button>
      </article>
    
          </div>
          <section class="card card-body surface-yellow" style="margin-block-start:38px">
            <div class="page-heading" style="margin:0">
              <span class="eyebrow">One-time printable batch packs</span>
              <h2>Need unique cards for one event?</h2>
              <p>Buy only the printable set you need. Player-link sharing is separate; Premium and Lifetime include eligible batches, direct sharing, and hosted rooms.</p>
              <div class="batch-tier-grid"><a href="/create?state=batch&amp;batchCount=30" data-route class="card-soft batch-tier"><strong>30 cards</strong><span>\$1.99</span></a><a href="/create?state=batch&amp;batchCount=100" data-route class="card-soft batch-tier"><strong>100 cards</strong><span>\$9.99</span></a><a href="/create?state=batch&amp;batchCount=250" data-route class="card-soft batch-tier"><strong>250 cards</strong><span>\$19.99</span></a><a href="/create?state=batch&amp;batchCount=500" data-route class="card-soft batch-tier"><strong>500 cards</strong><span>\$29.99</span></a></div>
            </div>
          </section>
        </div>
      </section>
    `
      }} />
    </PlayfulShell>
  );
}
