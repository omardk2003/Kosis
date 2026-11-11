# DISCIPLINE — Architecture

Owner: `lead-architect` · Status: **v0.2, in review** · 2026-11-11

### Changelog
- **v0.2:** Adds the owner decisions: a PWA, Supabase Auth required, and a 7-day late window. Incorporates `docs/reviews/architecture-review-2026-11-11.md` findings 1–12:
  - The database is the only write path (SECURITY DEFINER RPCs). Clients have no table writes.
  - Drizzle is dropped in favour of `supabase-js` plus SQL migrations.
  - Voids live in their own insert-only table.
  - `habits` holds cosmetic fields only. Status comes from events.
  - Goal versions use `seq`, and the newest version wins.
  - Undo commits immediately.
  - Dismissals get a table.
  - The time model is completed.
  - Temporal and TanStack Query are dropped.
  - Agent ownership is made disjoint.
  - Environments are separated: local, staging, and production.
- **v0.1:** Initial draft.

## 1. Current state
- **Repository:** `omardk2003/Kosis` holds the docs and agent configuration only. There's no application code yet.
- **Supabase:** the existing project **"Kosis Project"** (eu-west-1, Postgres 17) is treated as **production**. As of 2026-11-11 it has no tables and no migrations. Agents must not run write SQL or apply migrations against it (§9).

## 2. Stack (v0.2: owner-approved in principle, details pending ADR-0001)

| Concern | Choice | Why |
|---|---|---|
| App type | **Mobile-first PWA**, installable, read-only offline | Owner decision. One codebase. Native apps can come later. |
| Framework | **Next.js (App Router) + React + TypeScript strict** | Server components and server actions, plus cookie sessions via `@supabase/ssr`. |
| Styling | **Tailwind CSS** + CSS custom-property tokens (`src/styles/tokens.css`) | Tokens map 1:1 to the design system. |
| Auth | **Supabase Auth, email OTP (6-digit code)** | Owner decision: accounts at launch. An OTP code works inside an installed iOS PWA, where magic links open Safari instead. |
| Database | **Supabase Postgres + RLS + SECURITY DEFINER RPCs** | The database enforces every invariant (§4.3). |
| DB access | **`supabase-js` with generated types**, called with the user's JWT. **No Drizzle.** | Every query runs as `authenticated`, so RLS always applies (review finding 2). |
| Migrations | **Plain SQL via the Supabase CLI** (`supabase/migrations/`) | Forward-only and reviewable. Applied to production only through CI. |
| Validation | **zod** in server actions (UX-level), with the **database as the authority** | Duplicate checks in the app only give friendlier errors. |
| Client data | **RSC + server actions + `useOptimistic`**. **No TanStack Query.** | One data approach, and a smaller bundle (finding 9). |
| Dates | **No date library.** Local dates are epoch-day integers. "Now → local date" uses `Intl.DateTimeFormat` with the profile timezone. | The domain only needs date-only arithmetic, so the Temporal polyfill's bundle cost isn't worth it. |
| Charts | **Hand-rolled SVG** | Two simple charts, with full control over honest rendering. |
| PWA | Web app manifest + service worker (**Serwist**, pending approval) | Caches the app shell and the last data. No offline writes in MVP. |
| Tests | Vitest, Testing Library, fast-check, Playwright, axe-core, pgTAP or SQL tests against a local Supabase | See testing-strategy.md. |
| Hosting | **Vercel, region `dub1`** (Dublin), co-located with Supabase eu-west-1 | Low latency and EU residency. |

**Native later:** `src/domain` stays framework-free TypeScript with no DOM, Next, or Supabase imports. All rules live in the DB RPCs. A future Expo app reuses both.

