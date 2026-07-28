# MyBingoCard Traffic-Recovery Approval Packet

Prepared locally from read-only evidence. Nothing in this packet authorizes deployment, publishing, Search Console submission, outreach, social posting, email, paid spend, account changes, or production data/analytics mutation.

## Decision summary

The evidence supports an acquisition and `/create` progression problem, not a broad auth/product outage:

- Clean first-party pageviews: **169 → 96**
- Direct/unknown pageviews: **110 → 43**
- ChatGPT referrer pageviews: **20 → 4**
- Google referral pageviews: **28 → 28**
- Tracker classified-human `/create` sessions: **138 → 21**
- Persisted signups: **2 → 1**
- Persisted cards: **1 → 2**
- Distinct card owners: **1 → 2**
- Direct GSC clicks on complete days: **10 → 10**
- GSC average position: **26.4 → 35.5**

Highest-leverage changes are to make creation visible on mobile, preserve landing-page intent into the editor, improve priority organic pages, restore citeable ChatGPT referral surfaces, and make the scorecard trustworthy.

## Smallest independent approvals

Each decision can be approved, deferred, or rejected independently.

### Completed safe preparation: local clipping verification

No approval remains necessary for diagnosis. The isolated localhost run is complete:

- Homepage email-capture button is runtime-confirmed 50.9px beyond the viewport at 390px.
- Creator default state has zero overflow at 389, 390, and 391px.
- Local mockup has zero overflow at 390px.
- Evidence and network-isolation policy are in `evidence/390-clipping.md`.

### A. Mobile create-entry and clipping implementation

**Approval requested:** implement and locally test, but do not deploy unless deployment is separately approved:

1. Always-visible **Make a Card** / **New Card** action in shared mobile navigation.
2. Context-prefilled mobile CTA in `SeoLandingPage`.
3. Move homepage mobile product mockup before App Store promotion.
4. Stack the homepage `EmailCapture` form on mobile and retain a horizontal layout at `sm` and above.

- Expected impact: +20–40% homepage mobile `/create` click-through and fewer one-page mobile exits.
- Effort: medium.
- Risk: low-to-medium; header space and responsive regressions.
- Guardrail: no desktop CTA regression; no horizontal overflow at 320, 360, 375, 390, 414, and 430px.

### B. Contextual thematic handoff

**Approval requested:** implement prefilled creator URLs for baby shower, wedding, classroom, team-building, holiday, and party pages.

Preserve template/title, grid size, cells, free-space state, and applicable style. Replace generic copy with context-specific actions.

- Expected impact: +15–30% meaningful-edit rate among theme-page `/create` entrants.
- Effort: medium.
- Risk: medium; URL size, stale template content, and backward compatibility.
- Guardrail: every page still works without JavaScript query hydration; existing bare `/create` remains a fallback.

### C. Priority SEO/content publishing

**Approval requested:** implement, review, and publish updates to:

1. Homepage
2. `/bingo-board-generator`
3. `/create`
4. `/online-bingo-card-generator`
5. `/blog/best-bingo-card-generator`

Use the briefs in `SEO-CONTENT-BRIEFS.md`; do not create a competing `/bingo-card-maker` canonical.

- Expected impact in 30 days: stabilize impressions/clicks, improve generic-intent CTR, and increase `/create` entries; ranking impact may take longer.
- Effort: medium-to-high.
- Risk: medium; cannibalization or copy changes that weaken current queries.
- Guardrails: preserve canonical intent ownership, structured data validity, internal-link context, and existing indexed URLs.

### D. Analytics reconciliation implementation

**Approval requested:** implement versioned canonical event definitions, read-only reconciliation scripts, identity-confidence reporting, GSC freshness metadata, and fixture tests.

- Initial scope should be report-only; no historical rewrite.
- Expected impact: trustworthy weekly acquisition/funnel decisions.
- Effort: high.
- Risk: medium; semantic dashboard changes can look like real traffic changes.
- Guardrails: parallel sources never summed; persisted outcomes remain authority; old and new definitions shown side by side for two weeks.

