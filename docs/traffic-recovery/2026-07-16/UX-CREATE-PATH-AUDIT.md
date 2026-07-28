# Homepage, Mobile, Landing-Page, and `/create` Path Audit

Read-only source audit. No application files were changed.

## Ranked findings

### 1. Shared mobile navigation hides creation behind the drawer

Below `768px`, the closed header exposes Sign In/Dashboard and a hamburger but no direct creation CTA. “Create Card” appears only after opening the drawer.

- `components/MobileNav.tsx:97-124` — closed mobile header
- `components/MobileNav.tsx:160-162` — drawer-only Create Card
- `components/MobileNav.tsx:15-16` — `overflow-x-clip` can conceal width faults
- Desktop create action: `components/MobileNav.tsx:67-70,82-85`

Recommended behavior:

- Logged out: **Make a Card** or **Create Free**
- Logged in: **New Card**
- Keep account access in the menu or as a smaller action.

Expected impact: more mobile sessions enter `/create` without an extra navigation step.

### 2. SEO landing pages have no mobile header conversion control

The reusable SEO header displays navigation and its context-prefilled CTA only at `md` and above. At `390px`, the brand remains but navigation and the header CTA do not.

- `components/SeoLandingPage.tsx:110-133`
- `components/SeoLandingPage.tsx:121` — `hidden md:flex`
- `components/SeoLandingPage.tsx:127-129` — desktop-only prefilled CTA
- Hero CTAs remain lower on the page: `components/SeoLandingPage.tsx:297-302,451-456,597-602`

Recommended mobile CTA:

- **Use This List Free**
- Microcopy: **25 editable squares ready to customize**
- For non-5×5 cards: **Start with this editable card**

Preserve the existing prefilled URL rather than routing to a blank creator.

### 3. High-intent thematic pages reset context at `/create`

Many theme pages promise a specific use case but send visitors to bare `/create`, losing the known title, cell ideas, size, free-space choice, and style.

Representative source references:

- `app/baby-shower-bingo/page.tsx:99,129,220`
- `app/wedding-bingo/page.tsx:108,138,201`
- `app/classroom-bingo/page.tsx:108,138,201`
- `app/team-building-bingo/page.tsx:99,129,220`
- `app/holiday-bingo/page.tsx:107,137,200`
- `app/music-bingo/page.tsx:108,138,201`
- `app/party-bingo/page.tsx:125,155,242`
- `app/super-bowl-bingo/page.tsx:81,99,126`

The stronger existing model is the reusable SEO page, which passes template ID, title, 5×5 size, 24 cells, and free-space state:

- `components/SeoLandingPage.tsx:83-107,297-302`

Priority conversion sequence:

1. Baby shower
2. Wedding
3. Classroom
4. Team building
5. Holiday
6. Party

Use context-specific copy such as **Start with Baby Shower Ideas** or **Build from Classroom Prompts**.

## Homepage audit

### Strengths

- Tracked primary hero CTA: `app/page.tsx:203-207`; tracking in `components/HomeStartDraftLink.tsx:21-25`
- Tracked bottom CTA: `app/page.tsx:501-508`
- Free/paid boundary is stated: `app/page.tsx:214-215,495-499`
- Links to the game library and focused game pages: `app/page.tsx:430-468`

### Mobile friction

At mobile width the initial stack is badge, long H1, capability paragraph, two CTAs, free-plan explanation, iPhone promotion, social proof, then product mockup.

- `app/page.tsx:186-251,254-257`

Recommended order at 390px:

1. Benefit-led H1
2. One primary CTA
3. Concise free proof line
4. Product/card mockup
5. Secondary template route
6. App Store promotion below the first conversion decision

Recommended labels:

- Primary: **Make a Free Card**
- Supporting line: **No account needed to start.**
- Secondary: **Start with a Template**

## Entry-path inventory

| Surface | Destination | Assessment |
|---|---|---|
| Homepage hero | `/create` | Visible and tracked; blank editor |
| Homepage bottom CTA | `/create` | Visible and tracked; blank editor |
| Shared desktop nav | `/create` | Present; logged-out version is plain text |
| Shared mobile nav | Drawer-only `/create` | Highest global mobile friction |
| Game library hero | `/create` | Appropriate blank-card secondary route |
| Templates | Prefilled `/create?...` | Strong high-intent handoff |
| Reusable SEO pages | Prefilled `/create?...` | Strong handoff; mobile header CTA missing |
| Thematic pages | Bare `/create` | Intent reset; should be prefilled |
| Homepage Quick Start | Prefilled 3×3 | Strong low-effort path |
| Existing-card edit | `/create?cardId=…` | Correct lifecycle route |
| Pricing batch offer | `/create?batchMode=1&batchCount=…` | Correct commercial context |
| Auth continuation | `/login?callbackUrl=/create` and signup equivalent | Correct return path |
| Welcome | `/create?new=1` | Correct onboarding path |

Source references:

- Game library: `app/bingo-games/page.tsx:157-170`
- Templates: `app/templates/page.tsx:262-273,382-409,611-616`
- Quick Start: `components/HomeQuickStart.tsx:61-79`
- Card detail edit: `app/cards/[id]/page.tsx:893-894`
- Dashboard edit: `app/dashboard/page.tsx:343-344`
- Batch edit: `app/dashboard/cards/page.tsx:615-617`
- Pricing: `app/pricing/page.tsx:221-222`
- Auth continuation: `app/create/page.tsx:1814-1819`
- Welcome: `app/welcome/page.tsx:90,158`

## SEO and internal-link findings

Strengths:

- Canonical/Open Graph/Twitter metadata: `lib/seo-landing-pages.ts:1735-1755`
- Structured data includes WebPage, WebApplication, FAQPage, HowTo, and BreadcrumbList: `components/SeoLandingPage.tsx:172-258`
- The 27 reusable SEO landing slugs are represented in `public/sitemap.xml`.
- `public/robots.txt` references the sitemap.

Improvements:

1. Preserve reusable SEO pages' prefilled handoff.
2. Replace bare thematic `/create` links with contextual prefill.
3. Standardize the shared, SEO, templates, and legacy responsive headers.
4. Move mobile App Store promotion below the first web-product conversion decision.
5. Keep one context-specific creator CTA on each priority organic page.

## Recommended production order

1. Always-visible mobile create CTA in shared navigation.
2. Context-prefilled mobile CTA in `SeoLandingPage`.
3. Prefilled links for the six priority thematic pages.
4. Standardize remaining custom public headers.
5. Run exact 389/390/391px runtime measurement before changing clipping code.
6. Fix the measured width source; do not use overflow hiding as the remedy.