## 3. Module layout & ownership
```
src/
  domain/              # pure TS: time, goals, stats, action, recovery          (backend-engineer)
    types.ts           # shared contract                                          (backend-engineer)
  server/              # server actions, supabase clients, zod schemas            (backend-engineer)
  app/                 # routes, layouts, manifest.ts                             (frontend-engineer)
  components/          # shared UI primitives                                     (frontend-engineer)
  features/<name>/ui/  # feature UI only; features/* contains nothing but ui/     (frontend-engineer)
  sw.ts                # service worker                                           (frontend-engineer)
  styles/tokens.css    # design tokens: SOLE writer                               (ui-ux-designer)
  styles/*.css         # other styles                                             (frontend-engineer)
middleware.ts          # Supabase session refresh, auth redirects                 (backend-engineer)
supabase/              # config.toml, migrations/, seed.sql (local only)          (backend-engineer)
content/               # quotes + SOURCES.md, copy                                (behavioral-product-specialist)
tests/, e2e/           # + vitest/playwright configs                              (qa-testing-engineer)
package.json, tsconfig*, next.config.*, eslint/prettier, .github/workflows/**, .env.example
                       #                                                          (lead-architect)
```
Dependency direction: `app → features → components`. Everything may import `domain`, and `domain` imports nothing outside itself. Only `src/server` imports the Supabase client. Migrations and RPCs require **lead-architect sign-off and a security-performance-reviewer PASS** before merge.

## 4. Data model (Postgres, schema `public`)

### 4.1 Tables
```sql
create table profiles (                       -- 1:1 with auth.users
  user_id        uuid primary key references auth.users(id) on delete cascade,
  timezone       text not null,                -- IANA; validated in RPC against pg_timezone_names
  week_start     smallint not null check (week_start between 1 and 7),  -- ISO: 1=Mon..7=Sun; fixed in MVP
  quotes_enabled   boolean not null default false,
  recovery_enabled boolean not null default true,
  onboarded_at   timestamptz,
  created_at     timestamptz not null default now());

create table habits (                          -- cosmetic fields only
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(user_id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  minimum_version text check (char_length(minimum_version) <= 120),
  note           text check (char_length(note) <= 500),
  color          text not null default 'accent',
  sort_order     int  not null,
  implementation_intention text check (char_length(implementation_intention) <= 200),
  created_on     date not null,                -- local date; set by create_habit, never updatable
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, user_id));

create table habit_goal_versions (             -- insert-only
  id             uuid primary key default gen_random_uuid(),
  seq            bigint generated always as identity,
  habit_id       uuid not null, user_id uuid not null,
  goal_type      text not null check (goal_type in ('daily','weekly_count')),
  target_per_week smallint check (target_per_week between 1 and 7),
  effective_from date not null,
  created_at     timestamptz not null default now(),
  check ((goal_type = 'weekly_count') = (target_per_week is not null)),
  foreign key (habit_id, user_id) references habits(id, user_id) on delete cascade);

create table habit_status_events (             -- insert-only; status is derived, never stored on habits
  id             uuid primary key default gen_random_uuid(),
  seq            bigint generated always as identity,
  habit_id       uuid not null, user_id uuid not null,
  status         text not null check (status in ('active','paused','archived')),
  effective_on   date not null,                -- inclusive; always = local today at insert
  created_at     timestamptz not null default now(),
  foreign key (habit_id, user_id) references habits(id, user_id) on delete cascade);

create table completion_entries (              -- insert-only; NO update path exists
  id             uuid primary key default gen_random_uuid(),
  habit_id       uuid not null, user_id uuid not null,
  occurred_on    date not null,
  logged_at      timestamptz not null default now(),
  source         text not null check (source in ('on_time','late')),
  variant        text not null default 'full' check (variant in ('full','minimum')),
  note           text check (char_length(note) <= 500),
  foreign key (habit_id, user_id) references habits(id, user_id) on delete cascade);

create table completion_voids (                -- insert-only; PK makes "void once" structural
  entry_id       uuid primary key references completion_entries(id) on delete cascade,
  user_id        uuid not null references profiles(user_id) on delete cascade,
  voided_at      timestamptz not null default now(),
  reason         text not null check (reason in ('undo','correction','replaced')));

create table dismissals (                      -- recovery cards, reflection prompts, daily quote
  user_id        uuid not null references profiles(user_id) on delete cascade,
  kind           text not null check (kind in ('recovery','reflection','quote')),
  key            text not null,                -- e.g. '<habit_id>:<first_missed_date>' or '<week_start>'
  dismissed_at   timestamptz not null default now(),
  primary key (user_id, kind, key));

create table weekly_reflections (              -- user-authored content, editable for 7 days
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(user_id) on delete cascade,
  week_start     date not null,
  went_well text, got_in_way text, adjustment text,   -- each ≤ 1000 chars (check)
  feeling        smallint check (feeling between 1 and 5),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, week_start));
```
**Indexes:**
- `completion_entries (user_id, occurred_on)`
- `completion_entries (habit_id, occurred_on)`
- `habit_goal_versions (habit_id, effective_from, seq desc)`
- `habit_status_events (habit_id, effective_on, seq desc)`

