# Architecture review: Phase 0 (2026-11-11)

Reviewer: `lead-architect` · Scope: commit `441d881`. Line numbers refer to that commit, not to uncommitted edits.

## Verdict: APPROVE WITH CHANGES
The scaffold is server-first and within its boundaries: no browser Supabase client, and no client imports of next-intl or of server modules other than actions. Packages are pinned exactly. Phase 0 can't exit yet.

## Findings

### BLOCKING
1. **The bundle check counts a script modern browsers skip.** `tests/perf/check-bundle.mjs:38` includes Next's `noModule` polyfill (`0cz1d0mv5g_q7.js`, 38.6 KB gzip). Re-measured with module scripts only: `/` 135.4 KB, `/sign-in` 139.4 KB. The empty-app baseline is about 132 KB, not 170.3. Skip `nomodule` scripts, then correct architecture §8 and QA finding B1. (qa)
2. **Network failures on sign-in aren't handled.** `sign-in-form.tsx:112,141,151,159` set `aria-disabled={blocked}` but only `disabled={busy}`, so the forms submit while offline. A failed request then throws from `useActionState`, and `src/app/` has no `error.tsx` or `global-error.tsx` to catch it. Block submission and add both files. (frontend)
3. **Docs disagree with the code:**
   - ADR-0009 still describes `NextIntlClientProvider`, but copy is passed from the server as props.
   - ADR-0001 still states 150/110 KB.
   - ADR-0007 says no service-role key is used, but `ci.yml:55-57` uses the local stack's key.
   - Architecture §1–§3 name `middleware.ts` and `src/sw.ts`, and `src/i18n/` has no owner.
   - §7.3 says "unregister" but `purge-caches.ts:7` calls `update()`.
   - CLAUDE.md status and Commands are stale. (lead-architect)
4. **Review gates are missing:** security-performance-reviewer (auth, CSP, service worker, dependencies, migration), UI review, and copy review including the OTP email.

### NON-BLOCKING
5. **Countdown clock skew:** `sign-in-form.tsx:192-200` compares the server's `sentAt` (`actions.ts:36`) with the client clock, so a client 5 min behind shows "360 s". The first code-step render also uses a stale `now`. Count from client receipt.
6. `actions.ts:41,49` trusts `prev`, which `useActionState` round-trips through the client. Validate it and re-run `normalizeEmail`.
7. `otp.ts:40` treats every 4xx as success, so `email_address_invalid` leaves the user stuck on the code step. Map it to `invalid_email`. This doesn't risk enumeration.
8. No E2E test covers resend, restart, the countdown, or a rate-limited resend.
9. `proxy.ts:5` is a denylist. Use a public allowlist (`/`, `/sign-in`, `/offline`) so new routes are protected by default. Nothing ever sets `?ended=1`.
10. `getClaims()` (`proxy-session.ts:36`) verifies locally only with asymmetric keys. ADR-0001 should require them in staging and production.
11. Add an ESLint rule so `src/components` and `src/features` import only `@/server/**/actions`.
12. `sw.js:7`: `VERSION` is constant, so the cache grows forever and `/offline` goes stale. Derive it from the build ID.
13. CI:
    - Actions are pinned by tag, not SHA.
    - It builds twice.
    - The `ci.yml:60` label says 110 KB while the limit is 185.
    - There's no default-ACL catalog test yet.
14. The baseline migration matches the parts of architecture §4.3 that apply before tables exist. **Lead-architect sign-off granted, conditional on a security PASS.** Consider dropping `graphql_public` (`config.toml:14`).
15. `vercel.json` follows ADR-0007, but it blocks the preview exit item until the owner enables one branch.

## D7 recommendation
Finding 1 changes the premise. The stack already meets 150 KB with about 10 KB to spare. It misses the 110 KB target by about 25–30 KB, almost all of it framework code.

- **A (recommended):** Keep Next 16. Make 150 KB (module scripts, gzip) the hard CI limit. Replace the 110 KB target with "app-owned JS ≤ 20 KB above the framework baseline", and add Lighthouse LCP/INP checks from Phase 2. Trade-offs:
  - The headroom is thin.
  - Today and Action Mode must stay server-rendered with only small client components.
  - Upgrades can erode the margin, so re-measure the baseline on each one.
  - Turnstile's external script isn't counted.
- **B:** Keep the 185 KB ceiling. Rejected: it budgets for the polyfill and loosens the guard by about 45 KB.
- **C:** Move to a Vite SPA or Preact. That saves 60–90 KB, but it needs a browser Supabase client, which breaks ADR-0006's httpOnly cookies, and means redoing CSP, i18n and actions. Rejected.

