# Security & performance review: Phase 0 (2026-11-11)

Scope: branch claude/project-setup. Read-only; local checks only (`npm audit`, grep, source reading). Nothing run against remote services.

## Verdict: PASS WITH FIXES
No Critical/High findings. No blocking issues for Phase 0 (no domain tables, no personal data stored). Items below must be closed before Phase 1 or launch as noted.

## Findings

### Medium
**M1. Production CAPTCHA and rate limits are not enforced in repo (NON-BLOCKING, gate: before launch)**
`supabase/config.toml:219-222` has `[auth.captcha]` commented out. `src/server/auth/actions.ts:103-109` passes `captchaToken` as `undefined` when absent. If the staging or production dashboard lacks Turnstile, Supabase accepts token-less requests and the widget is decorative.
Scenario: a script POSTs the server action without a token and triggers unlimited OTP emails to arbitrary addresses (per-email 60 s limit only).
Fix (backend-engineer/owner): add a launch checklist item to verify the dashboard setting; add an e2e on staging that a token-less send returns `captcha_failed`.

**M2. Per-IP Supabase limits see Vercel egress IPs (NON-BLOCKING, already acknowledged in ADR-0001)**
OTP calls are made from server actions, so `token_verifications` and `sign_in_sign_ups` (30 each) are shared across all users. One attacker can exhaust the pool and lock everyone out of sign-in (DoS). Conversely, 6-digit brute-force protection per user depends on Supabase's per-token attempt handling. Needs verification: whether the app-level IP can be forwarded. Fix: add an app-level per-IP+email limiter (e.g. Upstash/Vercel KV, needs owner approval as a dependency) before launch. Owner: backend-engineer.

**M3. Migration default privileges cover only role `postgres` (NON-BLOCKING, Needs verification)**
`supabase/migrations/20261111180000_security_baseline.sql:4-7`. Tables created by other roles (`supabase_admin`, dashboard SQL editor) still receive Supabase's default anon/authenticated grants. ADR-0006 deny-by-default then relies on RLS alone for those. Fix: add `for role supabase_admin` variants (if permitted locally) or a CI check that fails when any public table lacks RLS or has anon grants. Owner: backend-engineer / qa.

### Low
**L1. Production guard is hostname-ref only (NON-BLOCKING)** `src/server/env.ts:23-29`. A custom Supabase domain or pooler hostname pointing at production bypasses it. Fail-closed behaviour is good: `VERCEL_ENV` unset throws. Build-time inlining does not defeat it: `readSupabaseEnv` reads through a `process.env` object parameter, which Next does not statically inline, and the module is server-only. Fix: invert to an allowlist (staging ref required unless `VERCEL_ENV=production`) and add a test for a custom domain. Needs verification on a Vercel preview that `VERCEL_ENV` is present in the proxy runtime (documented by Vercel, not observed here).

**L2. Redirect from proxy drops CSP and Supabase cache headers** `src/proxy.ts:34-37` copies cookies only. Redirects carry no `Cache-Control: no-store` that Supabase sets on refresh, so a shared cache could store a response with Set-Cookie. Fix: copy `from.headers` for `cache-control`, `expires`, `pragma`, and the CSP. Owner: backend-engineer.

**L3. `style-src 'unsafe-inline'`** `src/server/csp.ts:15`. Accepted trade-off for Next/Tailwind. Script injection is blocked (nonce + strict-dynamic, no `unsafe-inline` in `script-src`). Add `report-to` before launch. Under strict-dynamic the Turnstile host allowlist is ignored by modern browsers; harmless.

**L4. GitHub Actions pinned by tag, not SHA** `.github/workflows/ci.yml` (checkout, setup-node, upload-artifact @v4). Permissions are `contents: read` and there are no secrets, so the exposure is low. Fix: pin to SHAs via Dependabot. The service-role key exported to `GITHUB_ENV` is the local-stack key and is masked, and `pull_request` (not `_target`) is used: acceptable.

**L5. `mapSendError` returns success for unknown 4xx** (`src/server/auth/otp.ts:205`) and distinguishes 5xx. Good for non-enumeration. Residual: if user-specific failures return 5xx, a timing or status oracle is possible. Needs verification against staging.

**L6. Service worker offline page** `public/sw.js:246`. The cached `/offline` HTML embeds a stale nonce, and its own cached CSP header should match it. Needs verification offline in a real browser. No personal data is cached: navigations are network-only, only `/_next/static/` and the shell are stored, and non-GET requests are skipped.

## Verified OK
- `getClaims` used everywhere (proxy and `getVerifiedUserId`); `getSession` is absent. No browser Supabase client. `/today` re-checks the user (defense in depth).
- Nonce: 122-bit UUID, base64, per request, set on request and response. `object-src 'none'`, `base-uri`, `frame-ancestors 'none'`, and `form-action 'self'` are all present. Dev-only `unsafe-eval`.
- Server actions rely on Next's built-in Origin/Host check (CSRF); no `allowedOrigins` widening. `setLocale` validates against an allowlist; no redirect target is user-controlled; cookie is HttpOnly, Lax, Secure in production. `signedOut` is only a boolean flag, and a forged link only purges harmless caches.
- Input validation: email normalised, 254 length cap, 6-digit code regex. (zod is not used yet; hand-rolled validators are adequate here. Adopt zod when Phase 1 writes arrive.)
- No secrets in repo; `.env*` ignored with `.env.example` allowed; `.env.example` contains names only.
- `vercel.json` disables git auto-deploy. HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options all set.
- `npm audit --omit=dev`: 0 vulnerabilities. Full audit: 8 moderate (minimatch DoS via typescript-eslint, dev-only, not shipped).

## Performance: bundle (NON-BLOCKING)
The 174/178 KB gzip against the 170.3 KB empty Next 16 baseline means the app adds roughly 4-8 KB. The 185 KB interim ceiling in `tests/perf/check-bundle.mjs` is acceptable and well-founded. The original 150 KB budget is unreachable with the approved stack, so owner decision D7 is required. Marking the CI step name "≤110 KB internal target" (`ci.yml`) is misleading: update it to 185 KB. Recommend an LCP/INP measurement once real screens exist.
