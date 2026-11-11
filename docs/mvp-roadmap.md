# DISCIPLINE — MVP Roadmap

Owner: `lead-architect` · Status: **v0.3, reviewed, pending owner approval** · 2026-11-11

### Changelog
- **v0.3:**
  - E2E flows split by phase (QA-5), with a core-loop smoke test at the Phase 4 exit.
  - Owner decisions D1–D6 are Phase 0 blockers.
  - Wording on delete exceptions and test layers fixed.
  - Staging is set up before any migration.
  - Serwist is dropped.
- **v0.2:** Adds the owner decisions (PWA, Supabase Auth, 7-day late window). The scaffold now comes before tokens, and the Phase 0 exit gate includes the bundle budget. E2E flows are aligned with the phases. Migrations need lead-architect and security sign-off. Auth moves into Phase 2.

Each phase ends with a gate:
- tests green, including the relevant honesty tests
- review by `security-performance-reviewer` for anything touching auth, the DB, RPCs, or dependencies
- review by `behavioral-product-specialist` for user-facing flows and copy
- review by `ui-ux-designer` for screens

## Phase 0 — Decisions & foundation
**Blocking owner inputs:**
- Confirm the proposed defaults in product-spec §10.2. Q3, Q5, and Q10 (language) affect schema or copy.
- Approve D1 (pause tomorrow) and D2 (conservative "today"). Both affect the schema and the RPCs.
- D3: create the staging Supabase project, or choose branching.
- D4 (SMTP) and D5 (CAPTCHA) can wait until Phase 2, but must be decided before launch.

1. Write ADRs 0001–0008 (lead-architect). ADR-0001 pins the Next.js version (and whether the session middleware file is named `middleware.ts` or `proxy.ts`) and the CSP policy text.
2. Finalize spec §7 and ADR-0004. They are Phase 1 exit criteria (behavioral-product-specialist + lead-architect).
3. Scaffold the repo: Next.js + TS strict, Tailwind, ESLint/Prettier, `.env.example`, `.gitignore`, CI (typecheck, lint, test) (lead-architect).
4. Set up the test harness: Vitest, Playwright, local Supabase via the CLI (qa-testing-engineer + backend-engineer).
5. Write design tokens (`tokens.css`) and screen specs for sign-in/onboarding, Today, Action Mode, and habit create/edit (ui-ux-designer).

**Exit:**
- A blank app deploys to a Vercel preview.
- CI is green.
- The empty dashboard route's JS is ≤ 110 KB gzip, the internal target under the 150 KB budget.
- Production secrets are scoped to Vercel Production only.
- Nothing has touched the production Supabase.

## Phase 1 — Trustworthy core (domain + database)
- `src/domain`: the full API in architecture §6. Pure, with full tests: the domain-layer honesty tests (testing §4), worked examples 1–3, and the golden time vectors.
- `supabase/migrations`: the tables, default-privilege revokes, the `private` schema, RLS, grants, and RPCs from architecture §4. DB-layer honesty tests H1–H4, H6, H13, H14 and H16–H21, run against local Supabase. Rehearsed on staging.
- `src/server`: Supabase server client, server actions, zod schemas.
- **Owners:** backend-engineer, qa-testing-engineer.
- **Sign-off:** lead-architect (every migration and RPC) and security-performance-reviewer (PASS).
- **Exit:**
  - The worked examples pass.
  - Cross-user and direct-PostgREST write attempts are denied in tests.
  - There's no UPDATE or DELETE path on history, except the `delete_habit` and account-deletion cascades.
  - H17 (catalog drift) is green.

## Phase 2 — Auth & core loop UI
- Email OTP sign-in, sign-out, and session middleware. Onboarding in ≤ 2 steps (timezone, week start, first habit).
- Today (primary action, sections, one-tap, undo-as-void), Action Mode, and habit create/edit/reorder/pause/archive/delete, with all states.
- **Owners:** frontend-engineer (UI), backend-engineer (middleware/actions), ui-ux-designer (review), qa (E2E 1, 2a, 3, 5a, 6a, 7, 10, 11, 13).
- **Exit:** the core loop works at 375 px. The Today budget is met. Auth E2E passes against local Supabase.

## Phase 3 — Honest progress
- Late logging, Progress (12 completed-week bars, current-week chip, per-habit heatmap, trend), and the replace-minimum-with-full action.
- **Exit:** Progress matches the domain fixtures. E2E 2b, 4a, 5b, and 6b pass.

## Phase 4 — Recovery & reflection
- Recovery (one card, options, dismissal, auto-resolve), weekly reflection, the optional daily quote (curated, licensed, off by default), and Settings (quotes, recovery, timezone).
- **Exit:** copy review and copy-lint pass. E2E 4b, 8, and 9 pass, plus the **core-loop smoke (S)**.

## Phase 5 — Hardening & release
- Installable PWA (shell-only service worker), JSON/CSV export, and account deletion.
- Full accessibility pass, security review, Lighthouse CI.
- Privacy policy, lawful basis, data processing agreements, and backup retention.
- Custom SMTP and CAPTCHA live.
- E2E 10b and 12.
- The first production migration goes through CI to "Kosis Project".
- **Exit:**
  - Security PASS.
  - Accessibility has 0 serious issues.
  - Every acceptance criterion is traced to a test.
  - The owner approves go-live.

## Later (post-MVP, validate first)
Native apps (Expo, reusing `src/domain` and the RPCs), offline write queue, `specific_days`, an optional single reminder, a week-start change (versioned), Apple/Google sign-in, and a "weeks on target" indicator. AI features only come with a documented, validated problem.

## Prioritized next tasks (after v0.2 approval)
1. Owner confirms the §10.2 defaults, D1–D3, and the language.
2. ADR-0006 (write path), ADR-0002 (append-only), ADR-0003 (time), ADR-0004 (pro-rating).
3. Repo scaffold + CI + bundle budget check.
4. Local Supabase + first migration (tables, RLS, grants), tested locally only.
5. `src/domain/time` + tests (DST/timezone fixtures).
6. `src/domain` stats + worked-example tests.
7. RPCs + integration tests (honesty suite DB level).
8. Tokens + sign-in/Today/Action Mode screen specs.
9. Auth + onboarding UI.
10. Today + Action Mode UI.
