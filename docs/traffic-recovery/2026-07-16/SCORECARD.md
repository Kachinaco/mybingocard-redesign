# Canonical Matched-Window Qualified-Traffic Scorecard

## Run manifest

- Timezone: `America/Phoenix`
- Current behavioral window: `2026-07-13T07:00:00.000Z <= t < 2026-07-16T16:38:00.000Z`
- Prior behavioral window: `2026-07-06T07:00:00.000Z <= t < 2026-07-09T16:38:00.000Z`
- Direct GSC complete-day window: July 13–14 versus July 6–7, inclusive
- Timestamp rule: half-open UTC bounds for app and Tracker Lite behavioral data
- Behavior timestamp: `occurred_at` or persisted application `createdAt`; `received_at` is ingestion diagnostics only
- Frozen metrics: `baselines.json`

## Source authority

1. Persisted users, cards, subscriptions, and server outcomes in application SQLite are business-outcome truth.
2. First-party `activity_events` are journey and acquisition evidence.
3. Tracker Lite is path/session/referrer evidence with explicit audience and bot caveats.
4. Direct authorized GSC property/date results are organic-search truth.
5. Browser `signup`, `conversion`, OAuth start, and save events are attempts or signals, not persisted outcomes.

## Executive scorecard

| Metric | Prior | Current | Change |
|---|---:|---:|---:|
| Persisted reportable accounts | 2 | 1 | -50.0% |
| Persisted cards | 1 | 2 | +100.0% |
| Distinct card owners | 1 | 2 | +100.0% |
| Server `card_created` users | 1 | 2 | +1 |
| Server `first_card_created` users | 1 | 2 | +1 |
| Tracker Lite classified-human pageviews | 464 | 117 | -74.8% |
| Tracker Lite `/create` pageviews | 174 | 33 | -81.0% |
| Tracker Lite unique `/create` visitors | 119 | 19 | -84.0% |
| Tracker Lite `/create` sessions | 138 | 21 | -84.8% |
| Bot-like share of classified sessions | 9.1% | 21.9% | +12.8 pp |
| Clean first-party pageviews | 169 | 96 | -43.2% |
| Clean first-party sessions | 66 | 61 | -7.6% |
| Direct/unknown pageviews | 110 | 43 | -60.9% |
| ChatGPT-referrer pageviews | 20 | 4 | -80.0% |
| Google-referrer pageviews | 28 | 28 | flat |

## Complete-GSC-day funnel companion

This companion uses July 6–7 versus July 13–14 so first-party behavior can be compared with complete GSC days.

| Metric | Prior | Current | Change |
|---|---:|---:|---:|
| Clean browser pageviews | 152 | 66 | -56.6% |
| Clean sessions | 55 | 39 | -29.1% |
| Create-intent events | 11 | 4 | -63.6% |
| Signup/OAuth attempt events | 15 | 8 | -46.7% |
| Actual accounts | 2 | 1 | -50.0% |
| Failure-labelled events | 35 | 7 | -80.0% |
| Accounts / clean pageviews | 1.32% | 1.52% | +0.20 pp |
| Accounts / clean sessions | 3.64% | 2.56% | -1.08 pp |

## Direct GSC companion

| Metric | Prior | Current | Change |
|---|---:|---:|---:|
| Clicks | 10 | 10 | flat |
| Impressions | 673 | 683 | +1.5% |
| CTR | 1.49% | 1.46% | -0.03 pp |
| Average position | 26.4 | 35.5 | 9.1 positions worse |
| Homepage clicks | 7 | 2 | -5 |
| Homepage impressions | 433 | 207 | -52.2% |
| Homepage position | 13.4 | 21.0 | 7.6 positions worse |
| `/bingo-board-generator` current | — | 3 clicks / 134 impressions / position 34.4 | offsetting gain |

## Funnel model

### Acquisition and journey layer

`Landing session → /create session → create intent → save intent → auth/signup attempt`

- Landing and `/create`: distinct session.
- Intent and attempt: show distinct sessions and raw event counts separately.
- Landing page: first pageview in a session.
- Attribution: first external referrer and first valid UTM value in the session.
- Source buckets: `direct_or_unknown`, `chatgpt`, `google`, `other_search`, `social`, `other_external`, `internal`, and `excluded`.

### Verified outcome layer

`Persisted reportable account → persisted first card → later commercial outcome`

- Account: distinct reportable persisted user.
- Activation: distinct persisted card owner and server `first_card_created` user.
- Payment: Stripe or Apple server outcome, never browser conversion telemetry.

## Qualified-session definition

An external-looking session is qualified when it does at least one of:

- Reaches `/create`
- Adds or generates cells
- Enters a card title
- Changes grid or meaningful style settings
- Clicks save
- Starts authentication/signup
- Produces a persisted card, export, share, game, verified checkout, or payment

Do not qualify a session solely from a pageview, generic click, `bingo_achieved`, browser `conversion`, browser `signup`, or OAuth start.

## Decision line

The verified evidence supports lower direct/unknown and ChatGPT acquisition plus sharply reduced `/create` progression. It does not support a broad signup/auth outage: account conversion per clean pageview was stable and persisted first-card activation improved.

## Run procedure

1. Confirm source availability without mutating data.
2. Run `queries/app-scorecard.sql` against an immutable/read-only application SQLite connection.
3. Run `queries/tracker-scorecard.sql` against Tracker Lite with `sqlite3 -readonly` or equivalent.
4. Run `queries/acquisition.sql` against the application SQLite document store.
5. Query direct GSC for the complete-day property totals and page/device breakdowns.
6. Save aggregate output only; do not store customer PII.
7. Record unavailable sources and late-arrival counts rather than silently substituting another source.
8. Run `bun test docs/traffic-recovery/2026-07-16/tests`.

## Availability note

The exact metrics in this artifact are frozen from the live read-only 09:38 MST investigation. A later verification agent found that the production paths were not mounted in the current Mac session and were not available through the reached `workstation` target, so it did not claim a second live read. The queries remain ready for the authorized host where those databases are present.
