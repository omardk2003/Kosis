# DISCIPLINE — Architecture

Owner: `lead-architect` · Status: **Draft v0.1, pending review and owner approval of the stack** · 2026-11-11

## 1. Current state
Greenfield. No application code, no repository attached to the working session yet. Nothing
to preserve beyond these specs.

## 2. Recommended stack (proposal — needs approval)

| Concern | Choice | Why |
|---|---|---|
| App type | **Responsive PWA** (installable, offline-tolerant) | Mobile-first with one codebase. Ships fastest and avoids app-store review. Native can come later. |
| Framework | **Next.js (App Router) + React + TypeScript (strict)** | Server actions for mutations, server-assigned timestamps, mature ecosystem, easy hosting. |
| Styling | **Tailwind CSS** + CSS custom-property tokens | Tokens from design-system.md map 1:1 and stay small. |
| Data/Auth | **Supabase (Postgres + Auth + Row-Level Security)** | Relational model fits versioned schedules and append-only logs. RLS enforces per-user isolation in the DB. |
| DB access | **Drizzle ORM** + SQL migrations | Typed queries, plain SQL migrations, small runtime. |
| Validation | **zod** at every server boundary | One schema for runtime validation and types. |
| Client data | **TanStack Query** | Caching, optimistic updates with rollback, retry. |
| Dates | **Temporal API via `@js-temporal/polyfill`** (or `date-fns-tz` if bundle size argues against it) | Correct local-date math across DST and timezones. |
| Charts | **Hand-rolled SVG** components | Two simple charts don't justify a 50–100 KB chart library. Full control over honest rendering. |
| Tests | Vitest, Testing Library, fast-check (property tests), Playwright, axe-core | See testing-strategy.md. |
| Hosting | Vercel (app) + Supabase (managed Postgres) | Low ops. Both have free tiers for MVP. |

**Alternatives considered**
- *Expo / React Native:* best if native apps are mandatory at launch (§10 Q1 in the spec).
  The domain layer (`src/domain`) is framework-free so it ports over unchanged.
- *Local-first (IndexedDB/SQLite + sync later):* great privacy and offline support, but sync
  plus append-only conflict handling adds real complexity. Recommended only if accounts
  aren't needed at launch (spec §10 Q2).
- *Vite SPA + separate API:* more moving parts than Next.js for the same result.

## 3. Module layout
```
src/
  domain/            # pure TS, no I/O, no React (backend-engineer)
    types.ts         # shared contract
    time/            # local-date utils, week boundaries, tz handling
    schedule/        # version resolution: scheduleOn(habit, date)
    stats/           # opportunities, completions, consistency
    action/          # Action Mode ranking
    recovery/        # lapse detection
  server/            # server actions, repositories, zod schemas (backend-engineer)
  features/<name>/ui # feature components (frontend-engineer)
  components/        # shared UI primitives (frontend-engineer)
  app/               # routes (frontend-engineer)
  styles/tokens.css  # design tokens (ui-ux-designer ↔ frontend-engineer)
db/migrations/       # SQL migrations (backend-engineer)
content/quotes/      # curated quotes + SOURCES.md (behavioral-product-specialist)
tests/, e2e/         # (qa-testing-engineer)
```
Dependency direction: `app → features → components`, and everything → `domain`. The domain
imports nothing from the outer layers.

## 4. Data model (Postgres)

```sql
profiles(            -- 1:1 with auth.users
  user_id uuid pk, timezone text not null, week_start smallint not null default 1,
  quotes_enabled bool, recovery_enabled bool, created_at timestamptz)

habits(
  id uuid pk, user_id uuid not null, name text not null, minimum_version text,
  note text, color text, sort_order int not null,
  status text check (status in ('active','paused','archived')),
  implementation_intention text,
  created_on date not null,          -- local date
  created_at timestamptz default now(), updated_at timestamptz)

habit_schedule_versions(               -- append-only
  id uuid pk, habit_id uuid not null, user_id uuid not null,
  goal_type text check (goal_type in ('daily','weekly_count','specific_days')),
  target_per_week smallint,          -- weekly_count
  weekdays smallint[],               -- specific_days (1=Mon..7=Sun)
  effective_from date not null,      -- local date
  created_at timestamptz default now(),
  unique(habit_id, effective_from))

habit_status_events(                   -- append-only: pause/resume/archive/unarchive
  id uuid pk, habit_id uuid, user_id uuid, status text, effective_on date,
  created_at timestamptz default now())

completion_entries(                    -- append-only
  id uuid pk, habit_id uuid not null, user_id uuid not null,
  occurred_on date not null,         -- local date it happened
  logged_at timestamptz not null default now(),   -- server-assigned
  source text check (source in ('on_time','late')),  -- derived server-side
  variant text check (variant in ('full','minimum')) default 'full',
  note text,
  voided_at timestamptz, void_reason text)   -- only column ever set after insert

weekly_reflections(
  id uuid pk, user_id uuid, week_start date, went_well text, got_in_way text,
  adjustment text, feeling smallint check (feeling between 1 and 5),
  created_at timestamptz, updated_at timestamptz,
  unique(user_id, week_start))
```

