# MyBingoCard Error Monitoring

## Current Workflow

- Client runtime errors post to `/api/errors/client`.
- Events are stored in `error_events`.
- Fingerprints are grouped in `error_fingerprints`.
- `/admin/errors` shows grouped errors, status, source-mapped frames, deploy correlation, breadcrumbs, and visitor context links.
- `npm run errors:recent -- --hours 2 --route /game` prints a local incident report.
- `npm run errors:monitor` runs the scheduled scanner logic and checks Nginx, PM2, `error_events`, and legacy activity errors.

## Incident Command Examples

```bash
npm run errors:recent -- --hours 2
npm run errors:recent -- --hours 6 --route /game
npm run errors:recent -- --fingerprint client_abc123
npm run errors:recent -- --hours 24 --all --json
```

## Status Workflow

- `open`: needs investigation.
- `watching`: likely fixed or low-risk, but keep visible.
- `fixed`: expected to be gone. If the fingerprint recurs, the ingestion route reopens it.
- `ignored`: known noise; hidden from unresolved scanner/admin counts.

## Research Notes

- Sentry's issue-detail model emphasizes event/user counts, first/last seen, stack trace, breadcrumbs, tags, session replay, screenshots, feedback, and related traces. The MyBingoCard admin page now mirrors the most useful local parts: counts, status, stack, breadcrumbs, visitor timeline, and deploy/build fields.
- Sentry recommends Debug IDs for reliable source-map association between transformed JavaScript and original sources. MyBingoCard does not use Sentry Debug IDs yet, but it now generates private browser source maps and resolves frames server-side.
- Next.js warns that production browser source maps are disabled by default to avoid leaking source and are served automatically when enabled. MyBingoCard blocks public `/_next/*.map` access in middleware and Nginx while keeping maps available to the server process.
- Chrome's Reporting API can report browser-generated issues such as CSP, COOP/COEP, Document Policy, deprecations, interventions, and crashes in supporting browsers. This is a good next candidate for collecting issues JavaScript handlers cannot see.
- Network Error Logging can collect browser network failures from supporting browsers, but MDN marks it experimental and it depends on `NEL` plus legacy `Report-To` headers. Use cautiously and sample heavily.

## Candidate Additions

1. Add `/api/reports/browser` for Reporting API and CSP violation reports.
2. Add sampled NEL headers for Chrome/Edge network failures once endpoint volume controls exist.
3. Capture failed `fetch`/API requests as breadcrumbs with status, method, route, and duration, excluding request bodies.
4. Add user-facing feedback on the error fallback page so a user can describe what they were doing.
5. Add a small screenshot attachment flow for admin-only review after React boundary errors, gated by explicit user click.
6. Add release/deploy markers after `npm run build` plus PM2 restart so deploy correlation is exact instead of inferred from `.next/BUILD_ID` mtime.
7. Add a regression digest that lists fingerprints marked `fixed` which reopened in the last 24 hours.

## Sources

- Sentry Issue Details: https://docs.sentry.io/product/issues/issue-details/
- Sentry Debug IDs: https://docs.sentry.io/platforms/javascript/guides/ember/sourcemaps/troubleshooting_js/debug-ids/
- Next.js productionBrowserSourceMaps: https://nextjs.org/docs/13/pages/api-reference/next-config-js/productionBrowserSourceMaps
- Chrome Reporting API: https://developer.chrome.com/docs/capabilities/web-apis/reporting-api
- MDN Network Error Logging: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Network_Error_Logging
