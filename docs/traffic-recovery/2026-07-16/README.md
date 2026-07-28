# MyBingoCard Traffic Recovery Preparation — July 16, 2026

This directory contains local, non-deployed preparation artifacts for the 30-day qualified-traffic recovery plan.

## Safety boundary

- Live sources are queried read-only.
- No production database or analytics mutations.
- No deploy, restart, commit, push, publishing, Search Console submission, outreach, email, social posting, paid spend, or account change.
- Aggregate evidence only; no customer PII is stored here.
- Existing unrelated working-tree changes are preserved.

## Frozen comparison windows

- Current: July 13, 2026 00:00 through July 16, 2026 09:38 MST.
- Prior: July 6, 2026 00:00 through July 9, 2026 09:38 MST.
- GSC complete days: July 13–14 versus July 6–7.

## Artifact index

- `baselines.json` — frozen verified metrics and comparison windows.
- `SCORECARD.md` — canonical metric definitions, scorecard, and decision rules.
- `ACQUISITION-JOURNEYS.md` — direct/unknown and ChatGPT decomposition.
- `UX-CREATE-PATH-AUDIT.md` — homepage, mobile, landing-page, and internal-link audit.
- `evidence/390-clipping.md` — 390px reproduction details and evidence references.
- `mockups/cta-mobile-mockups.html` — local-only responsive CTA concepts.
- `CTA-COPY-DRAFTS.md` — production-ready copy options and guardrails.
- `SEO-CONTENT-BRIEFS.md` — prioritized page briefs.
- `CHATGPT-RECOVERY-PACKAGE.md` — answer-first content and distribution preparation.
- `ANALYTICS-RECONCILIATION.md` — canonical funnel and source reconciliation design.
- `BOT-CLASSIFICATION-PROPOSAL.md` — proposed classifier changes and false-positive controls.
- `queries/` — read-only SQLite query files.
- `tests/artifacts.test.ts` — local artifact and baseline verification.
- `tests/reconciliation.test.ts` — fixture-backed SQL and semantic reconciliation tests.
- `tests/viewport-check.ts` — isolated localhost/mockup viewport measurement.
- `evidence/viewport-check.json` and PNGs — runtime clipping and mockup evidence.
- `APPROVAL-PACKET.md` — smallest production/external decisions needed to continue.

Nothing in this directory is authorization to deploy or publish.
