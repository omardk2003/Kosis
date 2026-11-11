# DISCIPLINE — MVP Roadmap

Owner: `lead-architect` · Status: **v0.2, in review** · 2026-11-11

### Changelog
- **v0.2:** Adds the owner decisions (PWA, Supabase Auth, 7-day late window). The scaffold now comes before tokens, and the Phase 0 exit gate includes the bundle budget. E2E flows are aligned with the phases. Migrations need lead-architect and security sign-off. Auth moves into Phase 2.

Each phase ends with a gate:
- tests green, including the relevant honesty tests
- review by `security-performance-reviewer` for anything touching auth, the DB, RPCs, or dependencies
- review by `behavioral-product-specialist` for user-facing flows and copy
- review by `ui-ux-designer` for screens

## Phase 0 — Decisions & foundation
**Blocking owner inputs:**
- Confirm the proposed defaults in product-spec §10.2. Q3, Q5, and Q10 (language) affect schema or copy.
- Choose the staging approach (architecture §9).

1. Write ADRs 0001–0007 (lead-architect).
2. Finalize spec §7 and ADR-0004. They are Phase 1 exit criteria (behavioral-product-specialist + lead-architect).
3. Scaffold the repo: Next.js + TS strict, Tailwind, ESLint/Prettier, `.env.example`, `.gitignore`, CI (typecheck, lint, test) (lead-architect).
4. Set up the test harness: Vitest, Playwright, local Supabase via the CLI (qa-testing-engineer + backend-engineer).
5. Write design tokens (`tokens.css`) and screen specs for sign-in/onboarding, Today, Action Mode, and habit create/edit (ui-ux-designer).

**Exit:**
- A blank app deploys to a Vercel preview.
- CI is green.
- The empty dashboard route's JS is ≤ 150 KB gzip.
- Nothing has touched the production Supabase.

## Phase 1 — Trustworthy core (domain + database)
- `src/domain`: time, goals, status, stats, Action candidates, lapse detection. Pure, with full tests: the honesty suite at domain level, plus worked examples 1–3.
- `supabase/migrations`: the tables, RLS, grants, and RPCs from architecture §4, plus integration tests (RLS, RPC rules, direct-write denial).
- `src/server`: Supabase server client, server actions, zod schemas.
- **Owners:** backend-engineer, qa-testing-engineer.
- **Sign-off:** lead-architect (every migration and RPC) and security-performance-reviewer (PASS).
- **Exit:**
  - The worked examples pass.
  - Cross-user and direct-PostgREST write attempts are denied in tests.
  - There's no UPDATE or DELETE path on history.

## Phase 2 — Auth & core loop UI
- Email OTP sign-in, sign-out, and session middleware. Onboarding in ≤ 2 steps (timezone, week start, first habit).
- Today (primary action, sections, one-tap, undo-as-void), Action Mode, and habit create/edit/reorder/pause/archive/delete, with all states.
- **Owners:** frontend-engineer (UI), backend-engineer (middleware/actions), ui-ux-designer (review), qa (E2E 1, 3, 7, 11).
- **Exit:** the core loop works at 375 px. The Today budget is met. Auth E2E passes against local Supabase.

## Phase 3 — Honest progress
- Late logging, Progress (12 completed-week bars, current-week chip, per-habit heatmap, trend), and the replace-minimum-with-full action.
- **Exit:** Progress matches the domain fixtures. E2E 2, 4, 5, and 6 pass.

## Phase 4 — Recovery & reflection
- Recovery (one card, options, dismissal, auto-resolve), weekly reflection, the optional daily quote (curated, licensed, off by default), and Settings (quotes, recovery, timezone).
- **Exit:** copy review passes (no banned words). E2E 8 and 9 pass.

## Phase 5 — Hardening & release
- Installable PWA with read-only offline support, JSON/CSV export, and account deletion.
- Full accessibility pass, security review, Lighthouse CI, privacy policy.
- The first production migration goes through CI to "Kosis Project".
- **Exit:**
  - Security PASS.
  - Accessibility has 0 serious issues.
  - Every acceptance criterion is traced to a test.
  - The owner approves go-live.

## Later (post-MVP, validate first)
Native apps (Expo, reusing `src/domain` and the RPCs), offline write queue, `specific_days`, an optional single reminder, a week-start change (versioned), Apple/Google sign-in, and a "weeks on target" indicator. AI features only come with a documented, validated problem.

## Prioritized next tasks (after v0.2 approval)
1. Owner confirms §10.2 defaults, the language, and staging.
2. ADR-0006 (write path), ADR-0002 (append-only), ADR-0003 (time), ADR-0004 (pro-rating).
3. Repo scaffold + CI + bundle budget check.
4. Local Supabase + first migration (tables, RLS, grants), tested locally only.
5. `src/domain/time` + tests (DST/timezone fixtures).
6. `src/domain` stats + worked-example tests.
7. RPCs + integration tests (honesty suite DB level).
8. Tokens + sign-in/Today/Action Mode screen specs.
9. Auth + onboarding UI.
10. Today + Action Mode UI.
