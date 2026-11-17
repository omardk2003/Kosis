# Security, Privacy and Performance Review: Spec v0.2 (design-level)

Reviewer: security-performance-reviewer · 2026-11-11 · Scope: architecture.md §2, §4, §7-§9; product-spec AC-O*, AC-X*. No code or live systems inspected.

**Verdict: PASS WITH FIXES.** The DB-only write path, composite FKs, server-assigned `logged_at`, and select-only RLS are sound. Five items are BLOCKING for accepting ADR-0001/0006/0007.

## High

**H1 (BLOCKING). Default privileges and RPC exposure.** arch §4.3. `revoke ... on all tables` only affects existing objects. Supabase default privileges grant new tables to `anon`/`authenticated`, and Postgres grants EXECUTE on new functions to PUBLIC. A later migration that forgets a revoke exposes a SECURITY DEFINER function (callable as anon, where `auth.uid()` is null) or a writable table.
Fix: spec `alter default privileges ... revoke` for tables, functions and sequences. Every RPC starts with `if auth.uid() is null then raise`, and must also fail when no `profiles` row exists (pre-onboarding tz lookup returns null). Add a pgTAP test that enumerates `pg_proc` and `information_schema.role_table_grants` for anon/authenticated and fails on drift. Make `get_today()` SECURITY INVOKER so RLS applies. Every DEFINER query must filter `user_id = auth.uid()`. Owner: backend-engineer; qa for the test.

**H2 (BLOCKING). OTP abuse controls are unspecified.** arch §7, AC-O1. "Tightened" has no values. A 6-digit code has 10^6 possibilities. Supabase's default OTP expiry is long, and verify attempts are limited per IP, not per account (Needs verification against current Auth docs).
Scenario: a distributed attacker guesses the code for a known email within its validity window.
Fix: pin in `config.toml`: OTP expiry ≤ 600 s, minimum interval between sends ≥ 60 s, a low per-hour send and verify cap, and CAPTCHA (Turnstile) on send. Pin `shouldCreateUser: true` (unified login/signup). `false` makes the response differ and breaks AC-O1. Responses and timing must be identical for known and unknown emails, and rate-limit errors must not reveal registration. Custom SMTP is required for production (the default provider is rate-limited and not for production). Owner: lead-architect.

**H3 (BLOCKING). Service worker caches personal data.** arch §2 PWA, AC-X4. "Caches the last data" means reflections and notes sit in Cache Storage. After sign-out on a shared device, or for a different user, they stay readable.
Fix: the SW never caches authenticated HTML, RSC payloads or server-action responses unless keyed per user. Sign-out and account deletion must clear Cache Storage and unregister or purge the SW. Also state the offline cache TTL. Owner: lead-architect, then frontend-engineer.

**H4 (BLOCKING). Environment separation is undecided.** arch §9, §1. Staging is "owner to choose". Preview deployments are the usual way a preview build ends up with production keys, and Vercel previews inherit env vars unless scoped.
Fix: ADR-0007 must decide staging before any code. Production Supabase URL, keys and the service-role key are scoped to the Vercel Production environment only. Previews and local use staging or local. Production migration credentials live in a protected GitHub Environment with required approval. A runtime guard refuses to start when `NODE_ENV!=production` and the URL equals the production URL. Also §9 permits MCP read-only "logs": production logs can contain user data, so restrict this to advisors and schema. Owner: lead-architect.

**H5 (BLOCKING). Account deletion re-auth is under-specified.** arch §4.3, AC-O5.
Scenario: the action takes a client-supplied email or user id, or accepts any valid OTP, so an attacker who has an active session (from a stolen cookie) deletes it.
Fix: the target id comes only from the server-verified `auth.getUser()`. The OTP is verified for that same email within 5 minutes. The service-role client is created only in that module (`server-only` import). The action is rate limited and idempotent. After deletion, outstanding JWTs stay valid until expiry, so the RPCs must reject callers without a profile. Document backup retention. Owner: backend-engineer.

