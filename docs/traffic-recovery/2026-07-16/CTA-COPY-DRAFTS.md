# CTA and Funnel Copy Drafts

Local preparation only. Publishing or deploying any option requires Cory's approval.

## Copy principles

- Lead with the task: create a bingo card.
- State accurately that visitors may start before creating an account.
- Do not imply every export, bulk card, game, or premium feature is free.
- Keep the primary action consistent across public pages.
- Explain the save boundary before OAuth rather than after a visitor is surprised by it.
- Preserve the maker-first visual system in `DESIGN.md`.

## Recommended primary system

### Homepage hero

**Eyebrow:** Free bingo card maker

**Heading:** Create a bingo card for your class, event, team, or game

**Supporting copy:** Add your own words or generate ideas, customize the card, and print one individual PDF card free. Start building before you create an account.

**Primary CTA:** Create a bingo card

**Secondary CTA:** See bingo card ideas

**Proof row:** No account to start · Custom words and themes · Printable and online play

### Mobile-short version

**Heading:** Make a bingo card

**Copy:** Add words, customize it, and print one individual card free. No account needed to start.

**CTA:** Start creating

## Landing-page CTA pattern

**Heading:** Ready to make your own [use case] bingo card?

**Copy:** Start with a blank card or use the ideas on this page. You can edit the title, words, grid, and colors before signing in.

**Primary CTA:** Create a [use case] bingo card

**Context link:** What can I customize?

Suggested examples:

- Create a classroom bingo card
- Create a trivia bingo card
- Create a team bingo card
- Create a printable bingo card
- Create an online bingo game

## Template/use-case CTA pattern

**Button:** Use this idea in the card maker

**Accessible label:** Create a bingo card using the [theme] idea

**Prefill behavior proposal:** Carry only truthful, visible context such as intended theme or grid size. Do not silently create or save customer data.

## Builder first-view copy

**Heading:** Create your bingo card

**Helper:** Start with your own words or generate ideas. Your draft stays on this device while you work.

**Draft state:** Saved on this device

**Account distinction:** Sign in when you are ready to save the card to your account and reopen it on another device.

## Save/auth boundary

**Heading:** Save this card to your account

**Copy:** Your draft is still on this device. Continue with Google or another available sign-in method to save it to your account and reopen it later.

**Primary CTA:** Continue with Google

**Secondary action:** Keep editing on this device

**Trust note:** Signing in does not change your card. We will restore this draft after authentication.

## Post-auth restoration

**Success heading:** Your card is saved

**Copy:** Your draft was restored and saved to your account. You can keep editing, print it, or return to it from your dashboard.

**Primary CTA:** Keep editing

**Secondary CTA:** View my cards

## Experiment variants

### Variant A — task clarity, recommended

- CTA: Create a bingo card
- Proof: No account needed to start
- Intended effect: increase qualified `/create` entries without overpromising free features.

### Variant B — speed

- CTA: Start creating free
- Proof: Build your card before signing in
- Risk: “free” may attract lower-intent traffic or imply all exports/features are free.

### Variant C — use-case personalization

- CTA: Make a card for my event
- Proof: Customize words, grid, and colors
- Risk: too narrow for classroom, team, and casual users unless the text changes by landing page.

## Measurement and guardrails

Primary: unique eligible landing sessions reaching `/create`.

Guardrails:

- `/create` entry-to-meaningful-edit rate must not fall by more than 10% relative.
- `card_draft_left_unsaved` must not materially increase.
- Save-to-auth and auth-to-persisted-user rates must not deteriorate.
- Mobile CTA must remain fully visible and keyboard accessible at 390px.

Scale Variant A only after at least 50 eligible sessions and a 20% relative improvement in landing-to-`/create` rate, unless the 30-day period ends first and the result remains directional but underpowered.