**Indexes:** `completion_entries(user_id, occurred_on)`,
`completion_entries(habit_id, occurred_on)`,
`habit_schedule_versions(habit_id, effective_from)`.

**Enforcement of invariants (in the DB, not just the app)**
- RLS on every table: `user_id = auth.uid()` for select/insert, with no cross-user access.
- `completion_entries`: there's no UPDATE policy except through a `void_entry(id, reason)`
  security-definer function that can only set `voided_at`/`void_reason` once. There's no
  DELETE policy (except account/habit deletion via a dedicated function).
- `logged_at` and `source` are set by a trigger (`source = 'late'` when
  `occurred_on < (logged_at AT TIME ZONE profile.timezone)::date`). Client values are
  ignored.
- `habit_schedule_versions` and `habit_status_events`: insert-only.
- Check constraint: `occurred_on <= local today + 0` (enforced in server action, with tz) and
  `occurred_on >= habit.created_on`. The late window is enforced in the server action.

**Habit deletion** (spec AC-H6) is the single exception to append-only. It's an explicit
user action that hard-deletes the habit and its child rows through `delete_habit(id)`, in
one transaction.

## 5. Time model
- A "day" is a local date (`YYYY-MM-DD`) in the profile timezone at the moment of action.
- `occurred_on` is always computed **on the server** from the user's timezone for
  on-time completions. For late logs it's chosen by the user and validated.
- Timezone changes: the profile timezone changes going forward. Existing entries keep their
  `occurred_on` (dates don't move). Recorded in an ADR.
- Week boundaries come from `profile.week_start`. Changing it applies from the next week.

## 6. Domain API (contract sketch)
```ts
scheduleOn(versions, date): ScheduleVersion | null
opportunitiesForWeek(habit, versions, statusEvents, weekStart, today): number
completedForWeek(habit, versions, entries, weekStart, today): number
weeklyConsistency(input, weekStart, today): { pct: number | null; completed; planned; lateCount }
rankActionCandidates(habits, ..., now, tz): Array<{ habitId; reason }>
detectLapses(habits, ..., today): Array<{ habitId; kind; lapseKey }>
```
All functions are pure and take `today`/`now` and the timezone as arguments.

## 7. Security
- Supabase Auth (email magic link + passkey/OAuth later). Sessions in httpOnly cookies.
- All mutations go through server actions with zod validation. The client never sends
  `user_id`, `logged_at`, or `source`.
- CSP, no `dangerouslySetInnerHTML` on user content, rate limits on auth.
- Privacy: no third-party trackers. Product analytics (if any) are opt-in and self-hosted
  or cookieless. Account deletion and export are in scope.
- Secrets: only `NEXT_PUBLIC_SUPABASE_URL`/anon key on the client. The service role is
  server-only.

## 8. Performance budgets
- Dashboard initial JS ≤ 150 KB gzip. LCP ≤ 2.0 s, INP ≤ 200 ms (Moto G-class, 4G).
- Dashboard data in ≤ 2 queries (habits + versions + this week's entries). Progress page
  loads 12 weeks of entries in one bounded, indexed query and computes stats in the domain
  layer.
- Charts and Progress are route-split. Optimistic completion feedback < 100 ms.
- Offline (PWA): cache the app shell. Offline writes are queued (Phase 2. See roadmap).

## 9. ADRs to write before implementation
0001 Stack · 0002 Append-only log & void semantics · 0003 Time model & timezone changes ·
0004 Weekly-count pro-rating · 0005 Offline strategy.
