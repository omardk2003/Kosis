# Architecture review: specs v0.1 (pre-implementation)

Reviewer: `lead-architect` · 2026-11-11 · Scope: CLAUDE.md, docs/*.md, .claude/agents/*.md

## Verdict: APPROVE WITH CHANGES

The direction is sound: a pure domain layer, versioned schedules, an append-only log and honest metrics. As written, though, the data model does not enforce the invariants it claims to. Findings 1–6 must be settled in ADRs 0002/0003 and a new ADR-0006 (write path) before Phase 1 starts.

## Findings (most severe first)

**1. Critical: writes can bypass every server-side check** (architecture §4 "Enforcement", §7).
The Supabase anon key is public, so any signed-in user can call PostgREST directly. Under the current policies (`user_id = auth.uid()` for insert), a user can insert entries with a future `occurred_on`, a date before `created_on`, a date outside the late window, or a `habit_id` that belongs to *another user*. The future-date, late-window and `created_on` checks live only in the server action. A `CHECK` constraint cannot do the job either, because it cannot run a subquery against `habits` or read the timezone.
*Fix:* make the database the only enforcement point (ADR-0006):
```sql
alter table habits add unique (id, user_id);
alter table completion_entries add foreign key (habit_id, user_id)
  references habits (id, user_id) on delete cascade;   -- same for versions/status events
revoke insert, update, delete on all tables in schema public from anon, authenticated;
-- writes go only through SECURITY DEFINER functions with `set search_path = ''`:
-- log_completion(habit_id, occurred_on date default null, variant, note)
--   today := (now() at time zone p.timezone)::date;
--   d := coalesce(occurred_on, today);
--   require owner = auth.uid(), habit not archived on d,
--     d between greatest(h.created_on, today - 7) and today;
--   source := case when d < today then 'late' else 'on_time' end;
```
The on-time path sends no date at all, which keeps `occurred_on` server-computed. The other writes follow the same pattern: `create_habit`, `change_goal`, `set_status`, `void_completion` and `delete_habit`.

**2. Critical: Drizzle bypasses RLS** (architecture §2).
Drizzle connects over a direct Postgres connection with a privileged role, so RLS never runs for those queries. The "isolation in the DB" claim becomes false.
*Fix:* drop Drizzle for MVP. Use `supabase-js` with generated types inside server actions (it carries the user JWT), and write plain SQL migrations with the Supabase CLI. Trade-off: a less ergonomic query builder. If Drizzle is kept, every transaction must run `set local role authenticated` and set `request.jwt.claims`, with a test proving it.

**3. High: voiding mutates history** (architecture §4 `voided_at`, compared with CLAUDE.md rule 2, lead-architect invariant 1 and spec §2 "visible void record").
Setting `voided_at` with an UPDATE contradicts "never UPDATE".
*Fix:* make voids their own insert-only table. "Once" becomes a primary key instead of function logic:
```sql
create table completion_voids (
  entry_id uuid primary key references completion_entries(id) on delete cascade,
  user_id uuid not null, voided_at timestamptz not null default now(), reason text);
```
After this change `completion_entries` has no UPDATE path at all.

**4. High: `habits` is mutable in ways that rewrite stats** (architecture §4).
(a) `created_on` and `status` can be updated. Moving `created_on` earlier creates past opportunities and allows earlier late logs. (b) `habits.status` duplicates `habit_status_events`, so there are two sources of truth.
*Fix:* grant column-level updates only, through `update_habit`: `name, minimum_version, note, color, sort_order, implementation_intention`. Remove `status` from `habits` and derive it from the latest event, or keep it as a cache written only by a trigger on events. Record in ADR-0002 that cosmetic fields are deliberately non-historical (AC-H2). Optionally snapshot `minimum_version` onto `minimum` entries.

**5. High: schedule versioning breaks on real edits** (architecture §4 `unique(habit_id, effective_from)`, spec AC-H3).
- A second goal change on the same day violates the unique constraint.
- A "starting today" change made after a pending "next week" version is still overridden by that pending version next week.
- No lower bound exists on `effective_from`, so a backdated version would reinterpret the past.
- §7 does not say what governs a week when the goal changes mid-week.

*Fix:* drop the unique constraint and add `seq bigint generated always as identity`. Resolve a version as `effective_from <= d order by seq desc limit 1`; the newest edit wins, which also supersedes pending versions. Enforce in `change_goal`: `effective_from >= local today`. The one exception is a weekly_count→weekly_count change, which may use the start of the current (in-progress, excluded) week. In ADR-0004, define mixed weeks: each version's segment is pro-rated by its active days.

**6. High: deferred undo commit vs midnight and offline** (spec AC-D3, architecture §8).
"Removes the pending entry before commit" means a write sent 5 s later can land after midnight and get tomorrow's date. It is also lost if the app closes during that window.
*Fix:* commit immediately (optimistic UI), and make undo a `void_completion`. Spec AC-D3 needs a handoff to `behavioral-product-specialist`. Any future offline queue (ADR-0005) must store a client `recorded_at` separately and honestly mark replays as late.

**7. Medium: §7 is not fully implementable as written** (product-spec §7, §4.3–4.6).
- Today counts as an opportunity before the day is over, so the daily % drops each morning. Count today only if it is done.
- Undefined cases: entries on paused or unscheduled days, and whether `effective_on` is inclusive.
- AC-P4 names no two compared values, and its "≥ 3 weeks" conflicts with the 4-week window. Define "last 4 completed weeks vs the 4 before them".
- AC-A1: `sort_order` is unique, so tie-breakers 2–3 can never apply. Reorder the rules or define priority tiers.
- AC-R5 and AC-D5 dismissals have no storage. Add `dismissals(user_id, kind, key, dismissed_on, unique(user_id, kind, key))`.
- The domain API needs `lastCompletedOn` per habit for Action Mode. The "this week's entries" query (§8) is not enough.

**8. Medium: time model gaps** (architecture §5).
- `week_start` history is not stored, so "applies from next week" cannot be implemented. Recommend re-bucketing all history with the current `week_start` (log unchanged, AC-P5 still reproducible) and recording this in ADR-0003. This avoids 6- or 8-day hybrid weeks.
- Validate `timezone` against `pg_timezone_names`.
- Capture the timezone at signup via `Intl` (Phase 2, not Phase 4 Settings). Show a "device timezone differs" prompt instead of silently switching.
- Define the meaning of `week_start` (ISO 1 = Mon … 7 = Sun) to match `weekdays`.
- Document that travelling east can skip a local date. That day stays a missed opportunity, which the user can late-log.

**9. Medium: stack and bundle** (architecture §2, §8).
- The domain only needs date-only math plus "now → local date". Use epoch-day integers and `Intl.DateTimeFormat` with no date library, instead of `@js-temporal/polyfill` (tens of KB gzip; needs verification against the budget) or `date-fns-tz`.
- Choose either RSC + server actions + `useOptimistic` or TanStack Query, not both.
- Keep `supabase-js` and zod off the dashboard client bundle.
- Add a 150 KB check to the Phase 0 exit gate. The App Router baseline alone uses much of that budget.
- Co-locate the Vercel and Supabase regions.

**10. Medium: agent ownership is not disjoint or complete** (agent files, CLAUDE.md table).
- `tokens.css` has two owners. Make `ui-ux-designer` the sole writer.
- `vitest/playwright.config` and CI config are claimed by both QA and lead-architect ("tooling"). Give QA the test configs, and lead-architect `package.json`, `tsconfig` and CI workflows.
- Unowned: `src/features/*/` outside `ui/`, `middleware.ts`, the service worker/manifest, `.env.example`, and `docs/screens/` vs `content/copy` wiring.
- `lead-architect` lacks write access to `docs/reviews/architecture-*.md`. This review exceeds that list; add it.
- Backend (sonnet) owns the highest-risk layer. Require lead-architect sign-off on every migration and RPC, or run Phase 1 on opus.

**11. Medium: doc and roadmap consistency** (mvp-roadmap, testing-strategy §6).
- Phase 2 claims E2E 2 and 6, but both need Progress, which arrives in Phase 3. Move them or split them.
- Spec Q3 (specific_days) and Q5 (pause) change the schema. Make them Phase 1 blockers alongside Q1/Q2/Q6.
- Spec §7 and ADR-0004 are marked "pending review" but are the Phase 1 exit criteria. Finalize them in Phase 0.
- AC-W5 says "ISO week" but the profile `week_start` is user-defined. Use the user's week, and enforce "editable 7 days" in `update_reflection`.
- "Up to 7 days back" (spec) vs "last 7 days enabled" (design-system §6): define it as `today − 7 … today − 1`.
- Honesty tests H1/H3 are DB-level and H7/H8 are UI-level, yet Phase 1 says "H1–H10 at domain level". Fix the wording.
- Phase 0 has `tokens.css` before the scaffold exists. Sequence the scaffold first.

**12. Low.** `delete_habit` must be the only DELETE path, and it must check ownership and cascade via FKs. Account deletion needs the same function pattern. `security-performance-reviewer` is read-only by prompt only (it has Write and Bash), which is acceptable but should be noted.

## Required before Phase 1
Owner approval of findings 1–2 (auth/write path) and of the stack revision (9). ADRs 0002–0004 and 0006 must reflect 3–8. Spec handoff for 6–7 to `behavioral-product-specialist`.