### 4.2 Resolution rules
- **Goal on date d:** the row with `effective_from ≤ d`, ordered by `seq desc`, limit 1. The newest edit wins, so it also supersedes a pending version.
- **Status on date d:** the same rule over `habit_status_events` (`effective_on ≤ d`). With no event, the status is `active` from `created_on`.
- **One entry per habit per day:** `log_completion` takes `pg_advisory_xact_lock(hashtextextended(habit_id::text || occurred_on::text, 0))`. It then rejects the insert if a non-voided entry already exists. A partial unique index can't see the voids table.

### 4.3 Write path: the database is the only enforcement point (ADR-0006)
- `revoke insert, update, delete on all tables in schema public from anon, authenticated;`
- `grant select` to `authenticated`, with RLS enabled on **every** table and the policy `using (user_id = auth.uid())`. The `anon` role has no access.
- All writes go through `SECURITY DEFINER` functions with `set search_path = ''`, fully-qualified names, and `auth.uid()` checks. `EXECUTE` is granted to `authenticated` only and revoked from `public`/`anon`:

| RPC | Rules enforced |
|---|---|
| `complete_onboarding(timezone, week_start)` | Valid tz (`pg_timezone_names`). Runs once. `week_start` is immutable afterwards (MVP). |
| `set_timezone(timezone)` | Valid tz. Applies from now. Entries keep their dates. |
| `set_preferences(quotes_enabled, recovery_enabled)` | Owner only. |
| `create_habit(name, goal_type, target, minimum_version, note, color)` | `created_on` = local today, `sort_order` = max + 1. Inserts the first goal version (`effective_from = created_on`) and an `active` status event. |
| `update_habit_details(id, name, minimum_version, note, color, implementation_intention)` | Column whitelist only. `created_on` can never change. |
| `reorder_habits(ids uuid[])` | Every id must be owned by the caller. |
| `change_goal(habit_id, goal_type, target)` | `effective_from` = next week start, **or** `created_on` if local today falls in the habit's creation week. |
| `set_habit_status(habit_id, status)` | `effective_on` = local today. No other date is accepted. |
| `log_completion(habit_id, occurred_on date default null, variant, note)` | See below. |
| `void_completion(entry_id, reason)` | Owner only. Inserts into `completion_voids`. A PK conflict means the entry is already voided. |
| `replace_with_full(entry_id)` | Voids (`replaced`) and inserts a `full` entry with the same `occurred_on`. `source` is recomputed against now. |
| `dismiss(kind, key)` | Upsert, idempotent. |
| `upsert_reflection(week_start, ...)` | `week_start` must be a valid user week start ≤ local today. Allowed until `week_start + 13` days. |
| `delete_habit(habit_id)` | The only DELETE path. Owner only. Children cascade via FKs. |

`log_completion` pseudo-code:
```sql
tz    := (select timezone from public.profiles where user_id = auth.uid());
today := (now() at time zone tz)::date;
d     := coalesce(p_occurred_on, today);        -- on-time path sends no date
assert habit owned by auth.uid();
assert d between greatest(h.created_on, today - 7) and today;
assert status_on(habit, d) = 'active';
lock; assert no non-voided entry for (habit, d);
insert ... source := case when d < today then 'late' else 'on_time' end, logged_at := now();
```
- **Account deletion:** a server action re-verifies the user with a fresh OTP. It then calls the Supabase Admin API (service-role key, **server-only**) to delete the `auth.users` row, and everything cascades.
- **Export:** a server action selects all of the user's rows under RLS and streams JSON/CSV.

### 4.4 Reads
- **Today:** one RPC, `get_today()`, returns habits, the goal and status in effect, this week's non-voided entries, `last_completed_on` per habit, and today's dismissals.
- **Progress:** 13 weeks of entries, voids, versions, and events in one bounded, indexed query.
- **Stats** are computed in `src/domain` on the server (RSC). The UI never computes stats.

