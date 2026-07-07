---
version: alpha
name: MyBingoCard Web
description: Playful bingo creation and sharing interface for consumer and event-host workflows.
colors:
  primary: "#4F46E5"
  primary-dark: "#312E81"
  secondary: "#7C3AED"
  accent: "#F59E0B"
  success: "#059669"
  danger: "#DC2626"
  background: "#F8FAFC"
  surface: "#FFFFFF"
  foreground: "#0F172A"
  body: "#334155"
  muted: "#64748B"
  border: "#E2E8F0"
  primary-soft: "#EEF2FF"
  success-soft: "#ECFDF5"
  warning-soft: "#FFF7ED"
  on-primary: "#FFFFFF"
typography:
  display:
    fontFamily: Poppins
    fontSize: 3.75rem
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: 0
  h1:
    fontFamily: Poppins
    fontSize: 2.75rem
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: 0
  h2:
    fontFamily: Poppins
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.08em
rounded:
  sm: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  section: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 16px 32px
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 16px 32px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
  bingo-cell-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  body-copy:
    textColor: "{colors.body}"
    typography: "{typography.body}"
  muted-caption:
    textColor: "{colors.muted}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  primary-soft-panel:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.lg}"
    padding: 16px
  success-soft-panel:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 16px
  celebration-banner:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: 24px
  error-message:
    textColor: "{colors.danger}"
  live-game-label:
    textColor: "{colors.success}"
  warning-soft-panel:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 12px
---

## Overview

MyBingoCard should feel friendly, fast, and maker-first. The product is about creating a card, sharing it, playing it, and printing it without friction. Keep the UI bright and approachable, but do not bury the workflow under decoration.

The default brand expression is a violet-to-indigo action system on a clean slate and white base. Theme pages may introduce seasonal or audience-specific accents, but the persistent product chrome should still read as MyBingoCard.

## Colors

Use `primary` indigo and `secondary` violet for core calls to action, selected bingo cells, links, and brand marks. Use `foreground`, `body`, `muted`, and `border` from the slate scale for readable interface structure. Use `accent` sparingly for celebratory or warning-adjacent moments, not as the default brand color.

`success` is for completed actions, live games, and positive state. `danger` is only for destructive actions, errors, and cancellation risk. Soft color tokens are background tints and should still be paired with readable text.

## Typography

Poppins is for brand, page titles, marketing headings, and high-emphasis labels. Inter is for app surfaces, forms, cards, controls, dashboard text, and body copy.

Headings should be confident but not oversized inside tool surfaces. Keep creator, dashboard, and game screens dense enough that actions stay close to the object the user is editing or playing.

## Layout

Use generous spacing on public landing sections, but keep creator and dashboard layouts compact. Repeated cards, templates, and game cells need stable dimensions so hover states, print mode, and dynamic text do not shift the page.

Printable bingo cards are a first-class surface. Print styles should remove navigation and preserve card colors without adding marketing clutter.

## Shapes

Rounded corners are part of the consumer-friendly feel. Use `md` for buttons and inputs, `lg` for app cards, `xl` only for major promotional or game containers, and `full` for badges or pills.

## Components

Primary actions use a violet-to-indigo treatment in implementation, anchored by `primary` and `secondary`. Secondary actions are white with indigo text and subtle borders. Bingo cells need clear selected, free, hover, disabled, and printed states.

Use icons in compact controls such as share, fullscreen, reset, download, and favorite when the action is familiar. Pair text with icons for less obvious commands.

## Do's and Don'ts

Do keep creator, share, and play actions visually obvious.

Do use slate neutrals to make colorful bingo content stand out.

Do preserve high contrast on mobile and print surfaces.

Do not let decorative gradients or blobs cover the workflow.

Do not introduce a new dominant brand hue unless the page is an explicit themed template landing page.
