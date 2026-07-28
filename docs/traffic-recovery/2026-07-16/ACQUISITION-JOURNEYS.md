# Acquisition and Journey Analysis

Read-only analysis. Publishing, outreach, tracking, or production changes require Cory's approval.

## Main finding

Clean first-party pageviews fell from 169 to 96. The measurable loss is concentrated in direct/unknown and ChatGPT acquisition, not Google referrals.

| Source | Prior | Current | Change |
|---|---:|---:|---:|
| Direct/blank referrer | 110 | 43 | -67 |
| ChatGPT referrer | 20 | 4 | -16 |
| Google referrer | 28 | 28 | 0 |
| Bing referrer | 1 | 6 | +5 |
| `accounts.google.com` | 5 | 3 | -2 |
| Internal navigation | 5 | 8 | +3 |
| `metadata.utm.source = chatgpt.com` | 23 | 6 | -17 |
| Paid medium/campaign | 0 | 0 | none |

## Direct/unknown decomposition

`Direct/blank` means the event had no usable external referrer and no authoritative campaign source. It is not proof that a person typed the URL.

Potential components:

1. Returning visitors/bookmarks
2. Links opened from apps that strip referrers
3. Untagged owned links
4. Privacy-restricted browser navigation
5. Server/client attribution stitching failures
6. Distributed automation with no obvious bot user agent

### Required scorecard cuts

For each direct/unknown landing session, report aggregate counts by:

- First landing page
- New versus returning anonymous identity
- Device class
- Geography at coarse city/region level only when already present and privacy-safe
- Visit depth
- `/create` reach
- Meaningful edit
- Save intent
- Auth start
- Persisted signup/first card when safely stitched
- Automation fingerprint/quarantine state

### Decision thresholds

- If at least 40% of the missing direct volume is shallow automation, do not set a restoration target based on the old 110-pageview level.
- If returning qualified visitors fell at least 25%, prioritize draft re-entry and return paths.
- If one or two landing pages explain at least 50% of the qualified loss, concentrate internal-link and distribution work there.
- If source stitching is missing for more than 20% of persisted signups, fix attribution before paid acquisition.

## Prior ChatGPT journey evidence

The strongest previously observed ChatGPT-tagged session:

- Landed directly on `/create`.
- Remained active for approximately 26 minutes.
- Entered a title.
- Changed grid size and styling.
- Selected a wedding/5×5 AI-generation context.
- Applied 24 generated cells.
- Ended with `card_draft_lost` in the historical taxonomy and no persisted card.

A second ChatGPT-tagged journey:

- Moved from homepage to pricing to `/create`.
- Changed the grid.
- Did not produce a persisted card.

These sessions show that prior ChatGPT acquisition was not solely shallow traffic. At least some visitors entered high-intent creation workflows, which makes the current 20-to-4 referral decline actionable.

## Current ChatGPT evidence

- ChatGPT referrer pageviews: 4.
- `chatgpt.com` UTM pageviews: 6.
- The small current sample is insufficient for page-level optimization by itself.
- Use deduplicated session attribution when referrer and UTM are both present.

## Landing-page query rule

A landing page is the first pageview in a session, ordered by behavioral timestamp and stable event ID. Later internal pageviews must not be counted as new landings.

Attribution priority:

1. First valid external referrer.
2. First valid `metadata.utm.source`.
3. `direct_or_unknown` when neither exists.
4. Store internal navigation separately rather than overwriting the acquisition source.

## Recovery implications

1. Repair and clarify the direct path from homepage/use-case content into `/create`.
2. Make `/create` and high-value use-case answers citeable and complete for AI-assisted discovery.
3. Preserve drafts and explain account-backed saving before the auth boundary.
4. Do not buy traffic while direct/unknown composition and outcome attribution remain uncertain.
5. Evaluate channels on meaningful `/create` edits and first cards, not raw visits.

## Limitations

- Aggregate records from the frozen live investigation are retained; no customer-level PII is copied into this bundle.
- Client telemetry is best effort and can be missing or duplicated.
- Direct/unknown decomposition requires the authorized database host for a fresh rerun.
- Historical `card_draft_lost` semantics were later replaced by `card_draft_left_unsaved`; compare the event versions carefully.
- Tracker Lite and first-party app totals differ because of capture, sessionization, internal exclusion, and bot classification.
