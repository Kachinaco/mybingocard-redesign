# Bot and Distributed-Proxy Classification Proposal

Local proposal only. Deploying classification or quarantine changes, rebuilding analytics, or changing production reports requires Cory's approval.

## Problem

The current UA exclusion is useful for obvious crawlers but cannot reliably distinguish distributed browser automation, shared proxies, privacy relays, QA tools, or human visitors. Tracker Lite `public_unknown` is therefore not equivalent to human.

## Proposed classes

| Class | Meaning | Funnel policy |
|---|---|---|
| `known_automation` | Strong bot/monitor/automation evidence | Exclude from qualified denominator |
| `automation_suspected` | At least two independent weak automation signals | Exclude from qualified denominator; retain diagnostics |
| `human_confirmed` | Authenticated server success, persisted card, or verified payment linked safely | Include |
| `human_likely` | No hard bot signal plus valid browser identity and meaningful visible interaction | Include separately |
| `proxy_indeterminate` | Proxy/header uncertainty prevents reliable IP interpretation | Do not decide human/bot from IP |
| `unclassified` | Insufficient evidence | Exclude from qualified denominator; report separately |

## Hard automation signals

Any one of:

- Existing known-bot UA signature
- Known monitoring/synthetic UA
- `navigator.webdriver === true`
- Strong automation globals
- Explicit internal QA/synthetic marker

## Suspected automation signals

Require at least two independent signals:

- Platform mismatch
- `outerWidth/outerHeight` equal to inner dimensions in a known automated pattern
- No plugins and no languages
- No visibility/focus evidence across the session
- Exact fixed-interval request cadence
- Implausibly high paths or session starts per anonymous ID
- Repeated distributed bounce fingerprint already validated against a false-positive sample

Never classify solely from IP/ASN, VPN/Tor, no mouse movement, no click, one browser property, or malformed forwarding headers.

## Human-likely evidence

Require all:

- No hard automation signal
- Valid anonymous and session identifiers
- Visible/focused page evidence at view or engagement time
- At least one meaningful interaction: click, nonzero scroll, form lifecycle, card edit, keyboard action, or at least 30 seconds of visible engagement

Do not require mouse movement; that would penalize touch, keyboard, assistive-technology, and reading-only users.

## Human-confirmed evidence

One safely linked server outcome:

- Verified account
- Persisted card
- Verified checkout/payment
- Other authenticated server-side product success

This confirms the outcome, not every historical pageview. Do not retroactively relabel unrelated traffic from the same IP.

## Proxy trust

- Trust `CF-Connecting-IP` only when the direct peer is verified Cloudflare infrastructure.
- Trust X-Forwarded-For only if Nginx overwrites inbound client XFF and the direct peer is allowlisted.
- Otherwise set `client_ip_trust = untrusted` or `absent` and classify `proxy_indeterminate` when IP evidence would be needed.
- Never deduplicate people by IP.

## False-positive analysis

| Scenario | Risk | Safeguard |
|---|---|---|
| Accessibility or enterprise headless tooling | Looks automated | Keep suspected traffic inspectable; require multiple signals |
| School/office/mobile NAT | Many people share an IP | Never merge or classify by IP alone |
| iCloud Private Relay/VPN/Tor | Proxy traits | Use `proxy_indeterminate`, not bot |
| Reader leaves before interaction | No click/scroll | Keep unclassified; do not call bot |
| Touch/keyboard user | No mouse movement | Accept keyboard, touch, form, edit, and visible-time evidence |
| Content blocker | Missing Tracker Lite events | Compare source coverage; do not infer traffic loss automatically |
| Spoofed normal UA | Evades regex | Require behavior/outcome evidence before human promotion |
| Bot completes a form/signup | Server outcome exists | Confirm only the outcome; retain fraud/abuse review separately |
| Shared device switches users | Conflicting identity graph | Exclude conflict from person-level stitching |

## False-positive evaluation procedure

Before deployment:

1. Apply the proposed rules to a frozen historical snapshot in report-only mode.
2. Sample every proposed `known_automation` class and a stratified sample of `automation_suspected`.
3. Compare paths, cadence, visibility, interaction, geography, identity conflicts, and persisted outcomes.
4. Calculate how many sessions with persisted customer outcomes would be excluded.
5. Deployment gate: zero `human_confirmed` sessions may be automatically quarantined.
6. Deployment gate: suspected-class false-positive estimate must be below 2% for clearly meaningful human sessions.
7. Maintain reversible quarantine metadata; never delete raw events.

## Proposed report-only output

- Session ID hash/opaque ID
- Prior audience
- Proposed class
- Rule version
- Triggering signals
- Confidence
- Has persisted outcome: yes/no
- Would affect qualified denominator: yes/no
- Reversible quarantine state

Do not include raw IP, full query strings, names, emails, card titles, or browser fingerprint payloads in exported artifacts.

## Rollout requiring approval

1. Local fixture and historical snapshot validation.
2. Production report-only classification with no dashboard changes.
3. Review false positives and customer-outcome conflicts.
4. Enable qualified-denominator filtering.
5. Optionally apply reversible quarantine to validated patterns.
6. Rebuild derived rollups only after separate approval and backup/rollback proof.
