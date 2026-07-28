# 390px Clipping Reproduction

## Status: runtime-confirmed on homepage email capture

A local Next runtime was restored with the frozen Bun lockfile and lifecycle scripts disabled. Puppeteer used installed Google Chrome with this network policy:

- Allow only localhost/file `GET` and `HEAD`
- Abort all `/api/*` and `/t/*` requests
- Abort all non-local requests
- Abort all mutating methods

No production page, production analytics endpoint, account, or database was changed.

Evidence:

- `viewport-check.json`
- `homepage-390.png`
- `homepage-390-email-capture.png`
- `create-389.png`
- `create-390.png`
- `create-391.png`
- `mockup-390.png`
- Rerunnable measurement: `../tests/viewport-check.ts`

## Confirmed defect

At a `390 × 844` viewport, the homepage email-capture form's **Get Free Templates** button extends to `x = 440.9`, 50.9px beyond the 390px viewport. The button is visibly cut off after “Get Free Tem…”.

Measured values:

```json
{
  "clientWidth": 390,
  "scrollWidth": 390,
  "button": {
    "left": 261,
    "right": 440.9,
    "width": 179.9
  }
}
```

The document scroll width remains 390 because horizontal overflow is hidden, so the defect appears as clipping rather than a scrollbar.

Source:

- `components/EmailCapture.tsx:202-245`
- Form: `components/EmailCapture.tsx:213`
- Input: `components/EmailCapture.tsx:225-232`
- Button: `components/EmailCapture.tsx:233-239`

Cause:

- The form is always `flex` with `gap-3`.
- The email input uses `flex-1` but no `min-w-0` or mobile width/stack rule.
- The button has horizontal padding and `whitespace-nowrap`.
- The containing card has `p-8`, leaving only about 326px before the input, gap, and 179.9px button compete.
- `body { overflow-x: hidden; }` masks the overflow.

Recommended production fix, subject to approval:

- Stack the form below `sm`, e.g. `flex-col sm:flex-row`.
- Give both controls `w-full` on mobile; restore button auto width at `sm`.
- Add `min-w-0` to the email input for the horizontal layout.
- Verify loading/error/success states at 320, 360, 375, 390, 414, and 430px.
- Do not add more overflow hiding.

## Creator result: no default-state clipping at 389/390/391px

The creator's exact 390px brand breakpoint was tested at 389, 390, and 391 CSS pixels. In the default anonymous state:

| Width | Client width | Scroll width | Overflowing elements |
|---:|---:|---:|---:|
| 389 | 389 | 389 | 0 |
| 390 | 390 | 390 | 0 |
| 391 | 391 | 391 | 0 |

At 390px:

- Full wordmark: `left 12`, `right 172.2`
- Preview: `left 231`, `right 301`
- Cancel: `left 307`, `right 378`

The source-level risk at `app/create/page.tsx:1663-1676` is not a runtime defect in the default state. Autosave, signed-in, title-edit, long-text, image-cell, 90-ball, preview, and sticky-bar state combinations remain separate regression cases for any future creator change.

## Homepage overflow inventory

The automated scan found eight out-of-viewport elements:

- Four decorative gradient/blob elements that are intentionally clipped
- Three offscreen honeypot label/input elements positioned at `left: -10000px`
- One required visible action: **Get Free Templates**, which is a real defect

The scan therefore distinguishes intentional/offscreen implementation details from user-visible actionable clipping.

## Mockup verification

The local 390px CTA mockup rendered with:

- `clientWidth = 390`
- `scrollWidth = 390`
- Zero overflowing elements
- Visible closed-header create actions

## Runtime command

```bash
bun docs/traffic-recovery/2026-07-16/tests/viewport-check.ts
```

The local app server must be available at `http://127.0.0.1:3100`. The script keeps the non-local/API request block in place.
