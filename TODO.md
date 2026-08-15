# MyBingoCard - Feature Ideas & Roadmap

## Playful Confetti Redesign Migration (IN PROGRESS)

Source of truth: `/Users/coryanalla/Developer/mybingocard-redesigns` (approved 05 Playful Confetti prototype).
Production source: `/Users/coryanalla/Developer/mybingocard` on branch `playful-confetti-redesign`.
Plan detail: `projects/mybingocard/Kimi Rebuild/Next.js Production Rebuild Todo.md` in Obsidian.
Rebuild approved by Cory on August 3, 2026. Production deploy requires a separate explicit GO.

- [ ] Phase 1 — Design system port: move `confetti-site.css` tokens into the Next.js design system, consolidate inline styles from the approved homepage and creator, keep mobile rules (16px inputs, 44px tap targets, no vw font scaling, reduced-motion).
- [ ] Phase 2 — Page components: rebuild the 31 verified prototype pages as App Router components, generate ~40 live SEO occasion pages from `MBC_GAMES`, port interactive behavior (create-flow starters, chip filters, dashboard actions).
- [ ] Phase 3 — Backend wiring: replace demo auth with real Apple/Google/email auth, connect dashboard/library/games/activity/settings to real DB queries, wire Stripe checkout/billing, reconnect PDF export and print, decide live game sync strategy (currently SSE rooms).
- [ ] Phase 4 — Verify and deploy: responsive sweep at 1440px + 430px, zero overflow and zero JS errors, click-through suite, physical iPhone 14 Pro Max check, deploy only on explicit GO.

## High Priority

- [ ] **Picture Bingo Cards** - Let users add images to cells (like Lotería / Mexican bingo) — upload custom images or pick from a built-in icon library
- [ ] **AI Content Generator** - "Generate bingo items for a baby shower" using OpenAI/Claude

## Core Features

- [ ] **Drag & Drop Editor** - Better card creation UX with drag-to-reorder cells
- [ ] **Import from Spreadsheet** - Upload CSV/Excel to populate cards

## Sharing & Engagement

- [ ] **Public Gallery** - Browse and clone popular community cards
- [ ] **Embed Widget** - `<iframe>` code to embed playable cards on other sites

## Game Modes

- [ ] **Pattern Modes** - X pattern, four corners, blackout, etc.
- [ ] **Timed Games** - Countdown timer for competitive play
- [ ] **Leaderboards** - Global leaderboard (personal game stats exist, need cross-user rankings)
- [ ] **Team Play** - Groups compete against each other

## Business Features

- [ ] **Teams/Organizations** - Shared workspace for companies/schools
- [ ] **Analytics Dashboard** - Custom dashboard UI (GA events + game stats exist, need dedicated page)
- [ ] **White Label** - Custom branding for enterprise customers
- [ ] **API Access** - Let developers create cards programmatically

## Export & Print

- [ ] **Print Layouts** - Add 6-up cards per page (1/2/4-up done)
- [ ] **Card Backing** - Printable card backs with instructions

## Mobile

- [ ] **Offline Mode** - Improve offline support (basic caching exists, need full offline play)
- [ ] **Native App** - iOS/Android apps (Expo/React Native)

## Integrations

- [ ] **Google Classroom** - Direct integration for teachers
- [ ] **Slack Bot** - Play bingo in Slack channels
- [ ] **Zoom App** - Bingo during video calls
- [ ] **Calendar Integration** - Schedule game sessions

## Marketing & SEO

- [ ] **Email Sequences** - Full marketing automation (basic transactional emails + drip script exist)

## Technical Debt

- [ ] **Add Tests** - Unit and E2E tests
- [ ] **Error Tracking** - Sentry or similar
- [ ] **Performance Monitoring** - Track page load times
- [ ] **Image Optimization** - Compress user-uploaded images

---

## Completed

- [x] User authentication
- [x] Basic card creation
- [x] PDF export
- [x] Share via link
- [x] Templates page
- [x] Pricing page UI
- [x] Favicon
- [x] Stripe payments - Subscriptions ($4.99/mo), batch packs, webhooks, billing portal
- [x] Live multiplayer bingo - SSE real-time rooms, join codes, host/player roles, server-validated claims
- [x] 24 pre-made templates across 10 categories
- [x] Custom themes - 6 presets + custom colors, fonts, font sizes
- [x] Bulk card generation - 30/100/250/500 shuffled card packs
- [x] Sound effects - 4 Web Audio API sounds with toggle
- [x] Social sharing - Facebook, Twitter, Pinterest, copy link
- [x] QR code generation - Print-optimized via qrserver.com
- [x] High-res PNG export - Up to 2400px (Premium)
- [x] Batch PDF export - Multi-card PDF with 1/2/4-up layouts
- [x] PWA support - manifest.json + service worker
- [x] Blog - 6 SEO posts
- [x] SEO landing pages - 12+ keyword pages
- [x] Affiliate/referral program - Referral codes, tracking, dashboard
