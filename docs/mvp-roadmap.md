# DISCIPLINE — MVP Roadmap

Owner: `lead-architect` · Status: **Draft v0.1, awaiting owner approval** · 2026-11-11

Each phase ends with a gate: tests green, the honesty suite green, and reviews by
`security-performance-reviewer` (where flagged) and `behavioral-product-specialist` (for
any user-facing copy or flow).

## Phase 0 — Decisions & foundation (needs your approval first)
- Resolve open questions (product-spec §10), especially platform, accounts, and the late window.
- ADRs 0001–0005. Repo setup: Next.js + TS strict, Tailwind, lint/format, Vitest,
  Playwright, CI, local Supabase.
- Design: tokens.css, screen specs for Today, Action Mode, and Habit create/edit.
- **Owners:** lead-architect (ADRs, scaffold), ui-ux-designer (tokens, specs),
  behavioral-product-specialist (finalized spec §7 + copy), qa (test harness).
- **Exit:** a blank app deploys to a preview URL and CI runs.

## Phase 1 — Trustworthy core (domain + data)
- `src/domain`: time, schedule versions, stats, Action ranking, lapse detection, all pure
  with full tests (honesty suite H1–H10 at the domain level).
- DB schema, RLS, triggers (`logged_at`/`source`), void function, migrations.
- Server actions: habits CRUD/archive/delete, completions (on-time, late, void).
- **Owners:** backend-engineer · qa-testing-engineer. **Review:** security-performance.
- **Exit:** the worked examples in spec §7 pass. RLS cross-user tests pass.

## Phase 2 — Core loop UI
- Auth + onboarding (≤ 2 steps) · Today dashboard (primary action, list, one-tap, undo) ·
  Action Mode · Habit create/edit/archive/delete · all states.
- **Owners:** frontend-engineer (UI), ui-ux-designer (review), qa (E2E 1–3, 6–7).
- **Exit:** the core loop works at 375 px. Performance budget is met on Today.

## Phase 3 — Honest progress
- Late logging · Progress (12-week consistency bars, per-habit heatmap, trend sentence).
- **Exit:** Progress numbers match the domain fixtures. E2E 4–5 pass.

## Phase 4 — Recovery & reflection
- Recovery Mode cards + options · Weekly reflection · Optional daily quote (curated,
  licensed list) · Settings (quotes, recovery, week start, timezone).
- **Exit:** copy review passed (no banned words). E2E 8–9 pass.

## Phase 5 — Hardening & release
- PWA install + app-shell offline, export (if approved), account deletion, full
  accessibility pass, security review, Lighthouse CI, privacy policy.
- **Exit:** security PASS, a11y 0 serious, all ACs traced to tests.

## Later (post-MVP, validate first)
Offline write queue · optional single reminder · native wrapper/Expo · "weeks on target"
indicator · data import. AI features only with a documented, validated problem.

## Prioritized first 10 tasks (after approval)
1. Owner answers spec §10 (Q1, Q2, Q6 are blocking).
2. ADR-0001 stack + ADR-0002 append-only + ADR-0003 time model.
3. Repo scaffold + CI + test harness.
4. `src/domain/time` + tests (DST/tz fixtures).
5. `src/domain/schedule` + `stats` + worked-example tests.
6. DB schema + RLS + triggers + integration tests.
7. Server actions for habits & completions.
8. Design tokens + Today / Action Mode specs.
9. Today dashboard + Action Mode UI.
10. Habit create/edit/archive/delete UI.
