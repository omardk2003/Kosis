# DISCIPLINE — Project Instructions

> "Less planning. More doing. Less pressure. More progress."

DISCIPLINE is a mobile-first habit-building app. It helps people take action now, track
real progress honestly, and recover after missed days without guilt or fake statistics.

## Current status

- **Phase:** Specification v0.3 (reviewed by all agents, pending owner approval). No application code exists yet.
- **Owner decisions (2026-11-11):**
  - Mobile-first PWA, with native apps possible later.
  - Supabase Auth is required from launch.
  - Late logging is allowed up to 7 days back.
  - Product name: DISCIPLINE. Repository name: Kosis.
- **Gate:** No feature implementation until the owner approves v0.3, the proposed defaults in
  `docs/product-spec.md` §10.2, and decisions D1–D3 in §10.3.
- Source of truth, in order: `docs/product-spec.md` → `docs/architecture.md` →
  `docs/design-system.md` → `docs/testing-strategy.md` → `docs/mvp-roadmap.md`.
  If the code and the docs disagree, stop and flag it. Don't silently "fix" either one.

## Non-negotiable product rules

1. **Progress over perfect streaks.** Consistency is the headline metric. Streaks are never
   the primary number and are never shown as "broken".
2. **History is append-only.** Never rewrite, backfill, or delete missed days silently.
   Schedule changes create a new schedule version, effective from a date. They never
   reinterpret the past.
3. **Honest data.** Late logs keep `occurred_on` (when it happened) *and* `logged_at`
   (when it was entered) and are visibly marked as late. Never inflate, round up, or
   fabricate completion stats. Never seed demo data into a real account.
4. **Calm, not gamified.** No points, XP, badges, confetti storms, loss-aversion copy, or
   guilt notifications. Feedback is quiet and specific.
5. **Optional is optional.** Quotes, Recovery Mode guidance, and reflections can be
   dismissed or disabled, and they never block the primary action.
6. **No AI features** unless a validated user problem has been documented in the product
   spec and approved.
7. **Licensed content only.** Quotes and assets must be original, public domain, or
   explicitly licensed. Record the provenance in `content/quotes/SOURCES.md`.

## Supabase safety

- The Supabase project **"Kosis Project"** is **production**.
- Never run write SQL, apply migrations, or create, reset, or delete branches against it
  without explicit owner approval in the conversation. Read-only inspection is allowed.
- Develop and test against the local Supabase CLI stack only.
- Production migrations go through CI.
- Never commit secrets or `.env*` files. The service-role key is server-only.

## Engineering rules

- Preserve working functionality. Prefer small, reviewable diffs over rewrites.
- TypeScript `strict`. No `any` without a justifying comment.
- All dates go through the domain date utilities (`src/domain/time/*`). A "day" is a
  **local calendar date in the user's timezone** (`YYYY-MM-DD`). Never derive a day from
  a raw UTC timestamp.
- Statistics are computed from the versioned schedule and the completion log by pure
  functions in `src/domain/`. UI components never compute stats.
- Every async UI surface handles **loading, empty, error, and success** states.
- Accessibility: WCAG 2.2 AA, 44×44 px minimum touch targets, honors `prefers-reduced-motion`.
- No new runtime dependency without a one-line justification in the PR. Third-party
  skills or packages need owner approval before they're installed.

## Agent team (`.claude/agents/`)

| Agent | Model | Owns |
|---|---|---|
| `lead-architect` | opus | Architecture, ADRs, roadmap, root config/CI, sign-off on every migration & RPC |
| `behavioral-product-specialist` | opus | Product spec, behavioral rules, copy tone, metric definitions |
| `ui-ux-designer` | opus | Design system, screen specs, **sole writer of `src/styles/tokens.css`** |
| `frontend-engineer` | sonnet | `src/app`, `src/components`, `src/features/*/ui`, `src/sw.ts`, `public/`, styles except tokens |
| `backend-engineer` | sonnet | `src/domain`, `src/server`, `supabase/` (migrations, RPCs), `middleware.ts` |
| `qa-testing-engineer` | sonnet | `tests/`, `e2e/`, fixtures, `vitest.config.*`, `playwright.config.*`, `docs/testing-strategy.md` |
| `security-performance-reviewer` | sonnet | Reviews only. Writes reports to `docs/reviews/` |

### Collaboration protocol

1. **File ownership.** Each agent edits only the paths it owns (see the agent files). To
   change a file you don't own, write a change request in `docs/handoffs/<date>-<topic>.md`
   addressed to the owner. Don't edit the file. `docs/handoffs/` is create-only for every
   agent: create new files there, and edit only the handoff files you created.
   Colocated unit tests belong to the owner of the source file next to them.
2. **Contracts first.** Shared types live in `src/domain/types.ts` (owned by
   `backend-engineer`). The frontend consumes them and never redefines them.
3. **One writer per file per task.** When the lead architect runs agents in parallel, it
   assigns disjoint file sets. If two agents need the same file, they run sequentially.
4. **Decisions** go in `docs/adr/NNNN-title.md` (owned by `lead-architect`).
5. **Definition of done:** typecheck + lint + unit tests pass, required states are
   implemented, the relevant spec acceptance criteria are checked off, and no product
   rule is violated.

## Commands

_To be filled in once the stack is approved (see `docs/architecture.md` §2)._
