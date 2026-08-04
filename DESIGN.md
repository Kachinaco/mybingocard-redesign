# MyBingoCard Web - Playful Confetti

Design tokens and rationale for the Playful Confetti visual identity (Cory-approved prototype direction 05, adopted August 2026).

## Tokens

- primary: `#FF5D8F` (pink - core actions, brand marks)
- primary-dark: `#C2255C`
- secondary: `#7C5CFF` (purple - kicker pills, secondary emphasis)
- accent: `#FFB800` (yellow - celebration, warning-adjacent)
- teal: `#2EC4B6` (rotating section accent)
- orange: `#FF8A3D` (rotating section accent)
- success: `#2B7A3D`
- danger: `#DC2626`
- background: `#FFF7ED` (warm paper)
- surface: `#FFFFFF`
- foreground: `#33312E` (ink - text, borders, hard shadows)
- muted: `#6B6459`
- faint: `#A39A88`
- primary-soft: `#FFD9E6`
- secondary-soft: `#EFE9FF`
- teal-soft: `#CDEEE9`
- success-soft: `#D9F5D9`
- warning-soft: `#FFF0C7`
- on-primary: `#FFFFFF`

Typography: Fredoka for brand, page titles, marketing headings, buttons, pills, and labels. Nunito for app surfaces, forms, cards, controls, dashboard text, and body copy (weight 600 on the paper background).

Rounded: full (999px) for buttons and pills, 0.75rem for inputs, 1rem for cards, 1.5rem for major promotional or game containers.

Component recipe: every bordered element carries a 2.5px ink border plus a hard offset shadow (`0 3px 0` for buttons, `0 4px 0` for cards). Button hover presses the element down 2px and shrinks the shadow. Inputs render at 16px minimum font size.

## Overview

MyBingoCard should feel friendly, fast, and maker-first. The product is about creating a card, sharing it, playing it, and printing it without friction. Keep the UI bright and approachable, but do not bury the workflow under decoration.

The default brand expression is Playful Confetti: a warm paper base, ink borders, hard offset shadows, pill buttons, rotated sticker badges, and a multi-hue accent set. Pink is the primary action color; teal, yellow, purple, and orange rotate across sections so no single hue dominates.

## Colors

Use primary pink for core calls to action and brand marks, secondary purple for kicker pills and secondary emphasis, and teal, yellow, and orange as rotating section accents. Every bordered surface uses ink for its border with a hard offset shadow instead of soft blurred shadows.

Success is for completed actions, live games, and positive state. Danger is only for destructive actions, errors, and cancellation risk. Soft color tokens are background tints and should still be paired with readable ink text.

## Typography

Headings should be confident but not oversized inside tool surfaces. Keep creator, dashboard, and game screens dense enough that actions stay close to the object the user is editing or playing.

## Layout

Use generous spacing on public landing sections, but keep creator and dashboard layouts compact. Repeated cards, templates, and game cells need stable dimensions so hover states, print mode, and dynamic text do not shift the page.

Colored `cband` sections (purple, teal, yellow) break up long pages with 3px ink top and bottom borders. Rotated `csticker` badges add playful emphasis sparingly.

Printable bingo cards are a first-class surface. Print styles should remove navigation and preserve card colors without adding marketing clutter.

## Shapes

Rounded corners are part of the consumer-friendly feel. Every bordered element carries the ink border plus hard offset shadow.

## Components

Primary actions are pink pill buttons with ink borders and hard shadows. Secondary actions are white pills with ink text. Bingo cells need clear selected, free, hover, disabled, and printed states with ink borders.

Use icons in compact controls such as share, fullscreen, reset, download, and favorite when the action is familiar. Pair text with icons for less obvious commands.

Mobile rules are non-negotiable: inputs render at 16px minimum to prevent iOS zoom, tap targets are 44px or larger, and no font scales with viewport width. All playful motion respects prefers-reduced-motion.

## Do's and Don'ts

Do keep creator, share, and play actions visually obvious.

Do use the paper background and ink borders to make colorful bingo content stand out.

Do preserve high contrast on mobile and print surfaces.

Do rotate accent hues across sections so no single color dominates a page.

Do not let decorative elements cover the workflow.

Do not reintroduce soft blurred shadows, gradient buttons, or glassmorphism; those belong to the retired identity.
