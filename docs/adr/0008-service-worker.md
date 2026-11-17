# ADR-0008: Shell-only service worker
Status: Accepted · 2026-11-11 · Detail: architecture §7.3

## Decision
- **A hand-written `public/sw.js`.** No Serwist and no build step.
- **What it caches:** precaches `/offline`, an icon and the manifest. Hashed `/_next/static/*` assets are cache-first.
- **Navigations** are network-only, falling back to the offline page.
- **Never cached:** RSC payloads, server actions, APIs and authenticated HTML.
- **On sign-out,** the sign-in page purges all of Cache Storage (`?signedOut=1`). Account deletion does the same in Phase 5.
- **Registration** only in production builds. `sw.js` is served with `Cache-Control: no-cache`.

## Consequences
- An offline cold start shows the offline page. There's no personal data on shared devices.