Record the decision as ADR-0010 once the owner approves.

## Phase 0 exit checklist
- [ ] Preview deploy: blocked by `vercel.json` until the owner opts in and completes O4 env scoping.
- [ ] CI green: passes locally, but the GitHub run is pending and the last completed run failed.
- [~] Bundle: 135/139 KB, within 150 KB but over 110 KB (D7).
- [ ] Production secrets scoped to Production only: owner to verify.
- [ ] Production untouched: owner to confirm.
- [x] ADRs 0001–0009 written (0001, 0007 and 0009 need amending).
- [x] Scaffold, harness, tokens and screen specs.
- [ ] Security PASS, UI review and copy review.

## Before Phase 1
- Fix findings 1–4.
- Owner: decide D7, approve architecture and roadmap v0.3 (still marked "pending"), confirm §10.2 Q3/Q5, and supply the staging ref (D3).
- lead-architect: write `docs/handoffs/plan-phase1.md`.

## Verification (93e29f7)
Re-checked read-only on `claude/project-setup` @ `93e29f7`. I re-ran `check-bundle.mjs` against the local build.

| # | Blocker | Status | Evidence |
|---|---|---|---|
| 1 | Bundle measurement | **RESOLVED** | `check-bundle.mjs:36-42` skips `nomodule` scripts, and the default limit is 150. My re-run measured `/` at 136.0 KB and `/sign-in` at 140.3 KB, so both pass. D7 is withdrawn. ADR-0001 and §8 record the 150 KB hard limit plus the "app JS ≤ ~20 KB over the baseline" rule. |
| 2 | Offline and network failure on sign-in | **RESOLVED** | `sign-in-form.tsx:88,114,165,196-197` cancel submission with `preventDefault` while `blocked` (and, for resend, during the countdown). `src/app/error.tsx` uses server copy through `ErrorCopyProvider`, so there's no next-intl client runtime. `global-error.tsx` uses fixed bilingual text, a documented AC-X6 exception. |
| 3 | Doc drift | **RESOLVED, with leftovers** | ADR-0001, ADR-0007, ADR-0009, §7.3, §8, the §3 `src/proxy.ts` and `src/i18n/` rows, and CLAUDE.md (status and Commands) are now aligned. A few stale lines remain, downgraded to NON-BLOCKING: `architecture.md:33` ("no application code yet"), `:36` ("pending ADR-0001"), `:69` (`sw.ts` row), `:369` (139.7, but the measured value is 140.3), and `ci.yml:60` (the "≤110 KB" label). lead-architect fixes them in the next docs pass. |
| 4 | Review gates | **RESOLVED** | Security is PASS WITH FIXES with no blockers, and it covers the migration (M3). UI and product are APPROVE WITH CHANGES. The orchestrator reports their blockers fixed in `f823cd9`/`8b28f90`; I didn't re-verify that. Non-blocking items are in `docs/handoffs/2026-11-11-phase0-followups.md`. |

Migration sign-off for `20261111180000_security_baseline.sql`: the security review passed, which met the condition, so the sign-off is now **unconditional**. M3 (`supabase_admin` default privileges) is tracked for Phase 1.

**Updated verdict: APPROVE.** Non-blocking findings 5–13 remain open. Findings 9, 13 and 14 overlap with follow-ups 3, 5, 6 and 7.

### Updated Phase 0 exit checklist
- [ ] A blank app deploys to a Vercel preview. **Owner:** turn deployments on for one branch in `vercel.json` and finish the O4 environment-scope check.
- [ ] CI is green on GitHub for `93e29f7`. **Owner:** confirm the run. It passes locally (typecheck, lint, format, 29 unit, 28 e2e, bundle).
- [x] Bundle is ≤ 150 KB gzip per route: 136.0 / 140.3 KB.
- [ ] Production secrets are scoped to Production only. **Owner:** dashboard check (O4).
- [ ] Nothing has touched production. **Owner:** confirm.
- [x] ADRs 0001–0009 are written and aligned.
- [x] Scaffold, test harness, tokens and screen specs.
- [x] Security, UI and product reviews are done, with blockers fixed.

**Before Phase 1:** the owner confirms the §10.2 defaults (Q3, Q5 as corrected, Q16), approves architecture and roadmap v0.3, and supplies the staging ref (D3). lead-architect then writes `docs/handoffs/plan-phase1.md`.
