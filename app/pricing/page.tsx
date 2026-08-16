import type { Metadata } from "next";
import { Suspense } from "react";
import PlayfulShell from "@/components/PlayfulShell";
import {
  CheckoutReturnBanner,
  PricingCheckoutButton,
  PricingPageTracker,
} from "./PricingCheckoutActions";

export const metadata: Metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return (
    <PlayfulShell>
      <section className="page-section">
        <div className="content-rail">
          <Suspense fallback={null}>
            <PricingPageTracker />
            <CheckoutReturnBanner />
          </Suspense>

          <div className="page-heading">
            <span className="eyebrow">Simple choices</span>
            <h1 tabIndex={-1}>Start free. Upgrade when sharing gets bigger.</h1>
            <p>Make individual cards at no cost, then choose account or batch options only when they fit the event.</p>
          </div>

          <div className="pricing-grid">
            <article className="card pricing-card">
              <h2>Free</h2>
              <p className="price">$0</p>
              <p className="muted">For complete individual card creation</p>
              <ul className="check-list">
                <li>All templates, images, and AI ideas</li>
                <li>One saved card</li>
                <li>Individual PDF and PNG exports</li>
              </ul>
              <a className="button" href="/create">Create a free card</a>
            </article>

            <article className="card pricing-card is-featured">
              <span className="pill pill-purple">Most flexible</span>
              <h2>Premium</h2>
              <p className="price">$7.99<small> / month</small></p>
              <p className="muted">For regular group organizers</p>
              <ul className="check-list">
                <li>Unlimited saved cards</li>
                <li>Printable batches up to 500 cards</li>
                <li>Player links and hosted live rooms</li>
              </ul>
              <PricingCheckoutButton purchaseType="monthly" className="button button-primary">
                Choose Premium
              </PricingCheckoutButton>
            </article>

            <article className="card pricing-card">
              <h2>Lifetime</h2>
              <p className="price">$29.99</p>
              <p className="muted">Permanent access to paid group tools</p>
              <ul className="check-list">
                <li>Everything in Premium</li>
                <li>One-time purchase</li>
                <li>No monthly renewal</li>
              </ul>
              <PricingCheckoutButton purchaseType="lifetime" className="button">
                Choose Lifetime
              </PricingCheckoutButton>
            </article>
          </div>

          <section className="card card-body surface-yellow" style={{ marginBlockStart: 38 }}>
            <div className="page-heading" style={{ margin: 0 }}>
              <span className="eyebrow">One-time printable batch packs</span>
              <h2>Need unique cards for one event?</h2>
              <p>Buy only the printable set you need. Player-link sharing is separate; Premium and Lifetime include eligible batches, direct sharing, and hosted rooms.</p>
              <div className="batch-tier-grid">
                <a href="/create?state=batch&batchCount=30" className="card-soft batch-tier"><strong>30 cards</strong><span>$1.99</span></a>
                <a href="/create?state=batch&batchCount=100" className="card-soft batch-tier"><strong>100 cards</strong><span>$9.99</span></a>
                <a href="/create?state=batch&batchCount=250" className="card-soft batch-tier"><strong>250 cards</strong><span>$19.99</span></a>
                <a href="/create?state=batch&batchCount=500" className="card-soft batch-tier"><strong>500 cards</strong><span>$29.99</span></a>
              </div>
            </div>
          </section>
        </div>
      </section>
    </PlayfulShell>
  );
}
