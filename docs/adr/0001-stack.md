# ADR-0001: Stack, versions, CSP
Status: Accepted · 2026-11-11

## Context
DISCIPLINE is a mobile-first PWA (owner decision Q1) that requires accounts (Q2), and native apps may come later. The JS budget is 150 KB gzip per route. It will be hosted on Vercel with Supabase in eu-west-1.

## Decision
**Pinned exact versions** (`--save-exact`, committed lockfile, Node 22 via `.nvmrc` and `engines`):

| Package | Version | Why |
|---|---|---|
| next | 16.4.6 | App Router, server actions, Turbopack build. In Next 16 the request hook is **`src/proxy.ts`**, which replaces `middleware.ts` |
| react / react-dom | 19.3.1 | Next peer dependency. `useActionState` |
| @supabase/ssr | 0.12.7 | Cookie sessions on the server. Uses `getClaims()` |
| @supabase/supabase-js | 2.119.0 | Auth client, server-only |
| next-intl | 4.15.0 | EN/DA (ADR-0009) |
| @marsidev/react-turnstile | 1.6.3 | Turnstile widget, the library Supabase's docs recommend |
| server-only | 0.0.1 | Fails the build if server modules leak to the client |
| typescript | **6.0.3** | Not 7.x: typescript-eslint 8 supports TypeScript below 6.1 |
| tailwindcss / @tailwindcss/postcss | 4.3.5 | CSS-first config that maps tokens with `@theme inline` |
| eslint 9 + eslint-config-next 16.4.6, prettier 3.10.0 | | Linting and formatting |
| vitest 5.1.0, @playwright/test 1.65.0, @axe-core/playwright 4.14.0 | | Tests |
| supabase (CLI) 3.1.0 | | Local stack and migrations. CI uses the same version |

- **There is no browser Supabase client.** All Auth and DB calls run on the server, in server actions and the proxy. This keeps cookies httpOnly and keeps `supabase-js` out of the client bundle. An ESLint rule forbids `createBrowserClient`.
- **Session checks:** the proxy refreshes the session with `getClaims()`. Protected pages re-check with `getClaims()`, and authorization never relies on the proxy alone.
- **CSP:** a nonce per request, set in `src/proxy.ts`:
  - `script-src 'self' 'nonce-…' 'strict-dynamic' https://challenges.cloudflare.com`
  - `frame-src` and `connect-src` include Turnstile
  - `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`
  - `style-src 'self' 'unsafe-inline'`, which Tailwind and Next need. This is an accepted risk, with no user HTML anywhere.
  - Static headers in `next.config.ts`: HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options.
- **Region:** `vercel.json` sets `regions: ["dub1"]`.

## Consequences
- Every page renders dynamically, because the CSP nonce and session require it. That's acceptable for an authenticated app.
- **Known risk:** OTP is sent from server actions, so Supabase's per-IP limits see Vercel's egress IPs. The per-email frequency limit (60 s) and Turnstile are the main protections. To be revisited with production traffic.
- **Bundle (measured 2026-11-11):** an empty Next 16 App Router app is about 132 KB gzip of module JS. The `noModule` polyfill (about 39 KB) is excluded, because modern browsers skip it. The scaffold is 135–140 KB. The 150 KB hard limit stays, and the old 110 KB internal target is replaced by "app JS ≤ ~20 KB above the framework baseline". `tests/perf/check-bundle.mjs` enforces 150 KB in CI.
- Dev-only `npm audit` findings (8 moderate, minimatch via ESLint tooling) don't ship. Runtime dependencies have 0 known vulnerabilities as of 2026-11-11.
