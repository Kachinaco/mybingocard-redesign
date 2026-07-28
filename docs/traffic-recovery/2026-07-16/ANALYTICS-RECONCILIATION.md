# Analytics and Funnel Reconciliation Design

Local proposal only. Production instrumentation, Tracker Lite, database, dashboard, or alert changes require Cory's approval.

## Current parallel sources

1. Nginx request logs
2. First-party application `activity_events`
3. Tracker Lite `raw_events`
4. Persisted application users/cards/payments
5. Direct Google Search Console

These are complementary sources. They must not be summed into one traffic total.

## Verified semantic conflicts

- First-party `page_view` and Tracker Lite automatic `pageview` are parallel instrumentation, not two customer pageviews.
- `oauth_signup_started` can map to a broad Tracker Lite `signup`; it is an attempt, not an account.
- Credential `signup_completed` can be emitted when an account is inserted, before email verification.
- A signed verified-account Tracker Lite outcome has a stricter meaning than the older first-party event with the same label.
- Tracker Lite `_tr_anon` / `_tr_sess` identifiers differ from first-party `tr_anonymous_id` / `tr_session_id`; `legacyAnonymousId` alone is not a strong person-level stitch.
- Direct GSC results are authoritative. Tracker Lite's GSC cache/import must expose freshness and query identity before use.

## Canonical event contract

| Metric | Authority | Inclusion rule |
|---|---|---|
| `qualified_page_view` | First-party activity | Client `page_view`, valid session/anonymous ID, human-likely or human-confirmed |
| `create_entry` | First-party activity | Qualified pageview whose normalized path begins `/create` |
| `create_intent` | First-party activity | Title/cell/grid/style/AI action with stable session ID |
| `save_intent` | First-party activity | `builder_save_clicked` or `card_save_attempted`, deduplicated per action/event ID |
| `account_created` | Persisted user | Reportable user inserted in the window |
| `account_verified` | Persisted user/provider evidence | Provider-verified account or credential account with valid email verification |
| `canonical_signup_completed` | Signed outcome | Exact immutable `signup_completed` account outcome with valid underlying user evidence |
| `card_created` | Persisted card/server activity | Unique persisted card ID and owner; server event is reconciliation evidence |
| `checkout_started` | Payment provider/server | Unique provider checkout/session created by server |
| `payment_completed` | Stripe/Apple server truth | Verified paid/active provider state and matching canonical outcome |
| `organic_search_click` | Direct GSC | Direct property/date Search Analytics click |

New canonical events should include `event_contract_version: 1` and an opaque stable `event_id`. Do not redefine historical free-form events in place.

## Reconciliation reports

### Funnel report

Report daily and whole-window counts for:

- Raw first-party pageviews
- Qualified first-party pageviews
- `/create` entries
- Create intent
- Save intent
- Account created
- Account verified
- Canonical signup outcome
- Persisted card created
- Checkout started
- Payment completed

Always show source, traffic class, identity confidence, numerator, and denominator.

### Integrity deltas

- `verified_users_without_signup_outcome`
- `signup_outcomes_without_verified_user`
- `cards_without_owner`
- `server_card_created_without_card`
- `paid_provider_records_without_payment_outcome`
- `payment_outcomes_without_provider_record`

A nonzero delta is an audit finding, not permission to repair data automatically.

## Duplicate policy

A potential duplicate requires all of:

1. Same source stream; cross-source events are never deduplicated by default.
2. Same canonical event family.
3. Same anonymous or session ID.
4. Same normalized path.
5. Same five-second bucket.
6. Same allowlisted stable action fields.
7. A delivery retry indicator or stable event/delivery ID.

First-party `page_view` and Tracker Lite automatic `pageview` are coverage comparisons, not duplicate rows to merge.

## Identity confidence

- `strong_stitch`: Tracker Lite profile maps one anonymous ID to one valid user at confidence 100, authenticated evidence agrees, and no conflict exists.
- `legacy_only`: app `legacyAnonymousId` exists without proof that it equals the Tracker Lite anonymous ID.
- `conflicting_stitch`: one anonymous ID maps to multiple users or vice versa in the review period.
- `orphan_profile`: mapped user no longer resolves.
- `unattributed_authenticated_activity`: authenticated activity lacks a recognized predecessor.

Only `strong_stitch` may support person-level pre/post-signup funnel reporting. Aggregate reporting may retain other categories separately.

## GSC freshness contract

Every GSC extract must record:

- Source: direct module, transparent cache, opaque cache, or unavailable
- Property
- Start/end dates
- Dimensions and filters
- Row limit
- Fetch time
- Latest returned date
- Finalized-through date
- Cache age and fingerprint where exposed

Do not call an opaque imported cache fresh. Mark the most recent three Phoenix dates provisional. Never trigger a regression conclusion from provisional GSC alone.

## Production implementation proposal

Recommended future files, subject to approval:

- `lib/analytics/event-contract.ts`
- `lib/analytics/traffic-classification.ts`
- `scripts/analytics-queries/reconcile-funnel.cjs`
- `scripts/analytics-queries/audit-tracker-lite-coverage.cjs`
- `scripts/analytics-queries/audit-identity-stitching.cjs`
- `scripts/analytics-queries/audit-gsc-freshness.cjs`
- Focused fixture-backed tests under `tests/`

The current local preparation keeps runnable fixture tests under this documentation bundle and does not change application behavior.

## Trust criteria by Day 30

- Direct and cached/imported GSC property totals reconcile within 5%, or the cache is explicitly unavailable/noncanonical.
- Browser/legacy business events are not double-counted.
- At least 90% of qualified client sessions have a stable session ID.
- At least 80% of completed signups are associated with a source category or explicitly unknown.
- Bot/quarantined traffic is separate from qualified traffic.
- Repeated scorecard runs against the same snapshot are deterministic.
