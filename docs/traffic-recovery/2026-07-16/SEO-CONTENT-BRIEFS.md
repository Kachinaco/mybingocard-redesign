# SEO and Content Briefs

Local preparation only. Public copy changes, publishing, redirects, sitemap submissions, and Search Console actions require Cory's approval.

## Shared rules

- The homepage owns broad `bingo card maker` and `bingo card generator` intent.
- `/create` owns action intent.
- Specific pages must answer a distinct use case rather than restating the homepage.
- Every priority page should contain one context-specific path into `/create`.
- Preserve truthful limits: starting is available without an account; one individual PDF card is free; do not imply every feature is free.
- Avoid new near-duplicate pages until the existing impression-bearing pages are improved and measured.

## Priority 1 — Homepage `/`

**Observed evidence:** GSC moved from 7 clicks / 433 impressions / position 13.4 to 2 / 207 / 21.0 for the comparable complete-day window.

**Intent:** Broad maker/generator discovery plus immediate task entry.

**Required work:**

- Put the task and `/create` action above the fold on mobile and desktop.
- Explain no-account-to-start and the exact free-print boundary.
- Add concise proof for custom words, AI-assisted ideas, printable cards, and online play without diluting the maker intent.
- Link contextually to classroom, events, trivia, templates, and online play.
- Keep one dominant generic canonical target; do not revive a competing canonical `/bingo-card-maker` page.

**Primary KPI:** homepage session → `/create` session rate.

**SEO leading KPI:** impressions stop declining; position improves by at least 2 or CTR by 0.3 percentage points after recrawl.

## Priority 2 — `/bingo-board-generator`

**Observed evidence:** improved from 0 clicks / 19 impressions / position 43.8 to 3 / 134 / 34.4.

**Intent:** People seeking a board/card generation workflow, potentially with generated content.

**Required work:**

- Preserve the query language that is gaining impressions.
- Demonstrate a short generate → customize → print/play workflow.
- Add a direct, contextual `/create` action.
- Clarify the distinction between a bingo board, printable card, and online game without creating separate duplicate-intent copy blocks.
- Add examples for classroom, event, team, and trivia use.

**Primary KPI:** organic landing session → meaningful `/create` edit.

**Guardrail:** do not cannibalize homepage generic maker queries.

## Priority 3 — `/create`

**Observed evidence:** GSC moved from 2 clicks / 88 impressions / position 55.4 to 1 / 42 / 47.9; action intent remains distinct.

**Intent:** Immediate creation.

**Required work:**

- Verify and remove any duplicate visible H1 while preserving useful server-rendered task guidance.
- Keep the builder above supporting content.
- Repair 390px clipping before evaluating mobile engagement.
- Clarify local draft persistence and the account save boundary.
- Provide short links to examples without sending ready-to-create users away from the tool.

**Primary KPI:** entry → meaningful edit rate.

**Guardrail:** no increase in mobile layout failure, LCP regression, or draft loss.

## Priority 4 — `/online-bingo-card-generator`

**Observed evidence:** 54 current impressions at position 52.6, not yet meaningful clicks.

**Intent:** Creating cards intended for online play.

**Required work:**

- Focus on online hosting/joining/play behavior rather than generic printable-maker language.
- Explain how players join, what the host controls, and when a printable card is more appropriate.
- Use a contextual action such as “Create a card for online play.”
- Link to the broader homepage only for generic maker questions.

**Primary KPI:** qualified online-play create starts.

**Guardrail:** no overlap expansion with the homepage's broad generator intent.

## Priority 5 — `/blog/best-bingo-card-generator`

**Observed evidence:** approximately 64–66 impressions at positions 70.3–74.4 with no clicks in either comparison.

**Intent:** Evaluation and product selection.

**Required work:**

- Lead with a factual selection checklist: creation speed, customization, printable output, online play, privacy, account boundary, and price.
- Compare categories and workflows rather than making unverifiable superiority claims.
- Include a concise “best for” table based on documented capabilities.
- Send readers who already know their requirements directly to `/create`.

**Primary KPI:** guide session → `/create` rate.

**Stop rule:** if impressions rise but qualified progression remains below 4% after 50 sessions, de-emphasize rather than expanding the guide cluster.

## Internal-link architecture

- Homepage → `/create` as the dominant action.
- Use-case pages → `/create` with context-specific anchor text.
- Comparison guide → homepage for broad product understanding and `/create` for ready users.
- Online-play pages → online-play workflow and contextual create action.
- Generator pages → avoid circular generic links among near-synonyms.

## Publishing sequence requiring approval

1. Mobile clipping repair and homepage CTA.
2. `/bingo-board-generator` action/proof improvements.
3. `/create` heading, guidance, and auth-boundary clarity.
4. `/online-bingo-card-generator` differentiation.
5. Comparison-guide upgrade.
6. Re-evaluate GSC and qualified progression before creating another page.