## Medium (NON-BLOCKING)

**M1. Redirect and site URL.** §7. A wildcard such as `*.vercel.app` allows redirects to attacker-owned apps. Use team-scoped preview patterns only. The OTP email template must use `{{ .Token }}`, not a link. Owner: lead-architect.

**M2. Session cookies and middleware.** §7, §3. `@supabase/ssr` browser clients set JS-readable cookies, so "httpOnly" holds only if no browser client exists (Needs verification). Spec: server client only. Middleware must call `getUser()`, never `getSession()`. Authorization must never depend on middleware alone (past Next middleware bypass CVEs), and Next must stay patched. Owner: backend-engineer.

**M3. CSP.** §7 says "CSP" with no policy. A nonce-based CSP forces dynamic rendering, which affects LCP and the SW. Spec the policy: `default-src 'self'`, nonce scripts, `frame-ancestors 'none'`, `connect-src` limited to the app (and Supabase only if the client talks to it). Add HSTS, Referrer-Policy and a Permissions-Policy. Owner: lead-architect.

**M4. Export completeness and injection.** AC-X3. PostgREST `max_rows` defaults to 1000 (Needs verification), so exports could silently truncate, which violates honest data. Paginate explicitly. In CSV, prefix cells starting with `= + - @` (formula injection from notes and habit names). Require recent auth (within 10 minutes) for export. Owner: backend-engineer.

**M5. Input and quota limits.** §4.1, §4.3. `dismiss.key` is unbounded text. `reorder_habits(ids)` is an unbounded array, and must require exact set equality with the caller's habits. Add a habit cap (for example 50), an entry rate limit per user, and a note length check in RPCs. Also add rate limiting for server actions in general. `delete_habit` cascades and erases history, which conflicts with product rule 2: require an explicit confirmation and an export prompt. Owner: backend-engineer and behavioral-product-specialist.

**M6. GDPR.** §7. Name the lawful basis. `feeling` and reflections may count as health-adjacent data, so consider explicit consent. Sign DPAs with Supabase, Vercel and the SMTP provider, and cover Vercel's non-EU edge and logs with SCCs. State backup retention after deletion. Privacy policy must be reviewed before launch. Owner: behavioral-product-specialist, lead-architect.

**M7. Performance round trips.** §8. Middleware `getUser()` (a network call to Auth) plus the `get_today()` RPC makes at least two round trips, contradicting "one round trip". Consider local JWT claim verification (`getClaims`) (Needs verification). Owner: backend-engineer.

## Low (NON-BLOCKING)

- **L1. RLS performance.** Spec `(select auth.uid())` in policies. Add `user_id` indexes on `habit_goal_versions`, `habit_status_events`, `completion_voids`, and `habits (user_id, sort_order)`. Index for `last_completed_on`: `completion_entries (habit_id, occurred_on desc)`. Owner: backend-engineer.
- **L2. Logging.** Rule: never log emails, notes or reflections. RPC exception text must not echo inputs. No error-reporting SaaS without a DPA. Owner: lead-architect.
- **L3. Bundle budget.** 150 KB gzip is feasible but tight (Next + React baseline is roughly 90-110 KB; Needs verification on the scaffold). Set an internal scaffold target of ≤ 110 KB, enforced in CI. Owner: lead-architect.
- **L4. Dependencies.** Serwist's compatibility with the chosen Next bundler (Turbopack vs webpack) Needs verification. Commit a lockfile, run `npm audit` and license check in CI, and enable Dependabot. supabase-js and `@supabase/ssr` are MIT and maintained. Owner: lead-architect.
- **L5. Timezone validation.** Querying `pg_timezone_names` per call is slow. Cache it or use a check against `pg_timezone_names` only on tz change. Owner: backend-engineer.

## Positives
`logged_at` and `occurred_on` are server-derived. Composite FKs block cross-user habit ids. `search_path=''` is specified. The service-role key is server-only and used in a single place. Bundles exclude supabase-js and zod.