### E. Bot classification report-only rollout

**Approval requested:** deploy additive report-only classes (`known_automation`, `automation_suspected`, `human_confirmed`, `human_likely`, `proxy_indeterminate`, `unclassified`) without changing existing dashboards initially.

- Expected impact: reduce false confidence from `public_unknown` and improve qualified denominators.
- Effort: medium-to-high.
- Risk: high if used prematurely for exclusion.
- Guardrails: no IP-only classification, no raw-event deletion, zero confirmed-customer sessions quarantined, and estimated meaningful-human false positives below 2%.

A later dashboard filter, quarantine, or rollup rebuild requires a separate approval after report-only review.

### F. Search Console actions

**Approval requested only after SEO changes are live:** inspect affected URLs, validate canonical/indexability, and request indexing for the small priority set.

- Expected impact: faster discovery/reprocessing, not guaranteed ranking gains.
- Effort: low.
- Risk: low.
- Constraint: do not submit unchanged or low-quality near-duplicate pages.

### G. ChatGPT referral distribution/outreach

**Approval requested:** choose a small set of relevant owned/earned surfaces and authorize the exact messages/accounts before anything is posted or sent.

Recommended sequence:

1. Publish answer-first modules on owned priority pages.
2. Verify crawlability and concise product facts.
3. Prepare exact directory/community/resource submissions.
4. Approve each outbound destination and final copy.

- 30-day success: ChatGPT pageviews reach 10–15, at least 30% reach `/create`, at least 40% of those make a meaningful edit, and at least one creates a first card.
- Effort: medium.
- Risk: medium; spam/reputation risk if distribution is broad or generic.

### H. Paid spend

**Recommendation:** defer. Do not approve paid spend until the mobile create-entry changes and canonical measurement are live for at least one matched week.

Future pilot gate:

- Trusted source/session attribution
- Verified `/create` and first-card measurement
- Landing page with contextual handoff
- Explicit budget, account, targeting, and stop-loss approval

## Recommended approval order

1. **A — mobile create-entry and clipping implementation**
2. **B — contextual thematic handoff**
3. **D — analytics reconciliation implementation**
4. **C — priority SEO/content publishing**
5. **E — bot report-only rollout**
6. **F — Search Console actions after publishing**
7. **G — individually approved distribution/outreach**
8. Keep **H — paid spend** deferred

## Experiment gates

### Mobile visible-create experiment

- Primary: mobile homepage-to-`/create` session rate
- Secondary: meaningful-edit rate and save intent
- Success: at least +20% relative `/create` rate with no more than 10% relative decline in meaningful-edit rate
- Failure: less than +5% after 200 qualified mobile homepage sessions, or any confirmed navigation/accessibility regression

### Contextual prefill experiment

- Primary: meaningful-edit rate among theme-page `/create` entrants
- Secondary: save intent and persisted first card
- Success: at least +15% relative meaningful-edit rate or +10% first-card rate
- Failure: less than +5% after 100 qualified entrants, higher immediate editor exits, or query-hydration defects

### ChatGPT recovery

- Success by Day 30: 10–15 ChatGPT pageviews, ≥30% `/create` reach, ≥40% meaningful-edit rate among entrants, ≥1 first-card creator
- Failure: fewer than 6 pageviews and no qualified action after owned content is live and crawlable; revise citeability/distribution rather than adding generic pages

### Analytics trust

- Direct and cached/imported GSC reconcile within 5%, or cache is explicitly noncanonical
- ≥90% of qualified client sessions have stable session IDs
- Bot/quarantined traffic is separate
- Repeated snapshot runs are deterministic

## Explicitly not authorized by this packet

- Production deployment/restart
- Publishing or indexing submission
- Email, outreach, social, directory submission, or public messaging
- Paid spend
- Account or analytics configuration changes
- Production database mutation or historical data rewrite
- Commit or push