## 5. Time model (ADR-0003)
- A local date is `YYYY-MM-DD`, held in the domain as an **epoch-day integer**. "Today" = `Intl.DateTimeFormat(…, { timeZone: profile.timezone })` on the server. In SQL it's `(now() at time zone tz)::date`.
- **Week of d:** `start = d − ((isoDow(d) − week_start + 7) mod 7)`.
- **week_start** is chosen at onboarding and immutable in MVP. A post-MVP change will be versioned with a pro-rated "bridge" week, so it never re-buckets history silently.
- **Timezone change:** forward-only. Entries keep `occurred_on`. Travelling east can skip a local date. That day stays a planned day and can be late-logged.
- **Signup:** the timezone comes from the device (`Intl`) and is confirmed in onboarding. A later mismatch prompts the user and never switches silently.
- **Server time is the authority.** The client clock is never trusted for `occurred_on` or `logged_at`.

## 6. Domain API (contract sketch, `src/domain`)
```ts
type Day = number; // epoch day
weekStartOf(d: Day, weekStart: 1|2|3|4|5|6|7): Day
goalOn(versions, d): Goal | null           // effective_from ≤ d, max seq
statusOn(events, createdOn, d): Status
activeDays(habit, week): Day[]
plannedForWeek(habit, week): number        // spec §7.1 (ceil pro-rating)
completedForWeek(habit, entries, week): number            // spec §7.2
weeklyConsistency(habits, week): { pct: number | null; completed; planned; late; minimum }
currentWeekProgress(habit, today): { done; soFar }        // spec §7.4
trend(weeks): { a: number; b: number; kind: 'up'|'down'|'same' } | null  // spec §7.6
actionCandidates(habits, today, skippedToday): { primary; dueToday; optionalToday }
detectLapse(habit, today): { lapseKey; kind } | null      // spec AC-R1
```
All functions are pure and deterministic. `today` and `weekStart` are always passed in.

## 7. Security & privacy
- **Auth:** Supabase email OTP. Built-in rate limits are tightened in `supabase/config.toml`. The site URL and redirect URLs are restricted to the production domain and preview domains. Sessions use httpOnly cookies via `@supabase/ssr`.
- **Authorization:** RLS select-only for owners. All writes go through RPCs (§4.3). `anon` has no grants.
- **Secrets:**
  - Client: `NEXT_PUBLIC_SUPABASE_URL` and the publishable (anon) key only.
  - Server-only: the service-role key, used only for account deletion.
  - `.env*` files are git-ignored. `.env.example` holds names only, no values.
- **Web:** CSP. No `dangerouslySetInnerHTML` on user content. Server actions use Next's built-in origin checks. No PII in logs.
- **Privacy:**
  - EU data residency (eu-west-1, Vercel `dub1`).
  - No third-party trackers.
  - Analytics are opt-in and first-party, if any.
  - Export and account deletion are in MVP.
  - A privacy policy exists before launch.

## 8. Performance budgets
- Dashboard initial JS ≤ **150 KB gzip**. This is a **Phase 0 exit gate**, measured on the empty scaffold.
- LCP ≤ 2.0 s and INP ≤ 200 ms on a Moto G-class device over 4G.
- `supabase-js` and zod stay out of the client bundle. The client only calls server actions.
- Today needs one RPC round trip. Progress needs one bounded query, and its route is code-split.
- Optimistic completion feedback in < 100 ms.

## 9. Environments & Supabase safety
| Env | Database | Purpose |
|---|---|---|
| Local | Supabase CLI (Docker) | Development, unit, integration, and E2E tests. Seeds are local only. |
| Preview/staging | A Supabase branch or a separate staging project *(owner to choose)* | PR previews and migration rehearsal. |
| Production | **"Kosis Project"** (eu-west-1) | Real users only. Migrations are applied **only via CI** after review. |

Agents never run write SQL, apply migrations, or create or delete branches on production through the Supabase MCP without explicit owner approval in the conversation. Read-only inspection (list tables, advisors, logs) is allowed.

## 10. ADRs to write in Phase 0
| ADR | Topic |
|---|---|
| 0001 | Stack (this §2) |
| 0002 | Append-only log, voids, cosmetic vs historical fields |
| 0003 | Time model, timezone, week start |
| 0004 | Planned-day pro-rating (ceil) and goal-change timing |
| 0005 | Offline (read-only MVP; a future queue stores a client `recorded_at` and replays honestly as late) |
| 0006 | DB-only write path (RPCs, grants, RLS) |
| 0007 | Environments and migration deployment |
